import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { adminDb } from "@/lib/firebase/admin";
import { writeResumeActivity } from "@/lib/firestore/resume-studio";
import { createDefaultResumeDocument } from "@/lib/resume-studio/defaults";
import { ensureResumeStudioFlag } from "@/lib/resume-studio/flags";
import { generateStructuredAi } from "@/lib/resume-studio/ai";
import { assertOwnedResume, requireAdminUser, resolveJobDescription } from "@/lib/resume-studio/server";
import { resumeToPlainText } from "@/lib/resume-studio/text";
import { validateNoFabricatedClaims } from "@/lib/resume-studio/truthfulness";

export const runtime = "nodejs";

const schema = z.object({
  docId: z.string().trim().min(1),
  jobId: z.string().trim().optional(),
  pastedJobDescription: z.string().trim().optional(),
  customInstruction: z.string().trim().max(600).optional(),
  modelOverride: z.enum(["gpt-5.3", "gpt-5.2"]).optional(),
  strictTruthfulness: z.boolean().default(true)
});

const outputSchema = z.object({
  coverLetter: z.string().trim().min(40)
});

function getHeaderSection(doc: { sections: Array<{ kind: string; data: Record<string, unknown> }> }) {
  return doc.sections.find((section) => section.kind === "header");
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
    const body = schema.parse(await request.json());
    const { doc, forbidden } = await assertOwnedResume(body.docId, session.uid);
    if (forbidden) return forbidden;
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const jobContext = await resolveJobDescription({
      ownerId: session.uid,
      jobId: body.jobId ?? doc.linkedJobId ?? undefined,
      pastedJobDescription: body.pastedJobDescription
    });
    if (!jobContext?.jobDescription?.trim()) {
      return NextResponse.json({ error: "Job description is required to generate a cover letter." }, { status: 400 });
    }

    const generated = await generateStructuredAi({
      system: [
        "You are a senior career writing assistant.",
        "Generate a concise, professional cover letter using the user's resume evidence.",
        "Use simple ATS-safe formatting with 3-5 short paragraphs.",
        "Do not invent employers, achievements, or skills not present in the resume.",
        "Return strict JSON with shape: {\"coverLetter\": string}."
      ].join("\n"),
      user: [
        `Resume title: ${doc.title}`,
        body.customInstruction ? `Custom instruction: ${body.customInstruction}` : "",
        "Resume text:",
        resumeToPlainText(doc),
        "",
        "Target job description:",
        jobContext.jobDescription
      ]
        .filter(Boolean)
        .join("\n"),
      temperature: 0.25,
      maxTokens: 1000,
      modelOverride: body.modelOverride,
      schema: outputSchema
    });

    const letter = generated.data.coverLetter.trim();
    if (body.strictTruthfulness) {
      const truth = validateNoFabricatedClaims({
        sourceResumeText: resumeToPlainText(doc),
        jobDescription: jobContext.jobDescription,
        generatedText: letter
      });
      if (!truth.isValid) {
        return NextResponse.json(
          {
            error: "Generated cover letter failed strict truthfulness validation.",
            violations: truth.addedClaims.slice(0, 10)
          },
          { status: 422 }
        );
      }
    }

    const payload = createDefaultResumeDocument({
      ownerId: session.uid,
      type: "cover_letter",
      title: `${doc.title} Cover Letter`,
      linkedJobId: jobContext.jobId ?? doc.linkedJobId ?? null,
      templateId: doc.templateId
    });

    payload.page = { ...doc.page };
    payload.style = { ...doc.style };
    payload.language = { ...doc.language };

    const header = getHeaderSection(doc);
    if (header) {
      const targetHeader = payload.sections.find((section) => section.kind === "header");
      if (targetHeader) {
        targetHeader.data = JSON.parse(JSON.stringify(header.data)) as Record<string, unknown>;
      }
    }

    const summary = payload.sections.find((section) => section.kind === "summary");
    if (summary) {
      summary.data = { text: letter };
    }

    const docRef = adminDb.collection("resumeDocuments").doc();
    const now = new Date();
    await docRef.set({
      ...payload,
      createdAt: now,
      updatedAt: now
    });

    await writeResumeActivity({
      ownerId: session.uid,
      entityType: "resumeDocument",
      entityId: docRef.id,
      action: "cover_letter_created",
      from: doc.id,
      to: jobContext.jobId ?? ""
    });

    await writeAdminAuditLog(
      {
        module: "resume-studio",
        action: "create_cover_letter",
        targetType: "resumeDocument",
        targetId: docRef.id,
        summary: `Created cover letter from ${doc.title}`,
        metadata: {
          sourceDocId: doc.id,
          jobId: jobContext.jobId ?? "",
          modelUsed: generated.modelUsed,
          fallbackUsed: generated.fallbackUsed,
          strictTruthfulness: body.strictTruthfulness
        }
      },
      session,
      requestContext
    );

    return NextResponse.json({
      docId: docRef.id,
      linkedJobId: payload.linkedJobId ?? null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create cover letter";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
