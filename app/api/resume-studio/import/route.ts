import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { adminDb, adminStorage } from "@/lib/firebase/admin";
import { writeResumeActivity } from "@/lib/firestore/resume-studio";
import { generateStructuredAi } from "@/lib/resume-studio/ai";
import { createDefaultResumeDocument, createSection, createStableId, getBuiltInTemplateById } from "@/lib/resume-studio/defaults";
import { ensureResumeStudioFlag } from "@/lib/resume-studio/flags";
import { RESUME_STUDIO_SCHEMA_VERSION, resolveMarginBox } from "@/lib/resume-studio/normalize";
import { requireAdminUser } from "@/lib/resume-studio/server";
import type { ResumeDocumentRecord, ResumeSectionBlock, ResumeSectionKind, ResumeTemplateCategory } from "@/types/resume-studio";

export const runtime = "nodejs";

const resumeSectionKinds = [
  "header",
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "languages",
  "volunteering",
  "interests",
  "publications",
  "research",
  "awards",
  "custom"
] as const;

const schema = z.object({
  storagePath: z.string().trim().min(1),
  title: z.string().trim().min(2).max(140).optional(),
  importTemplate: z.boolean().optional().default(true),
  originalFileName: z.string().trim().max(180).optional()
});

const sectionKindSchema = z.enum(resumeSectionKinds);

const importedResumeSchema = z.object({
  fullName: z.string().trim().max(120).default(""),
  headline: z.string().trim().max(180).default(""),
  email: z.string().trim().max(120).default(""),
  phone: z.string().trim().max(64).default(""),
  location: z.string().trim().max(120).default(""),
  summary: z.string().trim().max(3000).default(""),
  skills: z.array(z.string().trim().min(2).max(80)).max(40).default([]),
  languages: z.array(z.string().trim().min(2).max(60)).max(20).default([]),
  interests: z.array(z.string().trim().min(2).max(80)).max(20).default([]),
  experience: z
    .array(
      z.object({
        company: z.string().trim().max(160).default(""),
        role: z.string().trim().max(160).default(""),
        location: z.string().trim().max(120).default(""),
        startDate: z.string().trim().max(40).default(""),
        endDate: z.string().trim().max(40).default(""),
        bullets: z.array(z.string().trim().min(2).max(300)).max(12).default([])
      })
    )
    .max(12)
    .default([]),
  education: z
    .array(
      z.object({
        school: z.string().trim().max(160).default(""),
        degree: z.string().trim().max(160).default(""),
        startDate: z.string().trim().max(40).default(""),
        endDate: z.string().trim().max(40).default(""),
        details: z.string().trim().max(300).default("")
      })
    )
    .max(10)
    .default([]),
  projects: z
    .array(
      z.object({
        name: z.string().trim().max(160).default(""),
        link: z.string().trim().max(220).default(""),
        description: z.string().trim().max(300).default(""),
        bullets: z.array(z.string().trim().min(2).max(300)).max(8).default([])
      })
    )
    .max(8)
    .default([]),
  awards: z
    .array(
      z.object({
        title: z.string().trim().max(160).default(""),
        issuer: z.string().trim().max(160).default(""),
        year: z.string().trim().max(40).default("")
      })
    )
    .max(12)
    .default([]),
  customSections: z
    .array(
      z.object({
        title: z.string().trim().max(120).default("Custom Section"),
        text: z.string().trim().max(2600).default("")
      })
    )
    .max(6)
    .default([]),
  sectionOrder: z.array(sectionKindSchema).max(30).default([]),
  layoutHint: z.enum(["single_column", "two_column"]).default("single_column")
});

const templateInferenceSchema = z.object({
  name: z.string().trim().min(3).max(120).optional(),
  category: z.enum(["single_column", "two_column", "sidebar", "compact", "executive", "modern", "academic"] as const).default("single_column"),
  supportsTwoColumn: z.boolean().default(false),
  gridColumns: z.string().trim().max(20).default("1fr"),
  defaultMargins: z.number().min(12).max(36).default(22),
  sectionSpacing: z.number().min(8).max(24).default(12),
  lineHeight: z.number().min(1.1).max(1.9).default(1.35),
  colors: z
    .object({
      text: z.string().trim().default("#111827"),
      accent: z.string().trim().default("#2563eb"),
      background: z.string().trim().default("#ffffff")
    })
    .default({ text: "#111827", accent: "#2563eb", background: "#ffffff" }),
  fonts: z
    .object({
      heading: z.string().trim().max(60).default("Arial"),
      body: z.string().trim().max(60).default("Arial")
    })
    .default({ heading: "Arial", body: "Arial" })
});

