import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { callOpenAiStructured } from "@/lib/ai/openai-structured";
import { currentWeekId } from "@/lib/goals/date";
import {
  getGoalReminderRules,
  getLearningCandidateStickers,
  getStickersByIds,
} from "@/lib/goals/server";
import { aiLearningPlanSchema } from "@/lib/goals/schemas";

const learningPlanResultSchema = z.object({
  planItems: z
    .array(
      z.object({
        stickerId: z.string().trim().min(1),
        timeBoxMinutes: z.number().int().min(5).max(480),
        rationale: z.string().trim().min(1).max(300),
      }),
    )
    .max(25),
  focusAreas: z.array(z.string().trim().min(1).max(120)).max(15).default([]),
  weeklyNotes: z.string().trim().max(1200).default(""),
});

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    planItems: {
      type: "array",
      maxItems: 25,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          stickerId: { type: "string", minLength: 1 },
          timeBoxMinutes: { type: "integer", minimum: 5, maximum: 480 },
          rationale: { type: "string", minLength: 1, maxLength: 300 },
        },
        required: ["stickerId", "timeBoxMinutes", "rationale"],
      },
    },
    focusAreas: {
      type: "array",
      maxItems: 15,
      items: { type: "string", minLength: 1, maxLength: 120 },
    },
    weeklyNotes: { type: "string", maxLength: 1200 },
  },
  required: ["planItems", "focusAreas", "weeklyNotes"],
} as const;

export async function POST(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = aiLearningPlanSchema.parse(await request.json());
    const settings = await getGoalReminderRules(user.uid);
    const weekId = body.weekId ?? currentWeekId(settings.timezone);
    const maxItems = Math.min(Math.max(body.maxItems ?? 8, 1), 25);

    const stickers = body.stickerIds?.length
      ? (await getStickersByIds(user.uid, body.stickerIds))
          .filter((sticker) => sticker.status !== "done" && sticker.learning)
      : await getLearningCandidateStickers({
          uid: user.uid,
          includeDone: false,
          limit: 320,
        });

    if (!stickers.length) {
      return NextResponse.json(
        { error: "No learning-ready stickers found. Add learning details first." },
        { status: 400 },
      );
    }

    const candidatesText = stickers
      .slice(0, 260)
      .map((sticker) => {
        const learning = sticker.learning;
        return `- id=${sticker.id}; title=${sticker.title}; area=${learning?.learningArea || "none"}; outcome=${learning?.learningOutcome || "none"}; difficulty=${learning?.difficulty || "na"}; studyType=${learning?.studyType || "na"}; estimate=${sticker.estimateMinutes ?? "na"}; timeBox=${learning?.timeBoxMinutes ?? "na"}; priority=${sticker.priority}`;
      })
      .join("\n");

    const requestedFocus = (body.focusAreas ?? []).join(", ") || "none";

    const result = await callOpenAiStructured({
      schemaName: "goals_learning_plan",
      schema: jsonSchema as unknown as Record<string, unknown>,
      responseSchema: learningPlanResultSchema,
      messages: [
        {
          role: "system",
          content:
            "You design realistic weekly learning plans. Choose only candidate sticker IDs. Keep context switching low and time-boxes practical.",
        },
        {
          role: "user",
          content: `Week: ${weekId}\nMax items: ${maxItems}\nRequested focus areas: ${requestedFocus}\n\nCandidates:\n${candidatesText}`,
        },
      ],
      temperature: 0.15,
    });

    const allowed = new Set(stickers.map((sticker) => sticker.id));
    const planItems = result.planItems
      .filter((item) => allowed.has(item.stickerId))
      .slice(0, maxItems);

    const targetMinutes = planItems.reduce((sum, item) => sum + item.timeBoxMinutes, 0);

    return NextResponse.json({
      weekId,
      planItems,
      focusAreas: result.focusAreas,
      weeklyNotes: result.weeklyNotes,
      targetMinutes,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to convert goals into learning plan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

