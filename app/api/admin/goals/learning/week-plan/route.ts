import { NextResponse } from "next/server";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { currentWeekId } from "@/lib/goals/date";
import {
  getGoalLearningPlan,
  getGoalReminderRules,
  getLearningCandidateStickers,
  upsertGoalLearningPlan,
} from "@/lib/goals/server";
import { learningPlanUpsertSchema } from "@/lib/goals/schemas";

export async function GET(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const settings = await getGoalReminderRules(user.uid);
    const weekId =
      url.searchParams.get("weekId")?.trim() || currentWeekId(settings.timezone);

    const [plan, availableStickers] = await Promise.all([
      getGoalLearningPlan(user.uid, weekId),
      getLearningCandidateStickers({
        uid: user.uid,
        includeDone: false,
        limit: 320,
      }),
    ]);

    return NextResponse.json({
      weekId,
      plan,
      availableStickers,
      settings,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load learning week plan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestContext = getAdminRequestContext(request);

  try {
    const body = learningPlanUpsertSchema.parse(await request.json());
    const plan = await upsertGoalLearningPlan({
      uid: user.uid,
      weekId: body.weekId,
      stickerIds: body.stickerIds,
      focusAreas: body.focusAreas,
      targetMinutes: body.targetMinutes,
      notes: body.notes,
    });

    await writeAdminAuditLog(
      {
        module: "project-management",
        action: "goals_learning_update_week_plan",
        targetType: "goalsLearningPlan",
        targetId: body.weekId,
        summary: `Updated goals learning plan ${body.weekId}`,
        metadata: {
          stickerCount: body.stickerIds.length,
          targetMinutes: body.targetMinutes ?? 300,
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
    const message =
      error instanceof Error ? error.message : "Unable to save learning week plan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