type PdfSummary = {
  text: string;
  numPages: number;
  pageSizes: Array<{ width: number; height: number }>;
  textSnippets: string[];
  twoColumnLikely: boolean;
  dominantFont: string;
};

const FONT_FALLBACKS = [
  "Arial",
  "Calibri",
  "Inter",
  "Arimo",
  "Helvetica",
  "Verdana",
  "Georgia",
  "Times New Roman",
  "Merriweather",
  "Source Sans Pro",
  "Poppins",
  "Lato",
  "Roboto",
  "Cambria"
] as const;

function normalizeTemplateFont(input: string, fallback = "Arial") {
  const candidate = input.replace(/['"]/g, "").trim();
  if (!candidate) return fallback;
  const found = FONT_FALLBACKS.find((font) => font.toLowerCase() === candidate.toLowerCase());
  if (found) return found;

  const lowered = candidate.toLowerCase();
  if (lowered.includes("arial")) return "Arial";
  if (lowered.includes("calibri")) return "Calibri";
  if (lowered.includes("helvetica")) return "Helvetica";
  if (lowered.includes("verdana")) return "Verdana";
  if (lowered.includes("georgia")) return "Georgia";
  if (lowered.includes("times")) return "Times New Roman";
  if (lowered.includes("cambria")) return "Cambria";
  if (lowered.includes("roboto")) return "Roboto";
  if (lowered.includes("inter")) return "Inter";
  if (lowered.includes("lato")) return "Lato";
  if (lowered.includes("poppins")) return "Poppins";
  return fallback;
}

function normalizeHexColor(input: string, fallback: string) {
  const value = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const r = value[1];
    const g = value[2];
    const b = value[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
}

function fallbackSummary(sourceText: string) {
  return sourceText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 5)
    .join(" ")
    .slice(0, 1200);
}

function fallbackHeader(sourceText: string) {
  const lines = sourceText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const firstLine = lines.find((line) => line.length >= 4 && line.length <= 80) ?? "";
  const emailMatch = sourceText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = sourceText.match(/(\+?\d[\d\s().-]{7,}\d)/);

  return {
    fullName: firstLine,
    email: emailMatch?.[0] ?? "",
    phone: phoneMatch?.[0] ?? ""
  };
}

function sanitizeImportTitle(input: string) {
  return input.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function ensureSection(sections: ResumeSectionBlock[], kind: ResumeSectionKind) {
  const existing = sections.find((section) => section.kind === kind);
  if (existing) return existing;
  const created = createSection(kind);
  sections.push(created);
  return created;
}

function hasMeaningfulCustom(section: ResumeSectionBlock) {
  const data = section.data as Record<string, unknown>;
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const text = typeof data.text === "string" ? data.text.trim() : "";
  return Boolean(title || text);
}

function reorderSections(sections: ResumeSectionBlock[], preferredOrder: ResumeSectionKind[]) {
  const customSections = sections.filter((section) => section.kind === "custom");
  const nonCustom = sections.filter((section) => section.kind !== "custom");
  const byKind = new Map<ResumeSectionKind, ResumeSectionBlock>();
  for (const section of nonCustom) {
    if (!byKind.has(section.kind)) byKind.set(section.kind, section);
  }

  const result: ResumeSectionBlock[] = [];
  const pushedKinds = new Set<ResumeSectionKind>();

  for (const kind of preferredOrder) {
    if (kind === "custom") continue;
    const section = byKind.get(kind);
    if (!section) continue;
    result.push(section);
    pushedKinds.add(kind);
  }

  for (const section of nonCustom) {
    if (pushedKinds.has(section.kind)) continue;
    result.push(section);
    pushedKinds.add(section.kind);
  }

  if (preferredOrder.includes("custom")) {
    const customIndex = preferredOrder.indexOf("custom");
    const anchorKind = preferredOrder[customIndex - 1];
    if (anchorKind && anchorKind !== "custom") {
      const anchorIndex = result.findIndex((section) => section.kind === anchorKind);
      if (anchorIndex >= 0) {
        result.splice(anchorIndex + 1, 0, ...customSections);
        return result;
      }
    }
  }

  result.push(...customSections);
  return result;
}

async function summarizePdf(buffer: Buffer): Promise<PdfSummary> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  const pagesToScan = Math.min(pdf.numPages, 6);
  const pageSizes: Array<{ width: number; height: number }> = [];
  const textSnippets: string[] = [];
  const allTextChunks: string[] = [];

  const fontCounts = new Map<string, number>();
  let leftAlignedTokens = 0;
  let rightAlignedTokens = 0;

  for (let pageNumber = 1; pageNumber <= pagesToScan; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    pageSizes.push({ width: viewport.width, height: viewport.height });

    const textContent = await page.getTextContent();
    const styles = textContent.styles as Record<string, { fontFamily?: string }>;

    const words: string[] = [];
    const width = viewport.width || 595;

    for (const item of textContent.items as Array<Record<string, unknown>>) {
      if (!("str" in item)) continue;
      const raw = String(item.str ?? "").trim();
      if (!raw) continue;
      words.push(raw);

      const transform = Array.isArray(item.transform) ? (item.transform as number[]) : [];
      const x = Number(transform[4] ?? 0);
      if (x <= width * 0.46) leftAlignedTokens += 1;
      if (x >= width * 0.57) rightAlignedTokens += 1;

      const fontName = String(item.fontName ?? "").trim();
      const styleFont = fontName && styles[fontName]?.fontFamily ? String(styles[fontName].fontFamily) : fontName;
      if (styleFont) {
        fontCounts.set(styleFont, (fontCounts.get(styleFont) ?? 0) + 1);
      }
    }

    const pageText = words.join(" ").replace(/\s+/g, " ").trim();
    if (pageText) {
      allTextChunks.push(pageText);
      textSnippets.push(pageText.slice(0, 1600));
    }
  }

  const dominantFont = [...fontCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Arial";
  const twoColumnLikely = leftAlignedTokens > 120 && rightAlignedTokens > 45;

  return {
    text: allTextChunks.join("\n").trim(),
    numPages: pdf.numPages,
    pageSizes,
    textSnippets,
    twoColumnLikely,
    dominantFont: normalizeTemplateFont(dominantFont)
  };
}

async function extractImportedContent(storagePath: string) {
  const file = adminStorage.bucket().file(storagePath);
  const [buffer] = await file.download();
  const extension = storagePath.toLowerCase().split(".").pop() || "";

  if (extension === "txt" || extension === "md") {
    const text = buffer.toString("utf8").replace(/\r\n/g, "\n").trim();
    return {
      extension,
      sourceText: text,
      pdfSummary: null as PdfSummary | null
    };
  }

  const pdfSummary = await summarizePdf(buffer);
  return {
    extension,
    sourceText: pdfSummary.text,
    pdfSummary
  };
}

async function parseResumeWithAi(sourceText: string) {
  const ai = await generateStructuredAi({
    system: [
      "You are a strict resume parser.",
      "Extract resume content into the provided JSON schema with high precision.",
      "Map each line to the most accurate section.",
      "Preserve facts exactly and do not fabricate missing details.",
      "If uncertain, keep fields empty instead of guessing.",
      "Set sectionOrder to reflect the source resume visual/reading order."
    ].join("\n"),
    user: sourceText.slice(0, 18000),
    temperature: 0.15,
    maxTokens: 2200,
    schema: importedResumeSchema
  });
  return importedResumeSchema.parse(ai.data);
}

async function getExistingImportedTemplate(ownerId: string, storagePath: string) {
  const snap = await adminDb.collection("resumeTemplates").where("importSourcePath", "==", storagePath).limit(10).get();
  const match = snap.docs.find((doc) => String(doc.data().ownerId ?? "") === ownerId);
  return match?.id ?? null;
}

async function inferAndCreateTemplate(input: {
  ownerId: string;
  storagePath: string;
  sourceText: string;
  pdfSummary: PdfSummary;
  titleHint: string;
  structuredLayoutHint: "single_column" | "two_column";
}) {
  const existingTemplateId = await getExistingImportedTemplate(input.ownerId, input.storagePath);
  if (existingTemplateId) return existingTemplateId;

  let inferred: z.infer<typeof templateInferenceSchema> | null = null;
  try {
    const ai = await generateStructuredAi({
      system: [
        "Infer a resume template from PDF analysis.",
        "Return strict JSON only.",
        "Keep ATS-friendly defaults unless the PDF clearly indicates otherwise.",
        "Use practical grid columns like 1fr or 1.8fr 1fr."
      ].join("\n"),
      user: JSON.stringify(
        {
          titleHint: input.titleHint,
          pdfSummary: {
            numPages: input.pdfSummary.numPages,
            pageSizes: input.pdfSummary.pageSizes,
            textSnippets: input.pdfSummary.textSnippets,
            twoColumnLikely: input.pdfSummary.twoColumnLikely,
            dominantFont: input.pdfSummary.dominantFont
          },
          sourceTextSample: input.sourceText.slice(0, 5000),
          structuredLayoutHint: input.structuredLayoutHint
        },
        null,
        2
      ),
      temperature: 0.2,
      maxTokens: 1400,
      schema: templateInferenceSchema
    });
    inferred = templateInferenceSchema.parse(ai.data);
  } catch {
    inferred = null;
  }

  const useTwoColumn =
    inferred?.supportsTwoColumn === true ||
    inferred?.category === "two_column" ||
    inferred?.category === "sidebar" ||
    input.pdfSummary.twoColumnLikely ||
    input.structuredLayoutHint === "two_column";

  const base = getBuiltInTemplateById(useTwoColumn ? "two-column-professional" : "classic-single-column");
  const marginValue = Math.max(12, Math.min(36, Math.round(inferred?.defaultMargins ?? base.paper.defaultMargins ?? 22)));

  const nextTemplate = {
    ownerId: input.ownerId,
    schemaVersion: RESUME_STUDIO_SCHEMA_VERSION,
    name: inferred?.name || `${input.titleHint} Template`,
    category: (inferred?.category ?? (useTwoColumn ? "two_column" : "single_column")) as ResumeTemplateCategory,
    previewImagePath: "",
    paper: {
      size: "A4" as const,
      defaultMargins: marginValue,
      defaultMarginBox: resolveMarginBox({ margins: marginValue, fallback: marginValue })
    },
    layout: {
      ...base.layout,
      grid: {
        ...base.layout.grid,
        columns: useTwoColumn ? (inferred?.gridColumns || "1.8fr 1fr") : "1fr"
      }
    },
    styleTokens: {
      ...base.styleTokens,
      fonts: {
        heading: normalizeTemplateFont(inferred?.fonts.heading || input.pdfSummary.dominantFont || base.styleTokens.fonts.heading, "Arial"),
        body: normalizeTemplateFont(inferred?.fonts.body || input.pdfSummary.dominantFont || base.styleTokens.fonts.body, "Arial")
      },
      colors: {
        ...base.styleTokens.colors,
        text: normalizeHexColor(inferred?.colors.text || "", base.styleTokens.colors.text),
        accent: normalizeHexColor(inferred?.colors.accent || "", base.styleTokens.colors.accent),
        background: normalizeHexColor(inferred?.colors.background || "", base.styleTokens.colors.background)
      },
      spacing: {
        ...base.styleTokens.spacing,
        section: Math.max(8, Math.min(24, inferred?.sectionSpacing ?? base.styleTokens.spacing.section)),
        line: Math.max(1.1, Math.min(1.9, inferred?.lineHeight ?? base.styleTokens.spacing.line))
      }
    },
    constraints: {
      ...base.constraints,
      supportsTwoColumn: useTwoColumn
    },
    source: "pdf_extracted" as const,
    archived: false,
    importSourcePath: input.storagePath,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const templateRef = adminDb.collection("resumeTemplates").doc();
  await templateRef.set(nextTemplate);
  return templateRef.id;
}

function applyStructuredSections(
  payload: Omit<ResumeDocumentRecord, "id" | "createdAt" | "updatedAt">,
  structured: z.infer<typeof importedResumeSchema> | null,
  sourceText: string
) {
  const fallback = fallbackHeader(sourceText);
  const sections = [...payload.sections];

  const header = ensureSection(sections, "header");
  header.data = {
    ...(header.data as Record<string, unknown>),
    fullName: structured?.fullName || fallback.fullName,
    headline: structured?.headline || "",
    email: structured?.email || fallback.email,
    phone: structured?.phone || fallback.phone,
    location: structured?.location || ""
  };

  const summary = ensureSection(sections, "summary");
  summary.data = {
    ...(summary.data as Record<string, unknown>),
    text: structured?.summary || fallbackSummary(sourceText)
  };

  if (structured?.experience.length) {
    const experience = ensureSection(sections, "experience");
    experience.data = {
      ...(experience.data as Record<string, unknown>),
      items: structured.experience.map((item) => ({
        id: createStableId("exp"),
        company: item.company,
        role: item.role,
        location: item.location,
        startDate: item.startDate,
        endDate: item.endDate,
        bullets: item.bullets
      }))
    };
  }

  if (structured?.education.length) {
    const education = ensureSection(sections, "education");
    education.data = {
      ...(education.data as Record<string, unknown>),
      items: structured.education.map((item) => ({
        id: createStableId("edu"),
        school: item.school,
        degree: item.degree,
        startDate: item.startDate,
        endDate: item.endDate,
        details: item.details
      }))
    };
  }

  if (structured?.skills.length) {
    const skills = ensureSection(sections, "skills");
    skills.data = {
      ...(skills.data as Record<string, unknown>),
      items: structured.skills.map((entry) => ({
        id: createStableId("skill"),
        name: entry,
        level: ""
      }))
    };
  }

  if (structured?.projects.length) {
    const projects = ensureSection(sections, "projects");
    projects.data = {
      ...(projects.data as Record<string, unknown>),
      items: structured.projects.map((item) => ({
        id: createStableId("proj"),
        name: item.name,
        link: item.link,
        description: item.description,
        bullets: item.bullets
      }))
    };
  }

  if (structured?.languages.length) {
    const languages = ensureSection(sections, "languages");
    languages.data = {
      ...(languages.data as Record<string, unknown>),
      items: structured.languages
    };
  }

  if (structured?.interests.length) {
    const interests = ensureSection(sections, "interests");
    interests.data = {
      ...(interests.data as Record<string, unknown>),
      items: structured.interests
    };
  }

  if (structured?.awards.length) {
    const awards = ensureSection(sections, "awards");
    awards.data = {
      ...(awards.data as Record<string, unknown>),
      items: structured.awards.map((item) => ({
        id: createStableId("award"),
        title: item.title,
        issuer: item.issuer,
        year: item.year
      }))
    };
  }

  const customSections = sections.filter((section) => section.kind === "custom" && hasMeaningfulCustom(section));
  const generatedCustom =
    structured?.customSections
      .filter((entry) => entry.title.trim() || entry.text.trim())
      .map((entry) => ({
        ...createSection("custom"),
        data: {
          title: entry.title || "Custom Section",
          text: entry.text || ""
        }
      })) ?? [];

  const nonCustom = sections.filter((section) => section.kind !== "custom");
  const merged = [...nonCustom, ...customSections, ...generatedCustom];

  const preferredOrder =
    structured?.sectionOrder.filter((kind, index, arr) => arr.indexOf(kind) === index) ??
    ["header", "summary", "experience", "education", "skills", "projects", "languages", "awards", "interests", "custom"];

  payload.sections = reorderSections(merged, preferredOrder);
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
    const expectedPrefix = `resume-imports/${session.uid}/`;
    if (!body.storagePath.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "Invalid import path for current owner." }, { status: 400 });
    }

    const imported = await extractImportedContent(body.storagePath);
    if (!imported.sourceText || imported.sourceText.length < 80) {
      return NextResponse.json({ error: "Could not extract enough text from this file." }, { status: 422 });
    }

    let structured: z.infer<typeof importedResumeSchema> | null = null;
    try {
      structured = await parseResumeWithAi(imported.sourceText);
    } catch {
      structured = null;
    }

    const titleHint =
      body.title ||
      structured?.fullName ||
      sanitizeImportTitle(body.originalFileName || "") ||
      "Imported Resume";

    const payload = createDefaultResumeDocument({
      ownerId: session.uid,
      type: "resume",
      title: titleHint
    });

    applyStructuredSections(payload, structured, imported.sourceText);

    let templateIdUsed = payload.templateId;
    let templateImported = false;

    if (body.importTemplate && imported.pdfSummary) {
      try {
        const inferredTemplateId = await inferAndCreateTemplate({
          ownerId: session.uid,
          storagePath: body.storagePath,
          sourceText: imported.sourceText,
          pdfSummary: imported.pdfSummary,
          titleHint,
          structuredLayoutHint: structured?.layoutHint ?? "single_column"
        });

        if (inferredTemplateId) {
          const templateSnap = await adminDb.collection("resumeTemplates").doc(inferredTemplateId).get();
          if (templateSnap.exists) {
            const templateData = templateSnap.data() as Record<string, unknown>;
            const marginBox = resolveMarginBox({
              marginBox: templateData.paper && typeof templateData.paper === "object" ? (templateData.paper as Record<string, unknown>).defaultMarginBox : undefined,
              margins: templateData.paper && typeof templateData.paper === "object" ? (templateData.paper as Record<string, unknown>).defaultMargins : undefined,
              fallback: 22
            });

            payload.templateId = inferredTemplateId;
            payload.page.marginBox = marginBox;
            payload.page.margins = (marginBox.top + marginBox.right + marginBox.bottom + marginBox.left) / 4;

            const styleTokens = (templateData.styleTokens as Record<string, unknown>) || {};
            const spacing = (styleTokens.spacing as Record<string, unknown>) || {};
            const colors = (styleTokens.colors as Record<string, unknown>) || {};
            const fonts = (styleTokens.fonts as Record<string, unknown>) || {};

            payload.page.sectionSpacing = Number(spacing.section ?? payload.page.sectionSpacing);
            payload.style.primaryColor = String(colors.text ?? payload.style.primaryColor);
            payload.style.accentColor = String(colors.accent ?? payload.style.accentColor ?? payload.style.primaryColor);
            payload.style.background = String(colors.background ?? payload.style.background ?? "#ffffff");
            payload.style.fontFamily = normalizeTemplateFont(String(fonts.body ?? payload.style.fontFamily));
            payload.style.lineHeight = Number(spacing.line ?? payload.style.lineHeight);
            payload.style.inheritTemplateColors = true;
            payload.style.inheritTemplateFonts = true;

            templateIdUsed = inferredTemplateId;
            templateImported = true;
          }
        }
      } catch {
        // Template inference should never block resume import.
      }
    }

    const now = new Date();
    const docRef = adminDb.collection("resumeDocuments").doc();
    await docRef.set({
      ...payload,
      createdAt: now,
      updatedAt: now
    });

    await writeResumeActivity({
      ownerId: session.uid,
      entityType: "resumeDocument",
      entityId: docRef.id,
      action: "resume_imported"
    });

    await writeAdminAuditLog(
      {
        module: "resume-studio",
        action: "resume_import",
        targetType: "resumeDocument",
        targetId: docRef.id,
        summary: `Imported resume from file: ${body.storagePath}`,
        metadata: {
          storagePath: body.storagePath,
          sourceLength: imported.sourceText.length,
          aiParsed: Boolean(structured),
          templateImported,
          templateIdUsed,
          pdfTwoColumnLikely: imported.pdfSummary?.twoColumnLikely ?? false
        }
      },
      session,
      requestContext
    );

    return NextResponse.json({
      docId: docRef.id,
      aiParsed: Boolean(structured),
      templateImported,
      templateIdUsed
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to import resume";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
