import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { generateStructuredAi } from "@/lib/resume-studio/ai";
import { buildAtsResult, buildJobHash } from "@/lib/resume-studio/ats";
import { createStableId } from "@/lib/resume-studio/defaults";
import { ensureResumeStudioFlag } from "@/lib/resume-studio/flags";
import { RESUME_STUDIO_SCHEMA_VERSION, resolveMarginBox } from "@/lib/resume-studio/normalize";
import { assertOwnedResume, requireAdminUser } from "@/lib/resume-studio/server";
import { extractKeywords, resumeToPlainText } from "@/lib/resume-studio/text";
import { validateNoFabricatedClaims } from "@/lib/resume-studio/truthfulness";
import { adminDb } from "@/lib/firebase/admin";
import { getJobTrackerJob, saveResumeVersion, writeResumeActivity } from "@/lib/firestore/resume-studio";
import type { ResumeDocumentRecord } from "@/types/resume-studio";

export const runtime = "nodejs";

const generateSchema = z.object({
  baseDocId: z.string().trim().min(1),
  jobId: z.string().trim().min(1),
  modelOverride: z.enum(["gpt-5.3", "gpt-5.2"]).optional(),
  strictTruthfulness: z.boolean().default(true)
});

const keywordSchema = z.object({
  keywords: z.array(z.string().trim()).default([])
});

const summarySchema = z.object({
  summary: z.string().trim().min(1)
});

const bulletsSchema = z.object({
  bullets: z.array(z.string().trim().min(2)).min(1).max(8)
});

