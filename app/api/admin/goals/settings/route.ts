import { NextResponse } from "next/server";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { getGoalReminderRules, updateGoalReminderRules } from "@/lib/goals/server";
import { goalSettingsSchema } from "@/lib/goals/schemas";

export async function GET() {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const settings = await getGoalReminderRules(user.uid);
    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load goals settings";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestContext = getAdminRequestContext(request);

  try {
    const body = goalSettingsSchema.parse(await request.json());
    const settings = await updateGoalReminderRules(user.uid, body);

    await writeAdminAuditLog(
      {
        module: "project-management",
        action: "goals_update_settings",
        targetType: "goalsSettings",
        targetId: "settings",
        summary: "Updated goals settings",
        metadata: {
          changedKeys: Object.keys(body),
        },
      },
      user,
      requestContext,
    );

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save goals settings";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
