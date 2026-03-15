import { NextResponse } from "next/server";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { reviewGoalDay } from "@/lib/goals/server";
import { dayPlanReviewSchema } from "@/lib/goals/schemas";

export async function POST(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestContext = getAdminRequestContext(request);

  try {
    const body = dayPlanReviewSchema.parse(await request.json());

    const dayPlan = await reviewGoalDay({
      uid: user.uid,
      dateId: body.dateId,
      whatWentWell: body.whatWentWell,
      whatToImprove: body.whatToImprove,
      autoReschedule: body.autoReschedule,
    });

    await writeAdminAuditLog(
      {
        module: "project-management",
        action: "goals_review_day",
        targetType: "goalsDayPlan",
        targetId: body.dateId,
        summary: `Reviewed goals day ${body.dateId}`,
        metadata: {
          autoReschedule: body.autoReschedule,
        },
      },
      user,
      requestContext,
    );

    return NextResponse.json({
      success: true,
      dayPlan,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to review day";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
