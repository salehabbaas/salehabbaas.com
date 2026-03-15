import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { currentWeekId } from "@/lib/goals/date";
import { getGoalLearningDashboard, getGoalReminderRules } from "@/lib/goals/server";

export async function GET(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const settings = await getGoalReminderRules(user.uid);
    const weekId =
      url.searchParams.get("weekId")?.trim() || currentWeekId(settings.timezone);

    const payload = await getGoalLearningDashboard({
      uid: user.uid,
      weekId,
    });

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load learning dashboard";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

