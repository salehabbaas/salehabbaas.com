import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { getUserProjectSettings } from "@/lib/firestore/project-management";
import { adminDb } from "@/lib/firebase/admin";
import { resolveAbsoluteUrl } from "@/lib/utils";

const topGoalSchema = z.object({
  id: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(2000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  projectId: z.string().trim().min(1).max(160).optional(),
  deadline: z.string().trim().datetime().optional(),
  completed: z.boolean().optional(),
  completedAt: z.string().trim().datetime().optional(),
  createdAt: z.string().trim().datetime().optional()
});

const updateSchema = z
  .object({
    emailRemindersEnabled: z.boolean().optional(),
    timezone: z.string().trim().min(1).max(120).optional(),
    regenerateCalendarToken: z.boolean().optional(),
    topGoals: z.array(topGoalSchema).max(40).optional()
  })
  .refine((value) => Object.keys(value).length > 0, "No updates provided");

function generateCalendarToken() {
  return randomUUID().replace(/-/g, "");
}

function toResponse(settings: {
  emailRemindersEnabled: boolean;
  calendarIcsToken: string;
  timezone: string;
  topGoals: Array<{
    id: string;
    title: string;
    description?: string;
    tags: string[];
    projectId?: string;
    deadline?: string;
    completed?: boolean;
    completedAt?: string;
    createdAt: string;
  }>;
}) {
  const subscriptionUrl = settings.calendarIcsToken
    ? resolveAbsoluteUrl(`/api/calendar/${settings.calendarIcsToken}`)
    : "";

  return {
    ...settings,
    subscriptionUrl
  };
}

export async function GET() {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getUserProjectSettings(user.uid);
  return NextResponse.json(toResponse(settings));
}

export async function PUT(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reqContext = getAdminRequestContext(request);

  try {
    const body = updateSchema.parse(await request.json());
    const settingsRef = adminDb.collection("users").doc(user.uid).collection("settings").doc("projectManagement");

    const current = await getUserProjectSettings(user.uid);
    const token = body.regenerateCalendarToken ? generateCalendarToken() : current.calendarIcsToken || generateCalendarToken();
    const topGoals = (body.topGoals ?? current.topGoals).map((goal) => ({
      id: goal.id,
      title: goal.title,
      description: goal.description?.trim() || "",
      tags: [...new Set((goal.tags ?? []).map((tag) => tag.trim()).filter(Boolean))],
      projectId: goal.projectId?.trim() || null,
      deadline: goal.deadline ? new Date(goal.deadline) : null,
      completed: goal.completed === true,
      completedAt: goal.completedAt ? new Date(goal.completedAt) : null,
      createdAt: goal.createdAt ? new Date(goal.createdAt) : new Date()
    }));

    await settingsRef.set(
      {
        emailRemindersEnabled: body.emailRemindersEnabled ?? current.emailRemindersEnabled,
        timezone: body.timezone ?? current.timezone,
        calendarIcsToken: token,
        topGoals,
        module: "project-management",
        updatedAt: new Date()
      },
      { merge: true }
    );

    await writeAdminAuditLog(
      {
        module: "project-management",
        action: "update_user_settings",
        targetType: "user_settings",
        targetId: user.uid,
        summary: "Updated project management user settings",
        metadata: {
          regenerateCalendarToken: Boolean(body.regenerateCalendarToken),
          changedFields: Object.keys(body)
        }
      },
      user,
      reqContext
    );

    const next = await getUserProjectSettings(user.uid);
    return NextResponse.json({ success: true, ...toResponse(next) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save settings";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
