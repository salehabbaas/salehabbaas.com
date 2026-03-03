import { NextResponse } from "next/server";
import { z } from "zod";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { adminDb } from "@/lib/firebase/admin";
import {
  mergeReminderSettings,
  mergeUserNotificationPreferences,
  normalizeReminderSettings,
  normalizeUserNotificationPreferences
} from "@/lib/notifications/settings";
import type { ReminderSettings, UserNotificationPreferences } from "@/types/notifications";

const minuteWindowsSchema = z.array(z.number().int().min(1).max(14 * 24 * 60)).max(12);
const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const reminderWindowSchema = z
  .object({
    enabled: z.boolean().optional(),
    windowsMinutes: minuteWindowsSchema.optional()
  })
  .partial();

const overdueSchema = z
  .object({
    enabled: z.boolean().optional(),
    cadenceHours: z.number().int().min(1).max(168).optional(),
    lookbackDays: z.number().int().min(1).max(365).optional()
  })
  .partial();

const bodySchema = z
  .object({
    tasks: z
      .object({
        enabled: z.boolean().optional(),
        default24h: z.boolean().optional(),
        default1h: z.boolean().optional(),
        defaultDailyOverdue: z.boolean().optional()
      })
      .partial()
      .optional(),
    bookings: reminderWindowSchema.optional(),
    linkedin: reminderWindowSchema.optional(),
    jobs: reminderWindowSchema.extend({ overdue: overdueSchema.optional() }).optional(),
    goals: reminderWindowSchema.extend({ overdue: overdueSchema.optional() }).optional(),
    audit: z
      .object({
        enabled: z.boolean().optional(),
        highRiskOnly: z.boolean().optional()
      })
      .partial()
      .optional(),
    channels: z
      .object({
        inAppEnabled: z.boolean().optional(),
        bannerEnabled: z.boolean().optional(),
        pushEnabled: z.boolean().optional(),
        emailEnabled: z.boolean().optional(),
        quietHoursStart: z.string().regex(hhmmRegex).optional(),
        quietHoursEnd: z.string().regex(hhmmRegex).optional(),
        timezone: z.string().trim().min(1).max(120).optional(),
        primaryAdminUid: z.string().trim().max(160).optional()
      })
      .partial()
      .optional(),
    userPreferences: z
      .object({
        timezone: z.string().trim().min(1).max(120).optional(),
        inAppEnabled: z.boolean().optional(),
        bannerEnabled: z.boolean().optional(),
        pushEnabled: z.boolean().optional()
      })
      .partial()
      .optional()
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), "No updates provided");

function buildPayload(input: {
  settingsRaw: unknown;
  userSettingsRaw: Record<string, unknown>;
  primaryFallback: string;
}) {
  const settings = normalizeReminderSettings(input.settingsRaw, input.primaryFallback);
  const timezone = typeof input.userSettingsRaw.timezone === "string" ? input.userSettingsRaw.timezone : settings.channels.timezone;
  const userPreferences = normalizeUserNotificationPreferences(input.userSettingsRaw.notificationPreferences, timezone);

  return {
    settings,
    userPreferences
  } satisfies {
    settings: ReminderSettings;
    userPreferences: UserNotificationPreferences;
  };
}

export async function GET() {
  const user = await verifyAdminRequest({ requiredModule: "settings" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [settingsSnap, userSettingsSnap] = await Promise.all([
    adminDb.collection("adminSettings").doc("reminders").get(),
    adminDb.collection("users").doc(user.uid).collection("settings").doc("projectManagement").get()
  ]);

  const payload = buildPayload({
    settingsRaw: settingsSnap.data() ?? {},
    userSettingsRaw: (userSettingsSnap.data() ?? {}) as Record<string, unknown>,
    primaryFallback: process.env.NOTIFICATION_PRIMARY_ADMIN_UID || user.uid
  });

  return NextResponse.json(payload);
}

export async function PUT(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "settings" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestContext = getAdminRequestContext(request);

  try {
    const body = bodySchema.parse(await request.json());

    const [settingsSnap, userSettingsSnap] = await Promise.all([
      adminDb.collection("adminSettings").doc("reminders").get(),
      adminDb.collection("users").doc(user.uid).collection("settings").doc("projectManagement").get()
    ]);

    const current = buildPayload({
      settingsRaw: settingsSnap.data() ?? {},
      userSettingsRaw: (userSettingsSnap.data() ?? {}) as Record<string, unknown>,
      primaryFallback: process.env.NOTIFICATION_PRIMARY_ADMIN_UID || user.uid
    });

    const settingsPatch: Partial<ReminderSettings> = {};
    if (body.tasks) settingsPatch.tasks = { ...current.settings.tasks, ...body.tasks };
    if (body.bookings) settingsPatch.bookings = { ...current.settings.bookings, ...body.bookings };
    if (body.linkedin) settingsPatch.linkedin = { ...current.settings.linkedin, ...body.linkedin };
    if (body.jobs) {
      settingsPatch.jobs = {
        ...current.settings.jobs,
        ...body.jobs,
        overdue: {
          ...current.settings.jobs.overdue,
          ...(body.jobs.overdue ?? {})
        }
      };
    }
    if (body.goals) {
      settingsPatch.goals = {
        ...current.settings.goals,
        ...body.goals,
        overdue: {
          ...current.settings.goals.overdue,
          ...(body.goals.overdue ?? {})
        }
      };
    }
    if (body.audit) settingsPatch.audit = { ...current.settings.audit, ...body.audit };
    if (body.channels) settingsPatch.channels = { ...current.settings.channels, ...body.channels };

    const nextSettings = mergeReminderSettings(current.settings, settingsPatch);

    const nextUserPreferences = body.userPreferences
      ? mergeUserNotificationPreferences(current.userPreferences, body.userPreferences)
      : current.userPreferences;

    const now = new Date();

    const writes: Promise<unknown>[] = [
      adminDb
        .collection("adminSettings")
        .doc("reminders")
        .set(
          {
            ...nextSettings,
            updatedAt: now
          },
          { merge: true }
        )
    ];

    if (body.userPreferences) {
      writes.push(
        adminDb
          .collection("users")
          .doc(user.uid)
          .collection("settings")
          .doc("projectManagement")
          .set(
            {
              timezone: nextUserPreferences.timezone,
              notificationPreferences: nextUserPreferences,
              module: "project-management",
              updatedAt: now
            },
            { merge: true }
          )
      );
    }

    await Promise.all(writes);

    await writeAdminAuditLog(
      {
        module: "settings",
        action: "update_reminder_settings",
        targetType: "adminSettings",
        targetId: "reminders",
        summary: "Updated reminders settings",
        metadata: {
          changedSections: Object.keys(body)
        }
      },
      user,
      requestContext
    );

    return NextResponse.json({
      success: true,
      settings: nextSettings,
      userPreferences: nextUserPreferences
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save reminders settings";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
