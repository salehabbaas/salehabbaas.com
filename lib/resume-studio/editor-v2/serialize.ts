import "server-only";

import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from "docx";
import mammoth from "mammoth";
import TurndownService from "turndown";
import { marked } from "marked";

import { createResumeRichTextDoc, legacyHtmlToResumeRichTextDoc, normalizeResumeRichTextDoc } from "@/lib/resume-studio/editor-v2/content";
import type { ResumeRichTextDoc } from "@/types/resume-studio";

type RichTextNode = {
  type: string;
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  content?: RichTextNode[];
};

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced"
});

function inlineToMarkdown(node: RichTextNode) {
  const attrs = node.attrs ?? {};
  if (node.type === "hardBreak") return "  \n";
  if (node.type === "emoji") return (attrs.value as string) ?? "";
  if (node.type === "mention") return `@${(attrs.label as string) ?? ""}`;
  if (node.type === "tag") return `#${(attrs.value as string) ?? ""}`;
  if (node.type === "footnoteRef") return `[^${(attrs.id as string) ?? ""}]`;
  if (node.type === "bookmark") return (attrs.label as string) ?? (attrs.id as string) ?? "";
  if (node.type !== "text") return "";

  const marks = node.marks ?? [];
  let value = node.text;

  for (const mark of marks) {
    const markAttrs = mark.attrs ?? {};
    if (mark.type === "bold") value = `**${value}**`;
    else if (mark.type === "italic") value = `*${value}*`;
    else if (mark.type === "underline") value = `<u>${value}</u>`;
    else if (mark.type === "strike") value = `~~${value}~~`;
    else if (mark.type === "code") value = `\`${value}\``;
    else if (mark.type === "subscript") value = `<sub>${value}</sub>`;
    else if (mark.type === "superscript") value = `<sup>${value}</sup>`;
    else if (mark.type === "textColor") value = `<span style="color:${(markAttrs.color as string) ?? ""}">${value}</span>`;
    else if (mark.type === "highlight") value = `<mark>${value}</mark>`;
    else if (mark.type === "link") value = `[${value}](${(markAttrs.href as string) ?? ""})`;
  }

  return value;
}

