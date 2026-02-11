import { NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenAI, type Content } from "@google/genai";

import { safeCertificates, safeExperiences, safeProfile, safeProjects, safeServices } from "@/lib/firestore/site-public";

export const runtime = "nodejs";

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000)
      })
    )
    .min(1)
    .max(24),
  page: z.string().trim().max(200).optional()
});

function toContents(messages: Array<{ role: "user" | "assistant"; content: string }>): Content[] {
  return messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }]
  }));
}

function buildSystemInstruction(input: {
  profile: Awaited<ReturnType<typeof safeProfile>>;
  experiences: Awaited<ReturnType<typeof safeExperiences>>;
  projects: Awaited<ReturnType<typeof safeProjects>>;
  services: Awaited<ReturnType<typeof safeServices>>;
  certificates: Awaited<ReturnType<typeof safeCertificates>>;
}) {
  const profile = input.profile;
  const experiences = input.experiences.map((item) => ({
    company: item.company,
    role: item.role,
    startDate: item.startDate,
    endDate: item.endDate,
    summary: item.summary,
    achievements: item.achievements
  }));
  const projects = input.projects.map((item) => ({
    title: item.title,
    description: item.description,
    tags: item.tags,
    url: item.projectUrl || undefined
  }));

  const services = input.services.map((item) => item.title);
  const certificates = input.certificates.map((item) => ({
    title: item.title,
    issuer: item.issuer,
    year: item.year
  }));

  const resumeContext = {
    profile: {
      name: profile.name,
      headline: profile.headline,
      bio: profile.bio,
      location: profile.location,
      email: profile.email,
      resumeUrl: profile.resumeUrl
    },
    experiences,
    projects,
    services,
    certificates
  };

  return [
    "You are Saleh Abbaas' portfolio assistant ('Saleh-OS 2.0').",
    "You speak in first person as Saleh, in a professional engineering tone.",
    "Primary goal: help recruiters and engineers quickly understand my experience, strengths, and impact in healthcare interoperability (HL7/FHIR) and clinical data platforms.",
    "Rules:",
    "- Use ONLY the resume context below for factual claims about my history (dates, employers, titles, metrics). If unsure or not present, say you don't have that detail.",
    "- You may explain general concepts (HL7/FHIR, integration patterns, reliability) without inventing personal history.",
    "- Be concise by default; use bullet points for multi-part answers.",
    "- If the user asks for private info (API keys, secrets), refuse and suggest contacting me via the site.",
    "",
    "Resume context (authoritative):",
    JSON.stringify(resumeContext, null, 2)
  ].join("\n");
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Saleh-OS is not configured. Missing GEMINI_API_KEY (or GOOGLE_API_KEY) server environment variable." },
      { status: 503 }
    );
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  try {
    const body = await request.json();
    const input = requestSchema.parse(body);

    const [profile, experiences, projects, services, certificates] = await Promise.all([
      safeProfile(),
      safeExperiences(),
      safeProjects({ publishedOnly: true }),
      safeServices(),
      safeCertificates()
    ]);

    const systemInstruction = buildSystemInstruction({ profile, experiences, projects, services, certificates });

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: toContents(input.messages),
      config: {
        systemInstruction,
        temperature: 0.25,
        maxOutputTokens: 800
      }
    });

    const text = response.text?.trim() || "";
    if (!text) {
      return NextResponse.json({ error: "Model returned an empty response." }, { status: 502 });
    }

    return NextResponse.json({
      text,
      model: response.modelVersion || model
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Unable to process request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
