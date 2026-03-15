import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { callOpenAiStructured } from "@/lib/ai/openai-structured";
import { getTodayGoalsPayload, saveDayAiSummary } from "@/lib/goals/server";
import { aiSummarySchema } from "@/lib/goals/schemas";

const summaryResultSchema = z.object({
  summary: z.string().trim().min(1).max(1200),
  highlights: z.array(z.string().trim().min(1).max(180)).max(8).default([]),
});

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string", minLength: 1, maxLength: 1200 },
    highlights: {
      type: "array",
      maxItems: 8,
      items: { type: "string", minLength: 1, maxLength: 180 },
    },
  },
  required: ["summary", "highlights"],
} as const;

export async function POST(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = aiSummarySchema.parse(await request.json());
    const payload = await getTodayGoalsPayload(user.uid, body.dateId);

    const completedIds = new Set(body.completedStickerIds ?? []);
    const completedStickers = payload.planStickers.filter(
      (sticker) => sticker.status === "done" || completedIds.has(sticker.id),
    );
    const incompleteStickers = payload.planStickers.filter(
      (sticker) => sticker.status !== "done" && !completedIds.has(sticker.id),
    );

    const completedText = completedStickers.length
      ? completedStickers.map((sticker) => `- ${sticker.title}`).join("\n")
      : "- None";
    const incompleteText = incompleteStickers.length
      ? incompleteStickers.map((sticker) => `- ${sticker.title}`).join("\n")
      : "- None";

    const result = await callOpenAiStructured({
      schemaName: "goals_end_of_day_summary",
      schema: jsonSchema as unknown as Record<string, unknown>,
      responseSchema: summaryResultSchema,
      messages: [
        {
          role: "system",
          content:
            "You write concise end-of-day summaries for productivity logs. Keep it practical and neutral.",
        },
        {
          role: "user",
          content: `Date: ${body.dateId}\n\nCompleted stickers:\n${completedText}\n\nIncomplete stickers:\n${incompleteText}\n\nWhat went well:\n${body.whatWentWell || "Not provided"}\n\nWhat to improve:\n${body.whatToImprove || "Not provided"}`,
        },
      ],
      temperature: 0.2,
    });

    await saveDayAiSummary({
      uid: user.uid,
      dateId: body.dateId,
      summary: result.summary,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate summary";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
