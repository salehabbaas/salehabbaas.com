import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { callOpenAiStructured } from "@/lib/ai/openai-structured";
import { defaultXpForPriority } from "@/lib/goals/scoring";
import { aiExtractSchema } from "@/lib/goals/schemas";

const extractResultSchema = z.object({
  stickers: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(220),
        notes: z.string().trim().max(4000).optional(),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
        status: z.enum(["inbox", "this_week", "today"]).default("inbox"),
        tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
        estimateMinutes: z.number().int().min(5).max(960).nullable().optional(),
        plannedDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        learningArea: z.string().trim().max(120).optional(),
        learningOutcome: z.string().trim().max(1000).optional(),
        difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
        studyType: z.enum(["read", "watch", "build", "practice", "review"]).optional(),
        resourceLink: z.string().trim().url().max(2000).optional(),
        timeBoxMinutes: z.number().int().min(5).max(480).nullable().optional(),
      }),
    )
    .max(40)
    .default([]),
});

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    stickers: {
      type: "array",
      maxItems: 40,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", minLength: 1, maxLength: 220 },
          notes: { type: "string", maxLength: 4000 },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
          },
          status: {
            type: "string",
            enum: ["inbox", "this_week", "today"],
          },
          tags: {
            type: "array",
            maxItems: 12,
            items: { type: "string", minLength: 1, maxLength: 40 },
          },
          estimateMinutes: { type: ["integer", "null"], minimum: 5, maximum: 960 },
          plannedDate: {
            type: ["string", "null"],
            pattern: "^\\d{4}-\\d{2}-\\d{2}$",
          },
          learningArea: { type: "string", maxLength: 120 },
          learningOutcome: { type: "string", maxLength: 1000 },
          difficulty: {
            type: "string",
            enum: ["beginner", "intermediate", "advanced"],
          },
          studyType: {
            type: "string",
            enum: ["read", "watch", "build", "practice", "review"],
          },
          resourceLink: { type: "string", maxLength: 2000 },
          timeBoxMinutes: { type: ["integer", "null"], minimum: 5, maximum: 480 },
        },
        required: ["title", "priority", "status", "tags"],
      },
    },
  },
  required: ["stickers"],
} as const;

export async function POST(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = aiExtractSchema.parse(await request.json());

    const result = await callOpenAiStructured({
      schemaName: "goals_extract_stickers",
      schema: jsonSchema as unknown as Record<string, unknown>,
      responseSchema: extractResultSchema,
      messages: [
        {
          role: "system",
          content:
            "You extract actionable planning stickers. Keep outputs concise, execution-focused, and realistic for one person.",
        },
        {
          role: "user",
          content: `Extract stickers from the input below.\n\nInput text:\n${body.text}\n\nContext URL: ${body.url || "none"}`,
        },
      ],
      temperature: 0.15,
    });

    const normalizedStickers = (result.stickers ?? []).map((sticker) => {
      const priority = sticker.priority ?? "medium";
      const estimateMinutes = sticker.estimateMinutes ?? null;
      const timeBoxMinutes = sticker.timeBoxMinutes ?? null;
      return {
        ...sticker,
        priority,
        estimateMinutes,
        timeBoxMinutes,
        xpValue: defaultXpForPriority(priority, estimateMinutes),
      };
    });

    return NextResponse.json({
      stickers: normalizedStickers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to extract stickers";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
