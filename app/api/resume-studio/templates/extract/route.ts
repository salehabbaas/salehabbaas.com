import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getAdminRequestContext } from "@/lib/admin/request-context";
import { adminDb, adminStorage } from "@/lib/firebase/admin";
import { generateAiText, safeJsonParse } from "@/lib/resume-studio/ai";
import { getBuiltInTemplateById } from "@/lib/resume-studio/defaults";
import { ensureResumeStudioFlag } from "@/lib/resume-studio/flags";
import { RESUME_STUDIO_SCHEMA_VERSION, resolveMarginBox } from "@/lib/resume-studio/normalize";
import { requireAdminUser } from "@/lib/resume-studio/server";
import type { ResumeTemplateRecord } from "@/types/resume-studio";

export const runtime = "nodejs";

const schema = z.object({
  storagePath: z.string().trim().min(1),
  templateName: z.string().trim().min(2).max(120),
  notes: z.string().trim().max(3000).optional()
});

type PdfSummary = {
  numPages: number;
  pageSizes: Array<{ width: number; height: number }>;
  textSnippets: string[];
};

async function summarizePdf(buffer: Buffer): Promise<PdfSummary> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  const maxPages = Math.min(2, pdf.numPages);
  const pageSizes: Array<{ width: number; height: number }> = [];
  const snippets: string[] = [];

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    pageSizes.push({ width: viewport.width, height: viewport.height });

    const textContent = await page.getTextContent();
    const chunk = textContent.items
      .map((item) => ("str" in item ? String(item.str).trim() : ""))
      .filter(Boolean)
      .slice(0, 140)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    snippets.push(chunk.slice(0, 1600));
  }

  return {
    numPages: pdf.numPages,
    pageSizes,
    textSnippets: snippets
  };
}

function fallbackTemplate(ownerId: string, name: string) {
  const base = getBuiltInTemplateById("classic-single-column");
  return {
    ...base,
    ownerId,
    name,
    paper: {
      ...base.paper,
      size: "A4"
    },
    source: "pdf_extracted" as const,
    previewImagePath: ""
  };
}

