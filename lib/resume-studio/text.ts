import type { ResumeDocumentRecord, ResumeSectionBlock } from "@/types/resume-studio";
import { legacyHtmlToPlainText, resumeRichTextDocToPlainText } from "@/lib/resume-studio/editor-v2/content";

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "your",
  "you",
  "are",
  "was",
  "were",
  "have",
  "has",
  "had",
  "will",
  "would",
  "into",
  "about",
  "their",
  "there",
  "them",
  "than",
  "then",
  "over",
  "under",
  "after",
  "before",
  "able",
  "across",
  "through",
  "while",
  "where",
  "which",
  "when",
  "what",
  "who",
  "how",
  "why",
  "can",
  "could",
  "should",
  "also",
  "using",
  "used"
]);

const HTML_ENTITY_MAP: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'"
};

export function decodeHtmlEntities(input: string) {
  return input.replace(/&([a-z]+);/gi, (match, entity) => HTML_ENTITY_MAP[entity.toLowerCase()] ?? match);
}

export function stripHtmlMarkup(input: string) {
  return decodeHtmlEntities(
    input
      .replace(/<\s*\/?\s*(p|div|li|br|ul|ol|h[1-6])[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+/g, " ")
    .trim();
}

function toTextValue(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return stripHtmlMarkup(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => toTextValue(item)).join(" ");
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map((item) => toTextValue(item))
      .join(" ");
  }
  return "";
}

export function sectionToPlainText(section: ResumeSectionBlock) {
  const structuredText = section.contentDoc ? resumeRichTextDocToPlainText(section.contentDoc) : "";
  if (structuredText) {
    return structuredText.replace(/\s+/g, " ").trim();
  }

  if (section.contentHtmlLegacy) {
    const legacyText = legacyHtmlToPlainText(section.contentHtmlLegacy);
    if (legacyText) {
      return legacyText.replace(/\s+/g, " ").trim();
    }
  }

  return toTextValue(section.data)
    .replace(/\s+/g, " ")
    .trim();
}

export function resumeToPlainText(doc: Pick<ResumeDocumentRecord, "title" | "sections">) {
  const sectionText = doc.sections.map((section) => sectionToPlainText(section)).filter(Boolean);
  return [doc.title, ...sectionText].join("\n").trim();
}

function normalizeWord(word: string) {
  const cleaned = word
    .toLowerCase()
    .replace(/[^a-z0-9+#.]/gi, "")
    .trim();

  if (cleaned.endsWith("ing") && cleaned.length > 5) return cleaned.slice(0, -3);
  if (cleaned.endsWith("ed") && cleaned.length > 4) return cleaned.slice(0, -2);
  if (cleaned.endsWith("s") && cleaned.length > 4) return cleaned.slice(0, -1);
  return cleaned;
}

export function tokenize(input: string) {
  return input
    .split(/\s+/)
    .map((word) => normalizeWord(word))
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

export function extractKeywords(input: string, limit = 24) {
  const counts = new Map<string, number>();
  tokenize(input).forEach((token) => {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .slice(0, limit)
    .map(([token]) => token);
}

export function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return String(hash >>> 0);
}

export function countWords(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function splitLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
