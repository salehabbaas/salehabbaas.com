import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { callOpenAiStructured } from "@/lib/ai/openai-structured";
import {
  getBacklogStickers,
  getGoalReminderRules,
  parseDateIdOrToday,
} from "@/lib/goals/server";
import { aiPlanDaySchema } from "@/lib/goals/schemas";

const planDayResultSchema = z.object({
  stickerIds: z.array(z.string().trim().min(1)).max(20),
  rationale: z.string().trim().min(1).max(1200),
  warnings: z.array(z.string().trim().min(1).max(200)).max(8).default([]),
});

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    stickerIds: {
      type: "array",
      maxItems: 20,
      items: { type: "string", minLength: 1 },
    },
    rationale: { type: "string", minLength: 1, maxLength: 1200 },
    warnings: {
      type: "array",
      maxItems: 8,
      items: { type: "string", minLength: 1, maxLength: 200 },
    },
  },
  required: ["stickerIds", "rationale", "warnings"],
} as const;

export async function POST(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = aiPlanDaySchema.parse(await request.json());

    const settings = await getGoalReminderRules(user.uid);
    const dateId = parseDateIdOrToday(body.dateId, settings.timezone);
    const maxTasks = body.maxTasks ?? settings.maxTasksRecommended;

    const backlog = await getBacklogStickers(user.uid);
    const candidates = body.backlogStickerIds?.length
      ? backlog.filter((sticker) => body.backlogStickerIds?.includes(sticker.id))
      : backlog;

    const listText = candidates
      .slice(0, 240)
      .map(
        (sticker) =>
          `- id=${sticker.id}; title=${sticker.title}; priority=${sticker.priority}; status=${sticker.status}; estimate=${sticker.estimateMinutes ?? "na"}; tags=${sticker.tags.join("|")}`,
      )
      .join("\n");

    const focusAreas = (body.focusAreas ?? []).join(", ") || "none";

    const result = await callOpenAiStructured({
      schemaName: "goals_plan_day",
      schema: jsonSchema as unknown as Record<string, unknown>,
      responseSchema: planDayResultSchema,
      messages: [
        {
          role: "system",
          content:
            "You are a planning assistant. Build a realistic day plan with strong focus and low context switching. Return only IDs from candidates.",
        },
        {
          role: "user",
          content: `Date: ${dateId}\nMax tasks: ${maxTasks}\nFocus areas: ${focusAreas}\n\nCandidate stickers:\n${listText}`,
        },
      ],
      temperature: 0.1,
    });

    const allowedIds = new Set(candidates.map((sticker) => sticker.id));
    const selectedIds = result.stickerIds.filter((id) => allowedIds.has(id)).slice(0, maxTasks);

    return NextResponse.json({
      dateId,
      stickerIds: selectedIds,
      rationale: result.rationale,
      warnings: result.warnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to plan day";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
