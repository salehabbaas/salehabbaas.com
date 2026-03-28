import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createCommentThread, createSuggestion, reviewSuggestion } from "@/lib/resume-studio/collaboration";
import { ensureResumeStudioFlag } from "@/lib/resume-studio/flags";
import { assertOwnedResume, requireAdminUser } from "@/lib/resume-studio/server";

export const runtime = "nodejs";

const createCommentSchema = z.object({
  mode: z.literal("comment"),
  docId: z.string().trim().min(1),
  sectionId: z.string().trim().min(1).optional(),
  anchor: z.string().trim().min(1),
  body: z.string().trim().min(1).max(5000)
});

const createSuggestionSchema = z.object({
  mode: z.literal("suggestion"),
  docId: z.string().trim().min(1),
  sectionId: z.string().trim().min(1).optional(),
  from: z.string(),
  to: z.string()
});

const decisionSchema = z.object({
  mode: z.literal("decision"),
  suggestionId: z.string().trim().min(1),
  docId: z.string().trim().min(1),
  decision: z.enum(["accepted", "rejected"])
});

const schema = z.union([createCommentSchema, createSuggestionSchema, decisionSchema]);

export async function POST(request: NextRequest) {
  const sessionResult = await requireAdminUser();
  if (sessionResult.unauthorized) return sessionResult.unauthorized;
  const featureBlocked = await ensureResumeStudioFlag("resumeEditorV2Enabled", "Resume Studio editor v2 is not enabled.");
  if (featureBlocked) return featureBlocked;
  const session = sessionResult.user;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = schema.parse(await request.json());
    const { doc, forbidden } = await assertOwnedResume(body.docId, session.uid);
    if (forbidden) return forbidden;
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    if (body.mode === "comment") {
      const id = await createCommentThread({
        ownerId: session.uid,
        docId: body.docId,
        sectionId: body.sectionId,
        anchor: body.anchor,
        body: body.body,
        authorId: session.uid
      });
      return NextResponse.json({ success: true, id });
    }

    if (body.mode === "suggestion") {
      const id = await createSuggestion({
        ownerId: session.uid,
        docId: body.docId,
        sectionId: body.sectionId,
        from: body.from,
        to: body.to,
        authorId: session.uid
      });
      return NextResponse.json({ success: true, id });
    }

    await reviewSuggestion({
      suggestionId: body.suggestionId,
      ownerId: session.uid,
      reviewerId: session.uid,
      decision: body.decision
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process collaboration review request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
