import { NextRequest, NextResponse } from "next/server";

import { verifyAdminSessionFromCookie } from "@/lib/auth/admin-api";
import { adminDb } from "@/lib/firebase/admin";
import { mapVersion } from "@/lib/linkedin-studio/firestore";

function asIso(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return "";
}

export const runtime = "nodejs";

export async function GET(_request: NextRequest, context: { params: Promise<{ postId: string }> }) {
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

  const versionsSnap = await postRef.collection("versions").orderBy("versionNumber", "desc").get();

  const postData = postSnap.data() ?? {};

  return NextResponse.json({
    post: {
      id: postSnap.id,
      status: postData.status ?? "draft",
      selectedCompany: postData.selectedCompany ?? "",
      selectedTopics: Array.isArray(postData.selectedTopics) ? postData.selectedTopics : [],
      selectedPillar: postData.selectedPillar ?? "",
      title: postData.title ?? "",
      createdAt: asIso(postData.createdAt),
      updatedAt: asIso(postData.updatedAt),
      scheduledFor: asIso(postData.scheduledFor),
      publishedAt: asIso(postData.publishedAt),
      finalText: postData.finalText ?? "",
      hashtags: Array.isArray(postData.hashtags) ? postData.hashtags : [],
      mentions: Array.isArray(postData.mentions) ? postData.mentions : [],
      internalNotes: {
        rationale: postData.internalNotes?.rationale ?? "",
        whyFit: postData.internalNotes?.whyFit ?? ""
      }
    },
    versions: versionsSnap.docs.map(mapVersion)
  });
}