function blockToMarkdown(block: RichTextNode, depth = 0): string {
  const indent = "  ".repeat(depth);
  switch (block.type) {
    case "paragraph":
      return `${indent}${(block.content ?? []).map((item) => inlineToMarkdown(item)).join("")}\n\n`;
    case "heading": {
      const blockAttrs = block.attrs ?? {};
      const rawLevel = (blockAttrs as { level?: number }).level;
      const level = Math.max(1, Math.min(6, Number(rawLevel ?? 2)));
      return `${"#".repeat(level)} ${(block.content ?? []).map((item) => inlineToMarkdown(item)).join("")}\n\n`;
    }
    case "bulletList":
      return `${(block.content ?? [])
        .map((item) => {
          const first = (item.content ?? [])[0];
          const text = first && "content" in first ? (first.content ?? []).map((inline) => inlineToMarkdown(inline)).join("") : "";
          return `${indent}- ${text}`;
        })
        .join("\n")}\n\n`;
    case "orderedList":
      return `${(block.content ?? [])
        .map((item, index) => {
          const first = (item.content ?? [])[0];
          const text = first && "content" in first ? (first.content ?? []).map((inline) => inlineToMarkdown(inline)).join("") : "";
          return `${indent}${index + 1}. ${text}`;
        })
        .join("\n")}\n\n`;
    case "blockquote":
      return `${(block.content ?? [])
        .map((item) => blockToMarkdown(item, depth).trimEnd())
        .filter(Boolean)
        .map((line) =>
          line
            .split("\n")
            .map((entry) => `> ${entry}`)
            .join("\n")
        )
        .join("\n")}\n\n`;
    case "codeBlock":
      return `\`\`\`${block.attrs?.language ?? ""}\n${(block.content ?? [])
        .map((item) => inlineToMarkdown(item))
        .join("")}\n\`\`\`\n\n`;
    case "horizontalRule":
      return "---\n\n";
    case "pageBreak":
      return "\n<div data-page-break=\"true\"></div>\n\n";
    case "table": {
      const rows = block.content ?? [];
      if (!rows.length) return "";
      const headerCells = rows[0]?.content ?? [];
      const header = `| ${headerCells
        .map((cell) => ((cell.content ?? []) as RichTextNode[])
          .map((item) => ("content" in item ? ((item.content ?? []) as RichTextNode[]).map((inline) => inlineToMarkdown(inline)).join("") : ""))
          .join(" ")
          .trim())
        .join(" | ")} |`;
      const divider = `| ${headerCells.map(() => "---").join(" | ")} |`;
      const body = rows
        .slice(1)
        .map((row) => {
          const cells = row.content ?? [];
          return `| ${cells
            .map((cell) => ((cell.content ?? []) as RichTextNode[])
              .map((item) => ("content" in item ? ((item.content ?? []) as RichTextNode[]).map((inline) => inlineToMarkdown(inline)).join("") : ""))
              .join(" ")
              .trim())
            .join(" | ")} |`;
        })
        .join("\n");
      return `${header}\n${divider}${body ? `\n${body}` : ""}\n\n`;
    }
    case "image": {
      const imageAttrs = block.attrs ?? {};
      return `![${(imageAttrs.alt as string) ?? ""}](${(imageAttrs.src as string) ?? ""})\n\n`;
    }
    case "checklist":
      return `${(block.content ?? [])
        .map((item) => {
          const first = (item.content ?? [])[0];
          const text = first && "content" in first ? (first.content ?? []).map((inline) => inlineToMarkdown(inline)).join("") : "";
          return `- [${(item.attrs as { checked?: boolean })?.checked ? "x" : " "}] ${text}`;
        })
        .join("\n")}\n\n`;
    case "columns":
      return `${(block.content ?? []).map((item) => blockToMarkdown(item, depth)).join("")}\n`;
    case "attachmentPlaceholder": {
      const attachmentAttrs = block.attrs ?? {};
      return `\n[Attachment: ${(attachmentAttrs.fileName as string) ?? ""}]\n\n`;
    }
    case "videoPlaceholder": {
      const videoAttrs = block.attrs ?? {};
      const label = (videoAttrs.label as string) ?? (videoAttrs.url as string) ?? "";
      return `\n[Video: ${label}]\n\n`;
    }
    case "tocPlaceholder":
      return "\n[TOC]\n\n";
    case "listItem":
    case "tableCell":
    case "tableRow":
    case "checklistItem":
      return "";
    default:
      return "";
  }
}

export function resumeRichTextDocToMarkdown(doc: ResumeRichTextDoc) {
  return doc.content.map((block) => blockToMarkdown(block)).join("").trim();
}

export async function markdownToResumeRichTextDoc(markdown: string) {
  const html = await marked.parse(markdown);
  return normalizeResumeRichTextDoc(legacyHtmlToResumeRichTextDoc(html)) ?? createResumeRichTextDoc();
}

function inlineToDocxRuns(inlineNodes: RichTextNode[] = []) {
  return inlineNodes.flatMap((node) => {
    if (node.type !== "text") {
      const attrs = node.attrs ?? {};
      if (node.type === "hardBreak") return [new TextRun({ text: "\n" })];
      if (node.type === "emoji") return [new TextRun({ text: (attrs.value as string) ?? "" })];
      if (node.type === "mention") return [new TextRun({ text: `@${(attrs.label as string) ?? ""}` })];
      return [];
    }
    const marks = node.marks ?? [];
    return [
      new TextRun({
        text: node.text,
        bold: marks.some((mark) => mark.type === "bold"),
        italics: marks.some((mark) => mark.type === "italic"),
        underline: marks.some((mark) => mark.type === "underline") ? {} : undefined,
        strike: marks.some((mark) => mark.type === "strike"),
        subScript: marks.some((mark) => mark.type === "subscript"),
        superScript: marks.some((mark) => mark.type === "superscript")
      })
    ];
  });
}