export async function POST(request: NextRequest) {
  const sessionResult = await requireAdminUser();
  if (sessionResult.unauthorized) return sessionResult.unauthorized;
  const v2Blocked = await ensureResumeStudioFlag("resumeStudioV2Enabled", "Resume Studio v2 is not enabled.");
  if (v2Blocked) return v2Blocked;
  const builderBlocked = await ensureResumeStudioFlag(
    "resumeAdvancedTemplateBuilderEnabled",
    "Advanced template builder is not enabled."
  );
  if (builderBlocked) return builderBlocked;
  const session = sessionResult.user;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestContext = getAdminRequestContext(request);

  try {
    const body = schema.parse(await request.json());
    const expectedPrefix = `resume-template-imports/${session.uid}/`;

    if (!body.storagePath.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "Invalid storage path for current owner." }, { status: 400 });
    }

    const file = adminStorage.bucket().file(body.storagePath);
    const [buffer] = await file.download();

    const pdfSummary = await summarizePdf(buffer);
    let extractedTemplate: ResumeTemplateRecord | null = null;

    try {
      const aiRaw = await generateAiText({
        system: [
          "You infer a resume template schema from PDF summary data.",
          "Return strict JSON only.",
          "Schema keys: category, paper, layout, styleTokens, constraints.",
          "layout must include: grid, regions, pageBreak.",
          "regions items must include: region, columns, gap, sectionSlots.",
          "Use common resume sections only."
        ].join("\n"),
        user: JSON.stringify(
          {
            templateName: body.templateName,
            notes: body.notes ?? "",
            pdfSummary
          },
          null,
          2
        ),
        temperature: 0.2,
        maxTokens: 1400
      });

      const parsed = safeJsonParse<Partial<ResumeTemplateRecord>>(aiRaw);
      if (parsed?.layout && parsed?.styleTokens && parsed?.constraints) {
        extractedTemplate = {
          id: "",
          ownerId: session.uid,
          schemaVersion: RESUME_STUDIO_SCHEMA_VERSION,
          name: body.templateName,
          category: (parsed.category as ResumeTemplateRecord["category"]) || "single_column",
          previewImagePath: "",
          paper: {
            size: "A4",
            defaultMargins: Number(parsed.paper?.defaultMargins ?? 22),
            defaultMarginBox: resolveMarginBox({
              marginBox: parsed.paper?.defaultMarginBox,
              margins: parsed.paper?.defaultMargins,
              fallback: 22
            })
          },
          layout: {
            grid: {
              columns: String(parsed.layout.grid.columns ?? "1fr"),
              rows: String(parsed.layout.grid.rows ?? "auto 1fr auto"),
              gap: Number(parsed.layout.grid.gap ?? 14)
            },
            regions: Array.isArray(parsed.layout.regions) ? parsed.layout.regions : [],
            pageBreak: {
              minLinesPerBlock: Number(parsed.layout.pageBreak?.minLinesPerBlock ?? 3),
              avoidSplitKinds: Array.isArray(parsed.layout.pageBreak?.avoidSplitKinds) ? parsed.layout.pageBreak.avoidSplitKinds : [],
              preferSplitKinds: Array.isArray(parsed.layout.pageBreak?.preferSplitKinds) ? parsed.layout.pageBreak.preferSplitKinds : []
            }
          },
          styleTokens: {
            fonts: {
              heading: String(parsed.styleTokens.fonts?.heading ?? "Arimo"),
              body: String(parsed.styleTokens.fonts?.body ?? "Arimo")
            },
            sizes: {
              title: Number(parsed.styleTokens.sizes?.title ?? 30),
              heading: Number(parsed.styleTokens.sizes?.heading ?? 12),
              body: Number(parsed.styleTokens.sizes?.body ?? 10.5),
              small: Number(parsed.styleTokens.sizes?.small ?? 9)
            },
            colors: {
              text: String(parsed.styleTokens.colors?.text ?? "#111827"),
              accent: String(parsed.styleTokens.colors?.accent ?? "#2563eb"),
              muted: String(parsed.styleTokens.colors?.muted ?? "#475569"),
              background: String(parsed.styleTokens.colors?.background ?? "#ffffff")
            },
            spacing: {
              section: Number(parsed.styleTokens.spacing?.section ?? 12),
              item: Number(parsed.styleTokens.spacing?.item ?? 8),
              line: Number(parsed.styleTokens.spacing?.line ?? 1.35)
            },
            borderRadius: Number(parsed.styleTokens.borderRadius ?? 8),
            iconStyle: (parsed.styleTokens.iconStyle as ResumeTemplateRecord["styleTokens"]["iconStyle"]) || "none"
          },
          constraints: {
            atsFriendly: Boolean(parsed.constraints.atsFriendly),
            supportsTwoColumn: Boolean(parsed.constraints.supportsTwoColumn),
            supportsPhoto: Boolean(parsed.constraints.supportsPhoto)
          },
          source: "pdf_extracted"
        };
      }
    } catch {
      extractedTemplate = null;
    }

    const template = extractedTemplate ?? fallbackTemplate(session.uid, body.templateName);

    const templateRef = adminDb.collection("resumeTemplates").doc();
    await templateRef.set({
      ownerId: session.uid,
      schemaVersion: RESUME_STUDIO_SCHEMA_VERSION,
      name: template.name,
      category: template.category,
      previewImagePath: "",
      paper: template.paper,
      layout: template.layout,
      styleTokens: template.styleTokens,
      constraints: template.constraints,
      source: "pdf_extracted",
      importSourcePath: body.storagePath,
      importNotes: body.notes ?? "",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await writeAdminAuditLog(
      {
        module: "resume-studio",
        action: "template_import_pdf",
        targetType: "resumeTemplate",
        targetId: templateRef.id,
        summary: `Imported template draft from PDF: ${body.templateName}`,
        metadata: {
          storagePath: body.storagePath,
          pageCount: pdfSummary.numPages,
          inferredPaper: template.paper.size,
          aiExtracted: Boolean(extractedTemplate)
        }
      },
      session,
      requestContext
    );

    return NextResponse.json({
      templateId: templateRef.id,
      warning: extractedTemplate ? "" : "AI extraction returned partial data. A fallback layout was applied and needs manual refinement."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to extract template";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
