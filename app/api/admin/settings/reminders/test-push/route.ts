import { NextResponse } from "next/server";

import { toIso, writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { adminDb } from "@/lib/firebase/admin";
import { normalizeReminderSettings, normalizeUserNotificationPreferences } from "@/lib/notifications/settings";
import { countDeliverableDevices, loadEnabledPushDevices, sendBrowserPushToUser } from "@/lib/notifications/server-push";

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "object" && value && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    const parsed = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function datePartsInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit"
  }).formatToParts(date);

  const map = new Map<string, string>();
  for (const part of parts) {
    if (part.type !== "literal") map.set(part.type, part.value);
  }

  return {
    hour: Number(map.get("hour") ?? 0),
    minute: Number(map.get("minute") ?? 0)
  };
}

function parseHm(value: string) {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function isQuietHoursNow(input: { timezone: string; startHm: string; endHm: string; now: Date }) {
  const start = parseHm(input.startHm);
  const end = parseHm(input.endHm);
  if (start === null || end === null) return false;

  const local = datePartsInTimezone(input.now, input.timezone || "UTC");
  const current = local.hour * 60 + local.minute;

  if (start === end) return false;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

type GoalInput = {
  id: string;
  title: string;
  deadline: Date | null;
  completed: boolean;
};

async function loadReminderContext(uid: string) {
  const [settingsSnap, userSettingsSnap, enabledDevices] = await Promise.all([
    adminDb.collection("adminSettings").doc("reminders").get(),
    adminDb.collection("users").doc(uid).collection("settings").doc("projectManagement").get(),
    loadEnabledPushDevices(uid)
  ]);

  const settingsRaw = settingsSnap.data() ?? {};
  const userSettingsRaw = (userSettingsSnap.data() ?? {}) as Record<string, unknown>;
  const settings = normalizeReminderSettings(settingsRaw, process.env.NOTIFICATION_PRIMARY_ADMIN_UID || uid);
  const timezone = typeof userSettingsRaw.timezone === "string" ? userSettingsRaw.timezone : settings.channels.timezone;
  const userPreferences = normalizeUserNotificationPreferences(userSettingsRaw.notificationPreferences, timezone);
  const now = new Date();
  const goalsRaw = Array.isArray(userSettingsRaw.topGoals) ? userSettingsRaw.topGoals : [];

  const goals = goalsRaw.map((entry, index) => {
    const goal = (entry ?? {}) as Record<string, unknown>;
    return {
      id: typeof goal.id === "string" && goal.id.trim() ? goal.id.trim() : `goal-${index + 1}`,
      title: typeof goal.title === "string" && goal.title.trim() ? goal.title.trim() : `Goal ${index + 1}`,
      deadline: asDate(goal.deadline),
      completed: goal.completed === true
    } satisfies GoalInput;
  });

  return {
    now,
    settings,
    userPreferences,
    timezone: userPreferences.timezone,
    goals,
    enabledDevices
  };
}

function buildDiagnostics(context: Awaited<ReturnType<typeof loadReminderContext>>) {
  const lookbackDays = context.settings.goals.overdue.lookbackDays;
  const lookbackDate = new Date(context.now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
  const activeGoals = context.goals.filter((goal) => !goal.completed);
  const overdueGoals = activeGoals.filter((goal) => Boolean(goal.deadline && goal.deadline < context.now && goal.deadline >= lookbackDate));
  const deadlinesMissingCount = activeGoals.filter((goal) => !goal.deadline).length;
  const quietHoursActive = isQuietHoursNow({
    timezone: context.timezone,
    startHm: context.settings.channels.quietHoursStart,
    endHm: context.settings.channels.quietHoursEnd,
    now: context.now
  });

  const validDeviceCount = countDeliverableDevices(context.enabledDevices);
  const blockers: string[] = [];
  if (!context.settings.goals.enabled) blockers.push("Goals reminder pipeline is disabled.");
  if (!context.settings.goals.overdue.enabled) blockers.push("Goals overdue reminders are disabled.");
  if (!overdueGoals.length) blockers.push(`No overdue goals found in lookback (${lookbackDays} day${lookbackDays === 1 ? "" : "s"}).`);
  if (!context.settings.channels.inAppEnabled) blockers.push("Global in-app channel is disabled.");
  if (!context.userPreferences.inAppEnabled) blockers.push("Your personal in-app preference is disabled.");
  if (!context.settings.channels.pushEnabled) blockers.push("Global push channel is disabled.");
  if (!context.userPreferences.pushEnabled) blockers.push("Your personal push preference is disabled.");
  if (!validDeviceCount) blockers.push("No enabled push device is registered for this account.");
  if (quietHoursActive) blockers.push("Current time is within quiet hours; push is suppressed.");

  return {
    nowIso: context.now.toISOString(),
    timezone: context.timezone,
    sweepCadence: "Cloud Function `unifiedReminderSweep` runs every 15 minutes.",
    quietHours: {
      start: context.settings.channels.quietHoursStart,
      end: context.settings.channels.quietHoursEnd,
      activeNow: quietHoursActive
    },
    goals: {
      enabled: context.settings.goals.enabled,
      overdueEnabled: context.settings.goals.overdue.enabled,
      overdueLookbackDays: lookbackDays,
      totalCount: context.goals.length,
      activeCount: activeGoals.length,
      overdueCount: overdueGoals.length,
      missingDeadlineCount: deadlinesMissingCount
    },
    channels: {
      globalInAppEnabled: context.settings.channels.inAppEnabled,
      globalPushEnabled: context.settings.channels.pushEnabled,
      userInAppEnabled: context.userPreferences.inAppEnabled,
      userPushEnabled: context.userPreferences.pushEnabled,
      enabledDeviceCount: validDeviceCount
    },
    blockers
  };
}

export async function GET() {
  const user = await verifyAdminRequest({ requiredModule: "settings" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const context = await loadReminderContext(user.uid);
  const diagnostics = buildDiagnostics(context);
  return NextResponse.json({ diagnostics });
}

export async function POST(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "settings" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reqContext = getAdminRequestContext(request);
  const context = await loadReminderContext(user.uid);
  const diagnostics = buildDiagnostics(context);

  const now = new Date();
  const canAttemptPush =
    diagnostics.channels.globalPushEnabled &&
    diagnostics.channels.userPushEnabled &&
    diagnostics.channels.enabledDeviceCount > 0 &&
    !diagnostics.quietHours.activeNow;

  const notificationRef = adminDb.collection("users").doc(user.uid).collection("notifications").doc();
  await notificationRef.set({
    module: "system",
    sourceType: "reminder_test_push",
    sourceId: notificationRef.id,
    title: "Reminder test notification",
    body: canAttemptPush
      ? "Push was attempted using your current reminder configuration."
      : "Push was not attempted because one or more reminder requirements are blocked.",
    priority: "medium",
    state: "unread",
    channels: {
      inApp: true,
      banner: diagnostics.channels.globalInAppEnabled && diagnostics.channels.userInAppEnabled,
      push: canAttemptPush
    },
    ctaUrl: "/admin/settings/reminders",
    metadata: {
      generatedBy: "settings-reminders-test-push",
      diagnostics
    },
    createdAt: now,
    updatedAt: now,
    readAt: null,
    dismissedAt: null
  });

  let pushSent = 0;
  let pushFailed = 0;

  if (canAttemptPush) {
    const response = await sendBrowserPushToUser({
      uid: user.uid,
      title: "Reminder test",
      body: "This is a test push from Reminder Settings.",
      link: "/admin/settings/reminders",
      data: {
        notificationId: notificationRef.id,
        ctaUrl: "/admin/settings/reminders",
        module: "system",
        sourceType: "reminder_test_push",
        sourceId: notificationRef.id
      }
    });

    pushSent = response.sent;
    pushFailed = response.failed;
  }

  await writeAdminAuditLog(
    {
      module: "settings",
      action: "test_reminder_push",
      targetType: "notification",
      targetId: notificationRef.id,
      summary: "Sent reminder test notification",
      metadata: {
        pushAttempted: canAttemptPush,
        pushSent,
        pushFailed
      }
    },
    user,
    reqContext
  );

  return NextResponse.json({
    success: true,
    testResult: {
      notificationId: notificationRef.id,
      inAppCreated: true,
      pushAttempted: canAttemptPush,
      pushSent,
      pushFailed,
      createdAt: toIso(now)
    },
    diagnostics
  });
}
