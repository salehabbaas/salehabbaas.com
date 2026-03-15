import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { callOpenAiStructured } from "@/lib/ai/openai-structured";
import { currentWeekId, dateIdFromDate, isoWeekDateIds } from "@/lib/goals/date";
import {
  getGoalLearningPlan,
  getGoalReminderRules,
  getLatestCompletedStickers,
  listGoalLearningSessions,
} from "@/lib/goals/server";
import { aiLearningRecapSchema } from "@/lib/goals/schemas";

const recapResultSchema = z.object({
  summary: z.string().trim().min(1).max(1200),
  wins: z.array(z.string().trim().min(1).max(220)).max(8).default([]),
  gaps: z.array(z.string().trim().min(1).max(220)).max(8).default([]),
  nextFocus: z.array(z.string().trim().min(1).max(220)).max(8).default([]),
});

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string", minLength: 1, maxLength: 1200 },
    wins: {
      type: "array",
      maxItems: 8,
      items: { type: "string", minLength: 1, maxLength: 220 },
    },
    gaps: {
      type: "array",
      maxItems: 8,
      items: { type: "string", minLength: 1, maxLength: 220 },
    },
    nextFocus: {
      type: "array",
      maxItems: 8,
      items: { type: "string", minLength: 1, maxLength: 220 },
    },
  },
  required: ["summary", "wins", "gaps", "nextFocus"],
} as const;

export async function POST(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = aiLearningRecapSchema.parse(await request.json());
    const settings = await getGoalReminderRules(user.uid);
    const weekId = body.weekId ?? currentWeekId(settings.timezone);
    const weekDateIds = isoWeekDateIds(weekId);
    const fromDateId = weekDateIds[0];
    const toDateId = weekDateIds[weekDateIds.length - 1];

    if (!fromDateId || !toDateId) {
      return NextResponse.json({ error: "Invalid weekId." }, { status: 400 });
    }

    const [plan, sessions, completed] = await Promise.all([
      getGoalLearningPlan(user.uid, weekId),
      listGoalLearningSessions({
        uid: user.uid,
        fromDateId,
        toDateId,
        limit: 600,
      }),
      getLatestCompletedStickers({
        uid: user.uid,
        limit: 900,
      }),
    ]);

    const weekDateSet = new Set(weekDateIds);
    const completedLearning = completed.filter((sticker) => {
      if (!sticker.learning) return false;
      const doneDateId =
        sticker.plannedDate ||
        (sticker.completedAt
          ? dateIdFromDate(new Date(sticker.completedAt), settings.timezone)
          : "");
      return Boolean(doneDateId && weekDateSet.has(doneDateId));
    });

    const sessionsText = sessions.length
      ? sessions
          .slice(0, 120)
          .map(
            (session) =>
              `- ${session.dateId}: ${session.minutesSpent}m; area=${session.learningArea || "General"}; completed=${session.completed ? "yes" : "no"}`,
          )
          .join("\n")
      : "- none";

    const completedText = completedLearning.length
      ? completedLearning
          .slice(0, 120)
          .map(
            (sticker) =>
              `- ${sticker.title}; area=${sticker.learning?.learningArea || "General"}; outcome=${sticker.learning?.learningOutcome || "none"}`,
          )
          .join("\n")
      : "- none";

    const plannedText = plan?.stickerIds?.length
      ? `Planned stickers: ${plan.stickerIds.length}; focusAreas=${plan.focusAreas.join(", ") || "none"}; targetMinutes=${plan.targetMinutes}`
      : "No explicit weekly learning plan was saved.";

    const result = await callOpenAiStructured({
      schemaName: "goals_learning_weekly_recap",
      schema: jsonSchema as unknown as Record<string, unknown>,
      responseSchema: recapResultSchema,
      messages: [
        {
          role: "system",
          content:
            "You produce concise weekly learning recaps with practical insights and clear next-focus suggestions.",
        },
        {
          role: "user",
          content: `Week: ${weekId}\n${plannedText}\n\nLearning sessions:\n${sessionsText}\n\nCompleted learning stickers:\n${completedText}`,
        },
      ],
      temperature: 0.2,
    });

    return NextResponse.json({
      weekId,
      ...result,
      metrics: {
        sessions: sessions.length,
        completedLearningStickers: completedLearning.length,
        plannedLearningStickers: plan?.stickerIds.length ?? 0,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to generate weekly learning recap";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

