import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { buildCollabRoomId, issueCollabToken, upsertCollabSession } from "@/lib/resume-studio/collaboration";
import { ensureResumeStudioFlag } from "@/lib/resume-studio/flags";
import { assertOwnedResume, requireAdminUser } from "@/lib/resume-studio/server";

export const runtime = "nodejs";

const schema = z.object({
  docId: z.string().trim().min(1)
});

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

    const roomId = buildCollabRoomId(session.uid, doc.id);
    const token = issueCollabToken({
      userId: session.uid,
      docId: doc.id,
      roomId
    });

    await upsertCollabSession({
      ownerId: session.uid,
      docId: doc.id,
      roomId,
      activeUsers: 1,
      lastActivityAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      token,
      roomId,
      websocketUrl: process.env.RESUME_COLLAB_WS_URL || ""
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to issue collaboration token";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
