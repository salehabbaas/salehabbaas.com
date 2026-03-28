import { getBuiltInTemplateById } from "@/lib/resume-studio/defaults";
import { createMarginBox, resolveMarginBox } from "@/lib/resume-studio/normalize";
import { stripHtmlMarkup } from "@/lib/resume-studio/text";
import type { ResumeDocumentRecord, ResumeSectionBlock, ResumeTemplateRecord, TemplateRegion } from "@/types/resume-studio";

const KNOWN_REGIONS: TemplateRegion[] = ["header", "main", "sidebar", "footer"];

export function resolveTemplateForDocument(doc: ResumeDocumentRecord, template?: ResumeTemplateRecord | null) {
  return template ?? getBuiltInTemplateById(doc.templateId);
}

export function resolveDocumentMarginBox(doc: ResumeDocumentRecord, template: ResumeTemplateRecord) {
  return resolveMarginBox({
    marginBox: doc.page.marginBox,
    margins: doc.page.margins,
    fallback: template.paper.defaultMargins ?? 22
  });
}

export function resolveTemplateMarginBox(template: ResumeTemplateRecord) {
  return resolveMarginBox({
    marginBox: template.paper.defaultMarginBox,
    margins: template.paper.defaultMargins,
    fallback: 22
  });
}

export function resolveDocumentStyles(doc: ResumeDocumentRecord, template: ResumeTemplateRecord) {
  const inheritColors = Boolean(doc.style.inheritTemplateColors);
  const inheritFonts = Boolean(doc.style.inheritTemplateFonts);
  const scale = Number.isFinite(doc.style.fontScale) ? Math.max(0.75, Math.min(1.35, doc.style.fontScale)) : 1;
  const lineHeight = Number.isFinite(doc.style.lineHeight) ? Math.max(1.05, Math.min(2.1, doc.style.lineHeight)) : template.styleTokens.spacing.line;

  return {
    colors: {
      text: inheritColors ? template.styleTokens.colors.text : doc.style.primaryColor || template.styleTokens.colors.text,
      accent: inheritColors
        ? template.styleTokens.colors.accent
        : doc.style.accentColor || template.styleTokens.colors.accent,
      muted: template.styleTokens.colors.muted,
      background: inheritColors ? template.styleTokens.colors.background : doc.style.background || template.styleTokens.colors.background
    },
    fonts: {
      heading: inheritFonts ? template.styleTokens.fonts.heading : doc.style.fontFamily || template.styleTokens.fonts.heading,
      body: inheritFonts ? template.styleTokens.fonts.body : doc.style.fontFamily || template.styleTokens.fonts.body
    },
    sizes: {
      title: template.styleTokens.sizes.title * scale,
      heading: template.styleTokens.sizes.heading * scale,
      body: template.styleTokens.sizes.body * scale,
      small: template.styleTokens.sizes.small * scale
    },
    spacing: {
      section: doc.page.sectionSpacing || template.styleTokens.spacing.section,
      item: template.styleTokens.spacing.item,
      line: lineHeight
    }
  };
}

export function getTemplateRegionConfig(template: ResumeTemplateRecord, region: TemplateRegion) {
  return template.layout.regions.find((entry) => entry.region === region) ?? null;
}

export function hasMultipleColumns(columns: string) {
  return columns
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean).length > 1;
}

export function useTwoColumnLayout(template: ResumeTemplateRecord) {
  if (template.constraints.supportsTwoColumn || template.category === "sidebar") return true;
  return hasMultipleColumns(template.layout.grid.columns);
}

export function mapSectionsToRegions(doc: ResumeDocumentRecord, template: ResumeTemplateRecord) {
  const map = new Map<TemplateRegion, ResumeSectionBlock[]>();
  for (const region of KNOWN_REGIONS) {
    map.set(region, []);
  }

  for (const section of doc.sections) {
    const resolvedRegion =
      template.layout.regions.find((entry) => entry.sectionSlots.includes(section.kind))?.region ??
      (section.kind === "header" ? "header" : "main");

    const bucket = map.get(resolvedRegion) ?? [];
    bucket.push(section);
    map.set(resolvedRegion, bucket);
  }

  return map;
}

export function sectionTitle(section: ResumeSectionBlock) {
  const title = typeof (section.data as Record<string, unknown>).title === "string" ? String((section.data as Record<string, unknown>).title) : "";
  if (title.trim()) return title.trim();
  return section.kind.charAt(0).toUpperCase() + section.kind.slice(1);
}

export function sectionLines(section: ResumeSectionBlock) {
  const lines: string[] = [];
  const data = section.data as Record<string, unknown>;
  const textOf = (value: unknown) => (typeof value === "string" ? stripHtmlMarkup(value) : "");

  if (section.kind === "header") {
    const headline = [data.fullName, data.headline].map((value) => textOf(value)).filter((value) => value.length > 0);
    const contact = [data.email, data.phone, data.location].map((value) => textOf(value)).filter((value) => value.length > 0);
    if (headline.length) lines.push(headline.join(" - "));
    if (contact.length) lines.push(contact.join(" | "));
    return lines;
  }

  if (section.kind === "summary") {
    const summaryText = textOf(data.text);
    if (summaryText) lines.push(summaryText);
    return lines;
  }

  if (section.kind === "languages" || section.kind === "interests") {
    if (Array.isArray(data.items)) {
      const items = data.items.map((item) => textOf(item)).filter((item) => item.length > 0);
      if (items.length) lines.push(items.join(", "));
    }
    return lines;
  }

  const items = Array.isArray(data.items) ? (data.items as Array<Record<string, unknown>>) : [];
  for (const item of items) {
    const heading = [item.role, item.name, item.title, item.degree, item.company, item.school, item.organization, item.venue]
      .map((value) => textOf(value))
      .filter((value) => value.length > 0)
      .join(" - ");
    if (heading) lines.push(heading);

    const meta = [item.startDate, item.endDate, item.location, item.year]
      .map((value) => textOf(value))
      .filter((value) => value.length > 0)
      .join(" | ");
    if (meta) lines.push(meta);

    const description = textOf(item.description);
    if (description) lines.push(description);
    const details = textOf(item.details);
    if (details) lines.push(details);
    if (Array.isArray(item.bullets)) {
      item.bullets
        .map((bullet) => textOf(bullet))
        .filter((bullet) => bullet.length > 0)
        .forEach((bullet) => lines.push(`• ${bullet}`));
    }
    lines.push("");
  }

  if (section.kind === "custom") {
    const customText = textOf(data.text);
    if (customText) lines.push(customText);
  }

  return lines.filter((line, index, arr) => !(line === "" && arr[index - 1] === ""));
}

export function normalizeDocForTemplate(doc: ResumeDocumentRecord, template: ResumeTemplateRecord): ResumeDocumentRecord {
  const marginBox = resolveDocumentMarginBox(doc, template);

  return {
    ...doc,
    page: {
      ...doc.page,
      size: doc.page.size,
      marginBox,
      margins: Math.round(((marginBox.top + marginBox.right + marginBox.bottom + marginBox.left) / 4) * 100) / 100
    }
  };
}

export function toA4Pixels(size: ResumeDocumentRecord["page"]["size"]) {
  if (size === "Letter") {
    return { width: 816, height: 1056 };
  }
  return { width: 794, height: 1122 };
}

export function toA4Millimeters(size: ResumeDocumentRecord["page"]["size"]) {
  if (size === "Letter") {
    return { width: "215.9mm", height: "279.4mm" };
  }
  return { width: "210mm", height: "297mm" };
}

export function createDefaultMarginBox() {
  return createMarginBox(22);
}
