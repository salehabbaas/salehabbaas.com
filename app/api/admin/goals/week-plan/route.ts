import { NextResponse } from "next/server";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { currentWeekId } from "@/lib/goals/date";
import {
  getGoalReminderRules,
  getGoalWeekPlan,
  listGoalStickers,
  getStickersByIds,
  upsertGoalWeekPlan,
} from "@/lib/goals/server";
import { weekPlanUpsertSchema } from "@/lib/goals/schemas";

export async function GET(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const settings = await getGoalReminderRules(user.uid);
    const weekId =
      url.searchParams.get("weekId")?.trim() || currentWeekId(settings.timezone);

    const weekPlan = await getGoalWeekPlan(user.uid, weekId);
    const [stickers, backlogRows] = await Promise.all([
      weekPlan ? getStickersByIds(user.uid, weekPlan.stickerIds) : [],
      listGoalStickers(user.uid, {
        limit: 260,
        status: "all",
        priority: "all",
        projectLinkedOnly: false,
      }),
    ]);

    return NextResponse.json({
      weekId,
      weekPlan,
      stickers,
      availableStickers: backlogRows.stickers.filter((sticker) => sticker.status !== "done"),
      settings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load week plan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestContext = getAdminRequestContext(request);

  try {
    const body = weekPlanUpsertSchema.parse(await request.json());

    const weekPlan = await upsertGoalWeekPlan({
      uid: user.uid,
      weekId: body.weekId,
      stickerIds: body.stickerIds,
      focusAreas: body.focusAreas,
      notes: body.notes,
    });

    await writeAdminAuditLog(
      {
        module: "project-management",
        action: "goals_update_week_plan",
        targetType: "goalsWeekPlan",
        targetId: body.weekId,
        summary: `Updated goals week plan ${body.weekId}`,
        metadata: {
          stickerCount: body.stickerIds.length,
          focusAreas: body.focusAreas?.length ?? 0,
        },
      },
      user,
      requestContext,
    );

    return NextResponse.json({
      success: true,
      weekPlan,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save week plan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
