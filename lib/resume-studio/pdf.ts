import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

import type { ResumeDocumentRecord } from "@/types/resume-studio";
import { resumeRichTextDocToPlainText } from "@/lib/resume-studio/editor-v2/content";
import { resolveMarginBox } from "@/lib/resume-studio/normalize";
import { stripHtmlMarkup } from "@/lib/resume-studio/text";

function hexToRgb(hex: string) {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6) return rgb(0.1, 0.15, 0.2);

  const r = Number.parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = Number.parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = Number.parseInt(cleaned.slice(4, 6), 16) / 255;

  return rgb(r, g, b);
}

function getPageSize(size: ResumeDocumentRecord["page"]["size"]) {
  if (size === "Letter") {
    return { width: 612, height: 792 };
  }
  return { width: 595.28, height: 841.89 };
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, fontSize);
    if (width <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines;
}

function sectionTitle(kind: string, data: Record<string, unknown>) {
  const titleText = typeof data.title === "string" ? stripHtmlMarkup(data.title) : "";
  if (kind === "custom" && titleText) {
    return titleText;
  }

  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function sectionToLines(kind: string, data: Record<string, unknown>) {
  const lines: string[] = [];
  const textOf = (value: unknown) => (typeof value === "string" ? stripHtmlMarkup(value) : "");

  if (kind === "header") {
    const headerBits = [data.fullName, data.headline].map((value) => textOf(value)).filter((value) => value.length > 0);
    const contacts = [data.email, data.phone, data.location].map((value) => textOf(value)).filter((value) => value.length > 0);
    const links = Array.isArray(data.links)
      ? data.links.map((item) => textOf(item)).filter((item) => item.length > 0)
      : [];

    if (headerBits.length) lines.push(headerBits.join(" - "));
    if (contacts.length) lines.push(contacts.join(" | "));
    if (links.length) lines.push(links.join(" | "));
    return lines;
  }

  if (kind === "summary") {
    const summaryText = textOf(data.text);
    if (summaryText) lines.push(summaryText);
    return lines;
  }

  if (kind === "languages" || kind === "interests") {
    if (Array.isArray(data.items)) {
      const items = data.items.map((item) => textOf(item)).filter((item) => item.length > 0);
      if (items.length) lines.push(items.join(", "));
    }
    return lines;
  }

  if (Array.isArray(data.items)) {
    for (const item of data.items as Array<Record<string, unknown>>) {
      const heading = [item.role, item.company, item.name, item.school, item.degree, item.organization]
        .map((value) => textOf(value))
        .filter((value) => value.length > 0)
        .join(" - ");
      if (heading) lines.push(heading);

      const meta = [item.location, item.startDate, item.endDate]
        .map((value) => textOf(value))
        .filter((value) => value.length > 0)
        .join(" | ");
      if (meta) lines.push(meta);

      const description = textOf(item.description);
      if (description) lines.push(description);

      const details = textOf(item.details);
      if (details) lines.push(details);

      const link = textOf(item.link);
      if (link) lines.push(link);

      if (Array.isArray(item.bullets)) {
        item.bullets
          .map((bullet) => textOf(bullet))
          .filter((bullet) => bullet.length > 0)
          .forEach((bullet) => lines.push(`• ${bullet}`));
      }

      const level = textOf(item.level);
      const name = textOf(item.name);
      if (name) {
        lines.push(`${name}${level ? ` (${level})` : ""}`);
      }

      lines.push("");
    }
  }

  if (kind === "custom") {
    const customText = textOf(data.text);
    if (customText) lines.push(customText);
  }

  return lines.filter((line, index, arr) => !(line === "" && arr[index - 1] === ""));
}

export function resumeToText(doc: ResumeDocumentRecord) {
  const lines: string[] = [doc.title, ""];

  for (const section of doc.sections) {
    lines.push(sectionTitle(section.kind, section.data as Record<string, unknown>).toUpperCase());
    const structuredText = section.contentDoc ? resumeRichTextDocToPlainText(section.contentDoc) : "";
    if ((section.kind === "summary" || section.kind === "custom" || section.kind === "languages" || section.kind === "interests") && structuredText) {
      lines.push(
        ...structuredText
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
      );
    } else {
      lines.push(...sectionToLines(section.kind, section.data as Record<string, unknown>));
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

export async function renderResumePdf(doc: ResumeDocumentRecord) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = getPageSize(doc.page.size);
  let page = pdf.addPage([width, height]);
  const marginBox = resolveMarginBox({
    marginBox: doc.page.marginBox,
    margins: doc.page.margins,
    fallback: 22
  });
  const margin = Math.max(22, Math.min(72, ((marginBox.top + marginBox.right + marginBox.bottom + marginBox.left) / 4) * 2.1));
  const contentWidth = width - margin * 2;
  const lineHeight = 13.5 * doc.style.lineHeight;

  const primaryColor = hexToRgb(doc.style.primaryColor || "#0f172a");
  const accentColor = hexToRgb(doc.style.accentColor || "#2563eb");

  let y = height - margin;

  const titleSize = 20 * doc.style.fontScale;
  page.drawText(doc.title, {
    x: margin,
    y,
    size: titleSize,
    font: bold,
    color: primaryColor
  });

  y -= titleSize + 8;

  function ensurePageSpace(requiredHeight: number) {
    if (y >= margin + requiredHeight) return;
    page = pdf.addPage([width, height]);
    y = height - margin;
  }

  for (const section of doc.sections) {
    const heading = sectionTitle(section.kind, section.data as Record<string, unknown>).toUpperCase();
    const headingSize = 10.5 * doc.style.fontScale;

    ensurePageSpace(40);

    page.drawText(heading, {
      x: margin,
      y,
      size: headingSize,
      font: bold,
      color: accentColor
    });
    y -= headingSize + 4;

    const rawLines = sectionToLines(section.kind, section.data as Record<string, unknown>);

    for (const rawLine of rawLines) {
      const trimmed = rawLine.trim();
      if (!trimmed) {
        y -= 4;
        continue;
      }

      const bodySize = 10 * doc.style.fontScale;
      const wrapped = wrapText(trimmed, regular, bodySize, contentWidth);

      for (const line of wrapped) {
        ensurePageSpace(20);

        page.drawText(line, {
          x: margin,
          y,
          size: bodySize,
          font: regular,
          color: primaryColor
        });
        y -= lineHeight;
      }
    }

    y -= doc.page.sectionSpacing * 0.45;
  }

  return Buffer.from(await pdf.save());
}
