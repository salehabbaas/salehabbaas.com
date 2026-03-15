import { NextResponse } from "next/server";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { startGoalDay } from "@/lib/goals/server";
import { dayPlanStartSchema } from "@/lib/goals/schemas";

export async function POST(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestContext = getAdminRequestContext(request);

  try {
    const body = dayPlanStartSchema.parse(await request.json());
    const dayPlan = await startGoalDay({
      uid: user.uid,
      dateId: body.dateId,
    });

    await writeAdminAuditLog(
      {
        module: "project-management",
        action: "goals_start_day",
        targetType: "goalsDayPlan",
        targetId: body.dateId,
        summary: `Started goals day ${body.dateId}`,
        metadata: {
          dateId: body.dateId,
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
    const message = error instanceof Error ? error.message : "Unable to start day";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
