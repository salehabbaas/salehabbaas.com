import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateAiText, safeJsonParse } from "@/lib/resume-studio/ai";
import { ensureResumeStudioFlag } from "@/lib/resume-studio/flags";
import { buildQualityScan } from "@/lib/resume-studio/quality";
import { assertOwnedResume, requireAdminUser } from "@/lib/resume-studio/server";
import type { ResumeQualityResult } from "@/types/resume-studio";

export const runtime = "nodejs";

const schema = z.object({
  docId: z.string().trim().min(1),
  includeAi: z.boolean().default(false)
});

async function buildAiSuggestions(input: { text: string; includeAi: boolean }) {
  if (!input.includeAi) return [] as string[];
  if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) return [] as string[];

  try {
    const raw = await generateAiText({
      system: [
        "You are a resume proofreader.",
        "Return strict JSON only in shape: {\"suggestions\":[\"...\"]}.",
        "Focus on spelling, grammar and readability. Keep suggestions short and actionable."
      ].join("\n"),
      user: input.text,
      temperature: 0.15,
      maxTokens: 320
    });
    const parsed = safeJsonParse<{ suggestions?: string[] }>(raw);
    if (!parsed?.suggestions || !Array.isArray(parsed.suggestions)) return [] as string[];
    return parsed.suggestions.map((item) => item.trim()).filter(Boolean).slice(0, 8);
  } catch {
    return [] as string[];
  }
}

export async function POST(request: NextRequest) {
  const sessionResult = await requireAdminUser();
  if (sessionResult.unauthorized) return sessionResult.unauthorized;
  const featureBlocked = await ensureResumeStudioFlag("resumeStudioV2Enabled", "Resume Studio v2 is not enabled.");
  if (featureBlocked) return featureBlocked;
  const session = sessionResult.user;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = schema.parse(await request.json());
    const { doc, forbidden } = await assertOwnedResume(body.docId, session.uid);
    if (forbidden) return forbidden;
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const quality: ResumeQualityResult = buildQualityScan(doc);
    quality.aiSuggestions = await buildAiSuggestions({
      text: `${doc.title}\n${doc.sections.map((section) => JSON.stringify(section.data)).join("\n")}`,
      includeAi: body.includeAi
    });
    quality.scannedAt = new Date().toISOString();

    return NextResponse.json(quality);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to scan quality";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
