import "server-only";

import type { ResumeDocumentRecord } from "@/types/resume-studio";
import { resumeRichTextDocToHtml } from "@/lib/resume-studio/editor-v2/content";
import {
  docxBufferToResumeRichTextDoc,
  htmlToMarkdown,
  markdownToResumeRichTextDoc,
  resumeRichTextDocToDocxBuffer,
  resumeRichTextDocToMarkdown,
  sanitizeImportedHtml
} from "@/lib/resume-studio/editor-v2/serialize";
import { resumeRichTextDocToPlainText } from "@/lib/resume-studio/editor-v2/content";
import { renderResumePdf, resumeToText } from "@/lib/resume-studio/pdf";

export type ExportFormat = "html" | "markdown" | "docx" | "pdf" | "txt";
export type ImportFormat = "html" | "markdown" | "docx" | "txt";

function flattenDocToSingleContent(doc: ResumeDocumentRecord) {
  const blocks = doc.sections.flatMap((section) => section.contentDoc?.content ?? []);
  return {
    type: "doc" as const,
    content: blocks
  };
}

export async function exportDocument(input: { format: ExportFormat; doc: ResumeDocumentRecord; fidelityMode?: "semantic" | "visual" }) {
  void input.fidelityMode;
  const rich = flattenDocToSingleContent(input.doc);

  if (input.format === "html") {
    return {
      contentType: "text/html; charset=utf-8",
      fileExtension: "html",
      body: resumeRichTextDocToHtml(rich)
    };
  }

  if (input.format === "markdown") {
    return {
      contentType: "text/markdown; charset=utf-8",
      fileExtension: "md",
      body: resumeRichTextDocToMarkdown(rich)
    };
  }

  if (input.format === "docx") {
    return {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileExtension: "docx",
      body: await resumeRichTextDocToDocxBuffer(rich, input.doc.title)
    };
  }

  if (input.format === "txt") {
    return {
      contentType: "text/plain; charset=utf-8",
      fileExtension: "txt",
      body: resumeToText(input.doc)
    };
  }

  return {
    contentType: "application/pdf",
    fileExtension: "pdf",
    body: await renderResumePdf(input.doc)
  };
}

export async function importDocument(input: {
  format: ImportFormat;
  content: string | Buffer;
  options?: { sanitize?: boolean };
}) {
  const sanitize = input.options?.sanitize !== false;

  if (input.format === "docx") {
    if (!Buffer.isBuffer(input.content)) {
      throw new Error("DOCX import requires binary content.");
    }
    return await docxBufferToResumeRichTextDoc(input.content);
  }

  const raw = typeof input.content === "string" ? input.content : input.content.toString("utf-8");

  if (input.format === "markdown") {
    return await markdownToResumeRichTextDoc(raw);
  }

  if (input.format === "txt") {
    return await markdownToResumeRichTextDoc(raw);
  }

  const html = sanitize ? sanitizeImportedHtml(raw) : raw;
  return await markdownToResumeRichTextDoc(await htmlToMarkdown(html));
}

export async function convertImportPayload(input: { format: ImportFormat; content: string | Buffer }) {
  const doc = await importDocument({ ...input, options: { sanitize: true } });
  return {
    doc,
    html: resumeRichTextDocToHtml(doc),
    markdown: resumeRichTextDocToMarkdown(doc),
    plainText: resumeRichTextDocToPlainText(doc)
  };
}
