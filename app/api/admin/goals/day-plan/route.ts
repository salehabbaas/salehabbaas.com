import { NextResponse } from "next/server";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import {
  getGoalReminderRules,
  getTodayGoalsPayload,
  parseDateIdOrToday,
  upsertGoalDayPlan,
} from "@/lib/goals/server";
import { dayPlanUpdateSchema } from "@/lib/goals/schemas";

export async function GET(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const settings = await getGoalReminderRules(user.uid);
    const url = new URL(request.url);
    const dateId = parseDateIdOrToday(url.searchParams.get("dateId"), settings.timezone);

    const payload = await getTodayGoalsPayload(user.uid, dateId);

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load day plan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestContext = getAdminRequestContext(request);

  try {
    const body = dayPlanUpdateSchema.parse(await request.json());
    const plan = await upsertGoalDayPlan({
      uid: user.uid,
      dateId: body.dateId,
      stickerIds: body.stickerIds,
      forceRulesSnapshot: body.forceRulesSnapshot,
    });

    await writeAdminAuditLog(
      {
        module: "project-management",
        action: "goals_update_day_plan",
        targetType: "goalsDayPlan",
        targetId: body.dateId,
        summary: `Updated goals day plan ${body.dateId}`,
        metadata: {
          stickerCount: body.stickerIds.length,
        },
      },
      user,
      requestContext,
    );

    return NextResponse.json({
      success: true,
      plan,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save day plan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
