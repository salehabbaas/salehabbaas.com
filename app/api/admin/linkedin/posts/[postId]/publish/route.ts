import { NextRequest, NextResponse } from "next/server";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminSessionFromCookie } from "@/lib/auth/admin-api";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST(_request: NextRequest, context: { params: Promise<{ postId: string }> }) {
  const requestContext = getAdminRequestContext(_request);
  const session = await verifyAdminSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await context.params;
  if (!postId) {
    return NextResponse.json({ error: "Missing post id" }, { status: 400 });
  }

  const postRef = adminDb.collection("linkedinStudioPosts").doc(postId);
  const postSnap = await postRef.get();
  if (!postSnap.exists) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const now = new Date();
  await postRef.set(
    {
      status: "published",
      publishedAt: now,
      updatedAt: now
    },
    { merge: true }
  );

  await writeAdminAuditLog(
    {
      module: "linkedin-studio",
      action: "post_publish",
      targetType: "linkedinStudioPost",
      targetId: postId,
      summary: `Marked LinkedIn draft ${postId} as published`
    },
    session,
    requestContext
  );

  return NextResponse.json({ ok: true });
}
