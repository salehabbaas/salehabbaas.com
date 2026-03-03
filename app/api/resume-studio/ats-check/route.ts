import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { generateAiText, safeJsonParse } from "@/lib/resume-studio/ai";
import { buildAtsResult, buildJobHash } from "@/lib/resume-studio/ats";
import { ensureResumeStudioFlag } from "@/lib/resume-studio/flags";
import { assertOwnedResume, requireAdminUser, resolveJobDescription } from "@/lib/resume-studio/server";
import { adminDb } from "@/lib/firebase/admin";
import { writeResumeActivity } from "@/lib/firestore/resume-studio";

export const runtime = "nodejs";

const atsSchema = z.object({
  docId: z.string().trim().min(1),
  jobId: z.string().trim().optional(),
  pastedJobDescription: z.string().trim().optional()
});

async function getAiRecommendations(input: {
  title: string;
  scoreEstimate: number;
  missingKeywords: string[];
  criticalIssues: string[];
}) {
  if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    return [];
  }

  try {
    const raw = await generateAiText({
      system: [
        "You are an ATS optimization assistant.",
        "Return strict JSON only in shape: {\"recommendations\":[\"...\"]}",
        "Recommendations must be concrete, section-specific, and short.",
        "Do not include markdown."
      ].join("\n"),
      user: [
        `Document: ${input.title}`,
        `Current score estimate: ${input.scoreEstimate}`,
        `Missing keywords: ${input.missingKeywords.join(", ") || "none"}`,
        `Critical issues: ${input.criticalIssues.join(" | ") || "none"}`
      ].join("\n"),
      temperature: 0.2,
      maxTokens: 320
    });

    const parsed = safeJsonParse<{ recommendations?: string[] }>(raw);
    if (!parsed?.recommendations || !Array.isArray(parsed.recommendations)) return [];

    return parsed.recommendations.map((item) => item.trim()).filter(Boolean).slice(0, 6);
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  const sessionResult = await requireAdminUser();
  if (sessionResult.unauthorized) return sessionResult.unauthorized;
  const featureBlocked = await ensureResumeStudioFlag("resumeStudioV2Enabled", "Resume Studio v2 is not enabled.");
  if (featureBlocked) return featureBlocked;
  const session = sessionResult.user;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestContext = getAdminRequestContext(request);

  try {
    const body = atsSchema.parse(await request.json());
    const { doc, forbidden } = await assertOwnedResume(body.docId, session.uid);
    if (forbidden) return forbidden;
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const jobContext = await resolveJobDescription({
      ownerId: session.uid,
      jobId: body.jobId ?? doc.linkedJobId ?? undefined,
      pastedJobDescription: body.pastedJobDescription
    });

    if (!jobContext?.jobDescription?.trim()) {
      return NextResponse.json({ error: "Job description is required for ATS check." }, { status: 400 });
    }

    const initialResult = buildAtsResult({
      doc,
      jobDescription: jobContext.jobDescription,
      aiRecommendations: []
    });

    const aiRecommendations = await getAiRecommendations({
      title: doc.title,
      scoreEstimate: initialResult.score,
      missingKeywords: initialResult.topMissingKeywords,
      criticalIssues: initialResult.criticalIssues.map((issue) => issue.message)
    });

    const result = buildAtsResult({
      doc,
      jobDescription: jobContext.jobDescription,
      aiRecommendations
    });

    const now = new Date();
    const jobHash = buildJobHash(jobContext.jobDescription);

    await adminDb.collection("resumeDocuments").doc(doc.id).set(
      {
        ats: {
          lastScore: result.score,
          lastCheckedAt: now,
          lastJobHash: jobHash,
          issues: result.issues
        },
        updatedAt: now
      },
      { merge: true }
    );

    if (jobContext.jobId) {
      const linkSnap = await adminDb
        .collection("jobResumeLinks")
        .where("ownerId", "==", session.uid)
        .where("jobId", "==", jobContext.jobId)
        .where("docId", "==", doc.id)
        .limit(1)
        .get();

      if (linkSnap.empty) {
        await adminDb.collection("jobResumeLinks").add({
          ownerId: session.uid,
          jobId: jobContext.jobId,
          docId: doc.id,
          createdAt: now,
          atsScore: result.score,
          notes: ""
        });
      } else {
        await linkSnap.docs[0].ref.set({ atsScore: result.score }, { merge: true });
      }
    }

    await writeResumeActivity({
      ownerId: session.uid,
      entityType: "resumeDocument",
      entityId: doc.id,
      action: "ats_check",
      from: String(doc.ats.lastScore ?? ""),
      to: String(result.score)
    });

    await writeAdminAuditLog(
      {
        module: "resume-studio",
        action: "ats_check",
        targetType: "resumeDocument",
        targetId: doc.id,
        summary: `ATS check completed for ${doc.title}`,
        metadata: {
          score: result.score,
          jobId: jobContext.jobId ?? "",
          source: jobContext.source,
          missingKeywords: result.topMissingKeywords.slice(0, 10)
        }
      },
      session,
      requestContext
    );

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to run ATS check";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
