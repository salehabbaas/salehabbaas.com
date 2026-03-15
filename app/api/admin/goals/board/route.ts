import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { ensureGoalsBoard, listGoalStickers } from "@/lib/goals/server";
import { boardQuerySchema } from "@/lib/goals/schemas";

const querySchema = boardQuerySchema.extend({
  projectLinkedOnly: z.union([z.boolean(), z.string()]).optional(),
  learningOnly: z.union([z.boolean(), z.string()]).optional(),
});

function parseProjectLinkedOnly(value: boolean | string | undefined) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;
  return value === "1" || value.toLowerCase() === "true";
}

function parseBooleanParam(value: boolean | string | undefined) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;
  return value === "1" || value.toLowerCase() === "true";
}

export async function GET(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "projects" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);

  try {
    const parsed = querySchema.parse({
      limit: url.searchParams.get("limit")
        ? Number(url.searchParams.get("limit"))
        : undefined,
      cursor: url.searchParams.get("cursor") || undefined,
      status: url.searchParams.get("status") || undefined,
      priority: url.searchParams.get("priority") || undefined,
      tag: url.searchParams.get("tag") || undefined,
      plannedDate: url.searchParams.get("plannedDate") || undefined,
      projectLinkedOnly:
        url.searchParams.get("projectLinkedOnly") || undefined,
      learningOnly: url.searchParams.get("learningOnly") || undefined,
      learningArea: url.searchParams.get("learningArea") || undefined,
      learningDifficulty: url.searchParams.get("learningDifficulty") || undefined,
      studyType: url.searchParams.get("studyType") || undefined,
    });

    const [board, boardRows] = await Promise.all([
      ensureGoalsBoard(user.uid),
      listGoalStickers(user.uid, {
        ...parsed,
        projectLinkedOnly: parseProjectLinkedOnly(parsed.projectLinkedOnly),
        learningOnly: parseBooleanParam(parsed.learningOnly),
      }),
    ]);

    return NextResponse.json({
      board,
      ...boardRows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load goals board";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
