import { NextRequest, NextResponse } from "next/server";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { adminDb } from "@/lib/firebase/admin";
import { readStudioConfig } from "@/lib/linkedin-studio/firestore";
import { refineStudioPost } from "@/lib/linkedin-studio/generation";
import { refinePostSchema, studioConfigSchema } from "@/lib/linkedin-studio/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: { params: Promise<{ postId: string }> }) {
  const session = await verifyAdminRequest({ requiredModule: "linkedin" });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestContext = getAdminRequestContext(request);

  try {
    const { postId } = await context.params;
    const body = refinePostSchema.parse(await request.json());

    const postRef = adminDb.collection("linkedinStudioPosts").doc(postId);
    const postSnap = await postRef.get();
    if (!postSnap.exists) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const config = await readStudioConfig();
    const parsedConfig = studioConfigSchema.safeParse(config);
    if (!parsedConfig.success) {
      return NextResponse.json(
        { error: "LinkedIn Studio profile is incomplete. Save full setup first." },
        { status: 400 }
      );
    }

    const postData = postSnap.data() ?? {};

    const refined = await refineStudioPost({
      config: parsedConfig.data,
      originalPost: String(postData.finalText ?? ""),
      company: String(postData.selectedCompany ?? ""),
      topics: Array.isArray(postData.selectedTopics) ? postData.selectedTopics : [],
      feedback: body.feedback
    });

    const versionsSnap = await postRef.collection("versions").orderBy("versionNumber", "desc").limit(1).get();
    const lastVersion = Number(versionsSnap.docs[0]?.data().versionNumber ?? 1);
    const nextVersion = lastVersion + 1;

    const now = new Date();

    await postRef.set(
      {
        title: refined.title,
        finalText: refined.postText,
        hashtags: refined.hashtags,
        mentions: refined.mentions,
        updatedAt: now,
        internalNotes: {
          ...(postData.internalNotes ?? {}),
          rationale: refined.rationale,
          whyFit: refined.whyFit ?? ""
        }
      },
      { merge: true }
    );

    await postRef.collection("versions").doc().set({
      versionNumber: nextVersion,
      text: refined.postText,
      feedbackApplied: body.feedback ?? "Auto refine",
      createdAt: now
    });

    await writeAdminAuditLog(
      {
        module: "linkedin-studio",
        action: "post_refine",
        targetType: "linkedinStudioPost",
        targetId: postId,
        summary: `Refined LinkedIn draft ${postId}`,
        metadata: { versionNumber: nextVersion }
      },
      session,
      requestContext
    );

    return NextResponse.json({
      ok: true,
      versionNumber: nextVersion,
      title: refined.title,
      finalText: refined.postText
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to refine post";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
