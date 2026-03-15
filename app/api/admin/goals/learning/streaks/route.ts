import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { getGoalLearningStreaks } from "@/lib/goals/server";

export async function GET() {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const payload = await getGoalLearningStreaks(user.uid);
    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load learning streaks";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

