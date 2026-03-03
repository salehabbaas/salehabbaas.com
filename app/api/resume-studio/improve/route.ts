import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { generateStructuredAi } from "@/lib/resume-studio/ai";
import { ensureResumeStudioFlag } from "@/lib/resume-studio/flags";
import { assertOwnedResume, requireAdminUser, resolveJobDescription } from "@/lib/resume-studio/server";
import { resumeToPlainText } from "@/lib/resume-studio/text";
import { validateNoFabricatedClaims } from "@/lib/resume-studio/truthfulness";
import type { ResumeSectionBlock } from "@/types/resume-studio";

export const runtime = "nodejs";

const improveSchema = z.object({
  docId: z.string().trim().min(1),
  sectionId: z.string().trim().min(1),
  mode: z.enum(["rewrite_bullets", "improve_summary", "fix_grammar", "tailor_to_job", "generate_cover_letter", "custom_prompt"]),
  customInstruction: z.string().trim().min(3).max(600).optional(),
  jobId: z.string().trim().optional(),
  pastedJobDescription: z.string().trim().optional(),
  language: z.string().trim().optional(),
  modelOverride: z.enum(["gpt-5.3", "gpt-5.2"]).optional(),
  strictTruthfulness: z.boolean().default(true),
  options: z
    .object({
      tailoredSuggestions: z.boolean().optional(),
      grammar: z.boolean().optional(),
      readability: z.boolean().optional(),
      recommendations: z.boolean().optional()
    })
    .optional()
});

const outputContractSchema = z.object({
  summary: z.string().trim().optional(),
  bullets: z.array(z.string().trim()).optional(),
  coverLetter: z.string().trim().optional()
});

function sectionText(section: ResumeSectionBlock) {
  const lines: string[] = [];
  const data = section.data as Record<string, unknown>;

  if (typeof data.text === "string" && data.text.trim()) {
    lines.push(data.text.trim());
  }

  if (Array.isArray(data.items)) {
    for (const item of data.items as Array<Record<string, unknown>>) {
      for (const value of Object.values(item)) {
        if (typeof value === "string" && value.trim()) lines.push(value.trim());
        if (Array.isArray(value)) {
          value.forEach((entry) => {
            if (typeof entry === "string" && entry.trim()) lines.push(entry.trim());
          });
        }
      }
    }
  }

  return lines.join("\n").trim();
}

function buildModeInstruction(mode: z.infer<typeof improveSchema>["mode"]) {
  switch (mode) {
    case "rewrite_bullets":
      return "Rewrite resume bullet points to be stronger, concise, and measurable. Keep facts grounded and ATS-friendly.";
    case "improve_summary":
      return "Rewrite the professional summary to be clear, concise, and recruiter-friendly. Avoid buzzwords.";
    case "fix_grammar":
      return "Fix grammar, spelling, and punctuation without changing meaning.";
    case "tailor_to_job":
      return "Tailor content to align with job requirements while staying truthful and specific.";
    case "generate_cover_letter":
      return "Generate a concise cover letter using resume context and the target job description.";
    case "custom_prompt":
      return "Follow the custom user instruction while preserving truthfulness and ATS readability.";
    default:
      return "Improve the writing quality and clarity.";
  }
}

function buildLineDiff(original: string, suggestion: string) {
  const originalLines = original
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const suggestedLines = suggestion
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    originalLines,
    suggestedLines,
    removed: originalLines.filter((line) => !suggestedLines.includes(line)),
    added: suggestedLines.filter((line) => !originalLines.includes(line))
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
    const body = improveSchema.parse(await request.json());
    if (body.mode === "custom_prompt" && !body.customInstruction?.trim()) {
      return NextResponse.json({ error: "customInstruction is required for custom_prompt mode." }, { status: 400 });
    }
    const { doc, forbidden } = await assertOwnedResume(body.docId, session.uid);
    if (forbidden) return forbidden;
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const selected = doc.sections.find((section) => section.id === body.sectionId);
    if (!selected) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    const original = sectionText(selected);
    const jobContext = await resolveJobDescription({
      ownerId: session.uid,
      jobId: body.jobId,
      pastedJobDescription: body.pastedJobDescription
    });

    const prompt = [
      `Document title: ${doc.title}`,
      `Section kind: ${selected.kind}`,
      `Mode: ${body.mode}`,
      body.language ? `Language: ${body.language}` : "",
      body.mode === "custom_prompt" && body.customInstruction ? `Custom instruction: ${body.customInstruction}` : "",
      "",
      "Current content:",
      original || "(empty)",
      "",
      jobContext ? `Target job description:\n${jobContext.jobDescription}` : ""
    ]
      .filter(Boolean)
      .join("\n");

    const structured = await generateStructuredAi({
      system: [
        "You are a senior resume writing assistant.",
        buildModeInstruction(body.mode),
        "Return strict JSON only with shape: {\"summary\"?:string,\"bullets\"?:string[],\"coverLetter\"?:string}.",
        "Use summary for paragraph rewrites, bullets for bullet rewrites, and coverLetter only for cover letter mode.",
        body.options?.grammar === false ? "Do not over-correct grammar beyond factual wording." : "Fix grammatical issues when needed.",
        body.options?.readability === false ? "Keep original sentence structure where possible." : "Prefer concise, readable lines.",
        body.options?.recommendations === false ? "Return just the rewritten text with no extra suggestions." : "Prioritize actionable, ATS-friendly phrasing.",
        "Keep the same language unless asked otherwise.",
        "Do not invent facts or employers."
      ].join("\n"),
      user: prompt,
      temperature: body.mode === "fix_grammar" ? 0.1 : 0.35,
      maxTokens: 1200,
      modelOverride: body.modelOverride,
      schema: outputContractSchema
    });

    const suggestion =
      structured.data.coverLetter ||
      structured.data.summary ||
      (structured.data.bullets?.length ? structured.data.bullets.join("\n") : "") ||
      "";

    if (!suggestion.trim()) {
      return NextResponse.json({ error: "AI returned an empty rewrite contract." }, { status: 422 });
    }

    if (body.strictTruthfulness) {
      const truthfulness = validateNoFabricatedClaims({
        sourceResumeText: resumeToPlainText(doc),
        jobDescription: jobContext?.jobDescription,
        generatedText: suggestion
      });

      if (!truthfulness.isValid) {
        return NextResponse.json(
          {
            error: "Generated text failed strict truthfulness validation.",
            violations: truthfulness.addedClaims.slice(0, 12)
          },
          { status: 422 }
        );
      }
    }

    await writeAdminAuditLog(
      {
        module: "resume-studio",
        action: "ai_improve",
        targetType: "resumeDocument",
        targetId: doc.id,
        summary: `AI improve ${body.mode} for ${doc.title}`,
        metadata: {
          mode: body.mode,
          sectionId: body.sectionId,
          sectionKind: selected.kind,
          hasJobContext: Boolean(jobContext),
          modelUsed: structured.modelUsed,
          fallbackUsed: structured.fallbackUsed,
          strictTruthfulness: body.strictTruthfulness
        }
      },
      session,
      requestContext
    );

    return NextResponse.json({
      suggestion,
      original,
      sectionId: selected.id,
      sectionKind: selected.kind,
      mode: body.mode,
      modelUsed: structured.modelUsed,
      fallbackUsed: structured.fallbackUsed,
      contract: structured.data,
      diff: buildLineDiff(original, suggestion)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to improve text";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