function blockToDocx(block: RichTextNode): Paragraph | Table | null {
  switch (block.type) {
    case "heading": {
      const levelMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
        4: HeadingLevel.HEADING_4,
        5: HeadingLevel.HEADING_5,
        6: HeadingLevel.HEADING_6
      };
      const level = Number(((block.attrs as { level?: number } | undefined)?.level ?? 2));
      return new Paragraph({
        heading: levelMap[level] ?? HeadingLevel.HEADING_2,
        children: inlineToDocxRuns(block.content ?? [])
      });
    }
    case "paragraph":
      return new Paragraph({ children: inlineToDocxRuns(block.content) });
    case "bulletList":
      return null;
    case "orderedList":
      return null;
    case "blockquote":
      return new Paragraph({ children: (block.content ?? []).flatMap((item) => ("content" in item ? inlineToDocxRuns(item.content) : [])) });
    case "horizontalRule":
      return new Paragraph({ text: "----------------------------------------" });
    case "pageBreak":
      return new Paragraph({ text: "", pageBreakBefore: true });
    case "codeBlock":
      return new Paragraph({ children: inlineToDocxRuns(block.content) });
    case "table":
      return new Table({
        rows: (block.content ?? []).map(
          (row) =>
            new TableRow({
              children: (row.content ?? []).map(
                (cell) =>
                  new TableCell({
                    children: (cell.content ?? []).map((child) =>
                      "content" in child ? new Paragraph({ children: inlineToDocxRuns(child.content) }) : new Paragraph("")
                    )
                  })
              )
            })
        )
      });
    case "image": {
      const imageAttrs = block.attrs ?? {};
      const alt = (imageAttrs.alt as string) ?? "";
      const src = (imageAttrs.src as string) ?? "";
      return new Paragraph({ text: alt || src });
    }
    default:
      return null;
  }
}

export async function resumeRichTextDocToDocxBuffer(doc: ResumeRichTextDoc, title = "Resume") {
  const children: Array<Paragraph | Table> = [new Paragraph({ heading: HeadingLevel.TITLE, text: title })];

  for (const block of doc.content) {
    if (block.type === "bulletList") {
      for (const item of block.content) {
        const first = item.content[0];
        children.push(
          new Paragraph({
            text: first && "content" in first ? (first.content ?? []).map((inline) => inlineToMarkdown(inline)).join("") : "",
            bullet: { level: 0 }
          })
        );
      }
      continue;
    }

    if (block.type === "orderedList") {
      let index = 1;
      for (const item of block.content) {
        const first = item.content[0];
        children.push(
          new Paragraph({
            text: `${index}. ${first && "content" in first ? (first.content ?? []).map((inline) => inlineToMarkdown(inline)).join("") : ""}`
          })
        );
        index += 1;
      }
      continue;
    }

    const mapped = blockToDocx(block);
    if (mapped) children.push(mapped);
  }

  const document = new Document({
    sections: [{ children }]
  });

  return Buffer.from(await Packer.toBuffer(document));
}

export async function docxBufferToResumeRichTextDoc(buffer: Buffer) {
  const result = await mammoth.convertToHtml({ buffer });
  return normalizeResumeRichTextDoc(legacyHtmlToResumeRichTextDoc(result.value)) ?? createResumeRichTextDoc();
}

export function htmlToMarkdown(html: string) {
  return turndown.turndown(html);
}

export async function markdownToHtml(markdown: string) {
  return await marked.parse(markdown);
}

export function sanitizeImportedHtml(input: string) {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/javascript:/gi, "");
}
