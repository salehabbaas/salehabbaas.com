import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { callOpenAiStructured } from "@/lib/ai/openai-structured";
import { getLearningCandidateStickers } from "@/lib/goals/server";
import { aiLearningNextTaskSchema } from "@/lib/goals/schemas";

const nextTaskResultSchema = z.object({
  stickerId: z.string().trim().min(1),
  rationale: z.string().trim().min(1).max(500),
  suggestedMinutes: z.number().int().min(5).max(240),
});

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    stickerId: { type: "string", minLength: 1 },
    rationale: { type: "string", minLength: 1, maxLength: 500 },
    suggestedMinutes: { type: "integer", minimum: 5, maximum: 240 },
  },
  required: ["stickerId", "rationale", "suggestedMinutes"],
} as const;

export async function POST(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = aiLearningNextTaskSchema.parse(await request.json());
    const availableMinutes = Math.min(Math.max(body.availableMinutes ?? 45, 5), 240);

    const candidates = await getLearningCandidateStickers({
      uid: user.uid,
      includeDone: false,
      limit: 280,
    });

    if (!candidates.length) {
      return NextResponse.json(
        { error: "No learning-ready stickers found. Add at least one sticker with learning metadata." },
        { status: 400 },
      );
    }

    const focusArea = body.learningArea?.trim() || "none";
    const candidatesText = candidates
      .slice(0, 220)
      .map((sticker) => {
        const learning = sticker.learning;
        return `- id=${sticker.id}; title=${sticker.title}; area=${learning?.learningArea || "none"}; difficulty=${learning?.difficulty || "na"}; studyType=${learning?.studyType || "na"}; estimate=${sticker.estimateMinutes ?? "na"}; timeBox=${learning?.timeBoxMinutes ?? "na"}; priority=${sticker.priority}`;
      })
      .join("\n");

    const result = await callOpenAiStructured({
      schemaName: "goals_learning_next_task",
      schema: jsonSchema as unknown as Record<string, unknown>,
      responseSchema: nextTaskResultSchema,
      messages: [
        {
          role: "system",
          content:
            "You choose the single best next learning task. Pick only from provided sticker IDs and optimize for progress within available time.",
        },
        {
          role: "user",
          content: `Available minutes: ${availableMinutes}\nPreferred learning area: ${focusArea}\n\nCandidates:\n${candidatesText}`,
        },
      ],
      temperature: 0.1,
    });

    const selected =
      candidates.find((sticker) => sticker.id === result.stickerId) ?? null;
    if (!selected) {
      return NextResponse.json(
        { error: "AI selected an invalid sticker. Try again." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      stickerId: selected.id,
      sticker: selected,
      rationale: result.rationale,
      suggestedMinutes: result.suggestedMinutes,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to suggest next learning task";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

