import "server-only";

import type { NextRequest } from "next/server";

import type { ResumeDocumentRecord } from "@/types/resume-studio";
import { renderResumePdf } from "@/lib/resume-studio/pdf";

type PdfRendererMode = "auto" | "chromium" | "pdf-lib";

type RenderFromPrintInput = {
  request: NextRequest;
  doc: ResumeDocumentRecord;
};

export type RenderResumePdfOutput = {
  buffer: Buffer;
  rendererUsed: "chromium" | "pdf-lib";
  fallbackUsed: boolean;
};

function resolveRendererMode(): PdfRendererMode {
  const raw = (process.env.RESUME_EXPORT_RENDERER ?? "auto").toLowerCase();
  if (raw === "chromium") return "chromium";
  if (raw === "pdf-lib") return "pdf-lib";
  return "auto";
}

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/g, "");
}

function resolveOrigin(request: NextRequest) {
  const explicit = process.env.RESUME_EXPORT_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && explicit.trim()) {
    return trimTrailingSlashes(explicit.trim());
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  if (host) {
    return `${protocol}://${host}`;
  }

  return "";
}

function resolvePrintUrl(request: NextRequest, docId: string) {
  const origin = resolveOrigin(request);
  if (!origin) return "";
  return `${origin}/admin/resume-studio/${encodeURIComponent(docId)}/print?mode=export`;
}

async function renderWithChromium(input: RenderFromPrintInput) {
  const printUrl = resolvePrintUrl(input.request, input.doc.id);
  if (!printUrl) {
    throw new Error("Unable to resolve print URL for export.");
  }

  const cookie = input.request.headers.get("cookie") || "";

  const puppeteerModule = await import("puppeteer-core");
  const chromiumModule = await import("@sparticuz/chromium");

  const puppeteer = ("default" in puppeteerModule ? puppeteerModule.default : puppeteerModule) as {
    launch: (options: Record<string, unknown>) => Promise<{
      newPage: () => Promise<{
        setExtraHTTPHeaders: (headers: Record<string, string>) => Promise<void>;
        goto: (url: string, options: { waitUntil: "networkidle0"; timeout: number }) => Promise<unknown>;
        emulateMediaType: (type: "print" | "screen") => Promise<void>;
        pdf: (options: Record<string, unknown>) => Promise<Uint8Array>;
      }>;
      close: () => Promise<void>;
    }>;
  };

  const chromium = ("default" in chromiumModule ? chromiumModule.default : chromiumModule) as {
    executablePath: () => Promise<string>;
    args: string[];
  };

  const executablePath = await chromium.executablePath();
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: true
  });

  try {
    const page = await browser.newPage();
    if (cookie) {
      await page.setExtraHTTPHeaders({ cookie });
    }

    await page.goto(printUrl, { waitUntil: "networkidle0", timeout: 45_000 });
    await page.emulateMediaType("print");

    const pdfBytes = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      format: "a4",
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0"
      }
    });

    return Buffer.from(pdfBytes);
  } finally {
    await browser.close();
  }
}

export async function renderResumePdfOnDemand(input: RenderFromPrintInput) {
  const renderer = resolveRendererMode();

  if (renderer === "pdf-lib") {
    return {
      buffer: await renderResumePdf(input.doc),
      rendererUsed: "pdf-lib" as const,
      fallbackUsed: false
    } satisfies RenderResumePdfOutput;
  }

  try {
    return {
      buffer: await renderWithChromium(input),
      rendererUsed: "chromium" as const,
      fallbackUsed: false
    } satisfies RenderResumePdfOutput;
  } catch (error) {
    if (renderer === "chromium") {
      throw error;
    }
    return {
      buffer: await renderResumePdf(input.doc),
      rendererUsed: "pdf-lib" as const,
      fallbackUsed: true
    } satisfies RenderResumePdfOutput;
  }
}