function uniqueValues(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function cloneDocument(base: ResumeDocumentRecord, input: { ownerId: string; linkedJobId: string; title: string }) {
  return {
    ownerId: input.ownerId,
    schemaVersion: RESUME_STUDIO_SCHEMA_VERSION,
    type: base.type,
    title: input.title,
    linkedJobId: input.linkedJobId,
    templateId: base.templateId,
    page: {
      ...base.page,
      size: "A4" as const,
      marginBox: resolveMarginBox({
        marginBox: base.page.marginBox,
        margins: base.page.margins,
        fallback: 22
      })
    },
    style: base.style,
    language: base.language,
    sections: base.sections.map((section) => ({
      ...section,
      id: createStableId("section"),
      data: JSON.parse(JSON.stringify(section.data)) as Record<string, unknown>
    })),
    ats: {},
    pinned: false,
    tags: [...(base.tags ?? []), "tailored"]
  } satisfies Omit<ResumeDocumentRecord, "id" | "createdAt" | "updatedAt">;
}

async function extractTailoringKeywords(jobDescription: string, modelOverride?: "gpt-5.3" | "gpt-5.2") {
  const deterministic = extractKeywords(jobDescription, 20);
  try {
    const structured = await generateStructuredAi({
      system: [
        "Extract ATS-relevant keywords from the job description.",
        "Return strict JSON: {\"keywords\": string[]}.",
        "Use concise skill and role terms only."
      ].join("\n"),
      user: jobDescription,
      temperature: 0.1,
      maxTokens: 240,
      modelOverride,
      schema: keywordSchema
    });

    return {
      keywords: uniqueValues([...deterministic, ...(structured.data.keywords ?? [])]).slice(0, 20),
      modelUsed: structured.modelUsed,
      fallbackUsed: structured.fallbackUsed
    };
  } catch {
    return {
      keywords: deterministic.slice(0, 20),
      modelUsed: undefined,
      fallbackUsed: false
    };
  }
}

async function rewriteSummary(input: {
  originalSummary: string;
  resumeTitle: string;
  jobDescription: string;
  company: string;
  role: string;
  keywords: string[];
  modelOverride?: "gpt-5.3" | "gpt-5.2";
}) {
  const original = input.originalSummary.trim();
  if (!original) {
    return { summary: "", modelUsed: undefined, fallbackUsed: false };
  }

  const structured = await generateStructuredAi({
    system: [
      "You are a resume tailoring assistant.",
      "Rewrite only the summary section to better match the role while preserving truthfulness.",
      "Use only facts already present in the original summary and job description.",
      "Return strict JSON: {\"summary\": string}."
    ].join("\n"),
    user: [
      `Resume: ${input.resumeTitle}`,
      `Role: ${input.role} at ${input.company}`,
      `Target keywords: ${input.keywords.join(", ") || "none"}`,
      "Original summary:",
      original,
      "Job description:",
      input.jobDescription
    ].join("\n"),
    modelOverride: input.modelOverride,
    temperature: 0.25,
    maxTokens: 420,
    schema: summarySchema
  });

  return {
    summary: structured.data.summary.trim(),
    modelUsed: structured.modelUsed,
    fallbackUsed: structured.fallbackUsed
  };
}

async function rewritePrimaryExperienceBullets(input: {
  bullets: string[];
  role: string;
  company: string;
  jobDescription: string;
  keywords: string[];
  modelOverride?: "gpt-5.3" | "gpt-5.2";
}) {
  if (!input.bullets.length) {
    return { bullets: [] as string[], modelUsed: undefined, fallbackUsed: false };
  }

  const structured = await generateStructuredAi({
    system: [
      "You are a resume bullet optimization assistant.",
      "Rewrite bullets for ATS alignment with concise, factual wording.",
      "Keep each bullet under 26 words and preserve truthfulness.",
      "Return strict JSON: {\"bullets\": string[]}."
    ].join("\n"),
    user: [
      `Experience: ${input.role} at ${input.company}`,
      `Target keywords: ${input.keywords.join(", ") || "none"}`,
      "Original bullets:",
      ...input.bullets.map((bullet) => `- ${bullet}`),
      "Job description:",
      input.jobDescription
    ].join("\n"),
    modelOverride: input.modelOverride,
    temperature: 0.2,
    maxTokens: 520,
    schema: bulletsSchema
  });

  return {
    bullets: structured.data.bullets.map((bullet) => bullet.trim()).filter(Boolean).slice(0, 8),
    modelUsed: structured.modelUsed,
    fallbackUsed: structured.fallbackUsed
  };
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
    const body = generateSchema.parse(await request.json());
    const { doc: baseDoc, forbidden } = await assertOwnedResume(body.baseDocId, session.uid);
    if (forbidden) return forbidden;
    if (!baseDoc) return NextResponse.json({ error: "Base document not found" }, { status: 404 });

    const job = await getJobTrackerJob(body.jobId);
    if (!job || job.ownerId !== session.uid) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const cloned = cloneDocument(baseDoc, {
      ownerId: session.uid,
      linkedJobId: job.id,
      title: `${baseDoc.title} - ${job.company} ${job.title}`.slice(0, 160)
    });

    const keywordPass = await extractTailoringKeywords(job.descriptionText, body.modelOverride);
    const summarySection = cloned.sections.find((section) => section.kind === "summary");
    const experienceSection = cloned.sections.find((section) => section.kind === "experience");
    const sourceResumeText = resumeToPlainText(baseDoc);

    let summaryModelUsed: string | undefined;
    let summaryFallbackUsed = false;
    if (summarySection) {
      const summaryData = summarySection.data as Record<string, unknown>;
      const summaryText = typeof summaryData.text === "string" ? summaryData.text : "";
      const rewrittenSummary = await rewriteSummary({
        originalSummary: summaryText,
        resumeTitle: baseDoc.title,
        jobDescription: job.descriptionText,
        company: job.company,
        role: job.title,
        keywords: keywordPass.keywords,
        modelOverride: body.modelOverride
      });

      if (rewrittenSummary.summary) {
        if (body.strictTruthfulness) {
          const summaryTruth = validateNoFabricatedClaims({
            sourceResumeText,
            jobDescription: job.descriptionText,
            generatedText: rewrittenSummary.summary
          });
          if (!summaryTruth.isValid) {
            return NextResponse.json(
              {
                error: "Summary rewrite failed strict truthfulness validation.",
                violations: summaryTruth.addedClaims.slice(0, 10)
              },
              { status: 422 }
            );
          }
        }
        summaryData.text = rewrittenSummary.summary;
      }

      summaryModelUsed = rewrittenSummary.modelUsed;
      summaryFallbackUsed = rewrittenSummary.fallbackUsed;
    }

    let bulletModelUsed: string | undefined;
    let bulletFallbackUsed = false;
    if (experienceSection) {
      const experienceData = experienceSection.data as Record<string, unknown>;
      const items = Array.isArray(experienceData.items) ? (experienceData.items as Array<Record<string, unknown>>) : [];
      const firstItem = items[0];
      if (firstItem && Array.isArray(firstItem.bullets) && firstItem.bullets.length > 0) {
        const bullets = firstItem.bullets.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
        const rewrittenBullets = await rewritePrimaryExperienceBullets({
          bullets,
          role: String(firstItem.role ?? ""),
          company: String(firstItem.company ?? ""),
          jobDescription: job.descriptionText,
          keywords: keywordPass.keywords,
          modelOverride: body.modelOverride
        });

        if (rewrittenBullets.bullets.length) {
          if (body.strictTruthfulness) {
            const bulletTruth = validateNoFabricatedClaims({
              sourceResumeText,
              jobDescription: job.descriptionText,
              generatedText: rewrittenBullets.bullets.join("\n")
            });
            if (!bulletTruth.isValid) {
              return NextResponse.json(
                {
                  error: "Bullet rewrite failed strict truthfulness validation.",
                  violations: bulletTruth.addedClaims.slice(0, 10)
                },
                { status: 422 }
              );
            }
          }
          firstItem.bullets = rewrittenBullets.bullets;
        }

        bulletModelUsed = rewrittenBullets.modelUsed;
        bulletFallbackUsed = rewrittenBullets.fallbackUsed;
      }
    }

    const now = new Date();
    const docRef = adminDb.collection("resumeDocuments").doc();

    const baselineClone = cloneDocument(baseDoc, {
      ownerId: session.uid,
      linkedJobId: job.id,
      title: `${baseDoc.title} - ${job.company} ${job.title}`.slice(0, 160)
    });

    const baselineAts = buildAtsResult({
      doc: {
        id: docRef.id,
        ...baselineClone,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      jobDescription: job.descriptionText,
      aiRecommendations: []
    });

    let ats = buildAtsResult({
      doc: {
        id: docRef.id,
        ...cloned,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      jobDescription: job.descriptionText,
      aiRecommendations: keywordPass.keywords.slice(0, 6)
    });

    let finalDoc = cloned;
    if (ats.score + 2 < baselineAts.score) {
      ats = baselineAts;
      finalDoc = baselineClone;
    }

    await docRef.set({
      ...finalDoc,
      ats: {
        lastScore: ats.score,
        lastCheckedAt: now,
        lastJobHash: buildJobHash(job.descriptionText),
        issues: ats.issues
      },
      createdAt: now,
      updatedAt: now
    });

    await adminDb.collection("jobResumeLinks").add({
      ownerId: session.uid,
      jobId: job.id,
      docId: docRef.id,
      createdAt: now,
      atsScore: ats.score,
      notes: ""
    });

    await saveResumeVersion({
      docId: docRef.id,
      ownerId: session.uid,
      note: "Initial tailored version",
      snapshot: {
        ...finalDoc,
        ats: {
          lastScore: ats.score,
          lastCheckedAt: now.toISOString(),
          lastJobHash: buildJobHash(job.descriptionText),
          issues: ats.issues
        }
      }
    });

    await writeResumeActivity({
      ownerId: session.uid,
      entityType: "job",
      entityId: job.id,
      action: "tailored_resume_created",
      from: baseDoc.id,
      to: docRef.id
    });

    await writeResumeActivity({
      ownerId: session.uid,
      entityType: "resumeDocument",
      entityId: docRef.id,
      action: "generated_from_job",
      from: baseDoc.id,
      to: job.id
    });

    await writeAdminAuditLog(
      {
        module: "resume-studio",
        action: "generate_tailored_resume",
        targetType: "resumeDocument",
        targetId: docRef.id,
        summary: `Generated tailored resume for ${job.company} ${job.title}`,
        metadata: {
          baseDocId: baseDoc.id,
          jobId: job.id,
          atsScore: ats.score,
          keywordPassCount: keywordPass.keywords.length,
          keywordModelUsed: keywordPass.modelUsed ?? "",
          keywordFallbackUsed: keywordPass.fallbackUsed,
          summaryModelUsed: summaryModelUsed ?? "",
          summaryFallbackUsed,
          bulletModelUsed: bulletModelUsed ?? "",
          bulletFallbackUsed,
          strictTruthfulness: body.strictTruthfulness
        }
      },
      session,
      requestContext
    );

    return NextResponse.json({
      docId: docRef.id,
      score: ats.score,
      linkedJobId: job.id,
      keywordPassCount: keywordPass.keywords.length
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate tailored resume";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
