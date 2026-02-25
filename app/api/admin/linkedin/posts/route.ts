import { NextResponse } from "next/server";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { verifyAdminSessionFromCookie } from "@/lib/auth/admin-api";
import { adminDb } from "@/lib/firebase/admin";
import { mapPost, readStudioConfig } from "@/lib/linkedin-studio/firestore";
import { generateStudioPost } from "@/lib/linkedin-studio/generation";
import { generatePostSchema, studioConfigSchema } from "@/lib/linkedin-studio/validation";

export const runtime = "nodejs";

export async function GET() {
  const session = await verifyAdminSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const postsSnap = await adminDb
    .collection("linkedinStudioPosts")
    .orderBy("createdAt", "desc")
    .limit(40)
    .get();

  return NextResponse.json({ posts: postsSnap.docs.map(mapPost) });
}

export async function POST(request: Request) {
  const session = await verifyAdminSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestContext = getAdminRequestContext(request);

  try {
    const body = generatePostSchema.parse(await request.json().catch(() => ({})));

    const config = await readStudioConfig();
    const parsedConfig = studioConfigSchema.safeParse(config);
    if (!parsedConfig.success) {
      return NextResponse.json(
        { error: "LinkedIn Studio profile is incomplete. Save full setup first." },
        { status: 400 }
      );
    }

    const postsRef = adminDb.collection("linkedinStudioPosts");
    const recentSnap = await postsRef.orderBy("createdAt", "desc").limit(25).get();

    const recentPosts = recentSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: String(data.title ?? ""),
        text: String(data.finalText ?? ""),
        selectedTopics: Array.isArray(data.selectedTopics) ? data.selectedTopics : []
      };
    });

    const generated = await generateStudioPost({
      config: parsedConfig.data,
      recentPosts,
      request: body
    });

    const now = new Date();
    const postRef = postsRef.doc();

    const postPayload = {
      status: generated.scheduledFor ? "scheduled" : "draft",
      selectedCompany: generated.selectedCompany,
      selectedTopics: generated.selectedTopics,
      selectedPillar: generated.selectedPillar ?? "",
      title: generated.title,
      createdAt: now,
      updatedAt: now,
      scheduledFor: generated.scheduledFor ? new Date(generated.scheduledFor) : null,
      publishedAt: null,
      finalText: generated.postText,
      hashtags: generated.hashtags,
      mentions: generated.mentions,
      internalNotes: {
        rationale: generated.rationale,
        whyFit: generated.whyFit ?? ""
      }
    };

    await postRef.set(postPayload);
    await postRef.collection("versions").doc().set({
      versionNumber: 1,
      text: generated.postText,
      feedbackApplied: "Initial generation",
      createdAt: now
    });

    if (!body.manualCompany?.trim()) {
      const updatedCompanies = parsedConfig.data.targeting.companies.map((company) =>
        company.name === generated.selectedCompany
          ? {
              ...company,
              lastUsedAt: now.toISOString()
            }
          : company
      );

      await adminDb.collection("linkedinStudioProfiles").doc("default").set(
        {
          targeting: {
            ...parsedConfig.data.targeting,
            companies: updatedCompanies
          },
          updatedAt: now
        },
        { merge: true }
      );
    }

    await writeAdminAuditLog(
      {
        module: "linkedin-studio",
        action: "post_generate",
        targetType: "linkedinStudioPost",
        targetId: postRef.id,
        summary: `Generated LinkedIn draft for ${generated.selectedCompany}`,
        metadata: {
          topics: generated.selectedTopics,
          scheduledFor: generated.scheduledFor ?? null
        }
      },
      session,
      requestContext
    );

    const saved = await postRef.get();
    return NextResponse.json({ post: mapPost(saved) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate post";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
