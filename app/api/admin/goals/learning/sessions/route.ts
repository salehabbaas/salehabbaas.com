import { NextResponse } from "next/server";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import {
  createGoalLearningSession,
  getGoalReminderRules,
  getStickersByIds,
  parseDateIdOrToday,
} from "@/lib/goals/server";
import { learningSessionCreateSchema } from "@/lib/goals/schemas";

export async function POST(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestContext = getAdminRequestContext(request);

  try {
    const body = learningSessionCreateSchema.parse(await request.json());
    const settings = await getGoalReminderRules(user.uid);
    const dateId = parseDateIdOrToday(body.dateId, settings.timezone);

    let learningArea = body.learningArea;
    if (!learningArea && body.stickerId) {
      const stickers = await getStickersByIds(user.uid, [body.stickerId]);
      if (!stickers.length) {
        throw new Error("Selected sticker was not found.");
      }
      learningArea = stickers[0]?.learning?.learningArea;
    }

    const session = await createGoalLearningSession({
      uid: user.uid,
      dateId,
      stickerId: body.stickerId,
      learningArea,
      minutesSpent: body.minutesSpent,
      notes: body.notes,
      completed: body.completed,
    });

    await writeAdminAuditLog(
      {
        module: "project-management",
        action: "goals_learning_log_session",
        targetType: "goalsLearningSession",
        targetId: session.id,
        summary: `Logged learning session (${session.minutesSpent} min)`,
        metadata: {
          dateId: session.dateId,
          stickerId: session.stickerId || "",
          learningArea: session.learningArea || "",
        },
      },
      user,
      requestContext,
    );

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create learning session";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
