import { createHash } from "node:crypto";

import { HttpsError } from "firebase-functions/v2/https";

export type InputType = "url" | "linkedin_url" | "email" | "job_description";

export function requireAuthUid(auth: { uid?: string } | null | undefined) {
  if (!auth?.uid) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }
  return auth.uid;
}

export function detectInputType(inputText: string): InputType {
  const trimmed = inputText.trim();
  const lower = trimmed.toLowerCase();

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const host = new URL(trimmed).hostname.toLowerCase();
      if (host.includes("linkedin.com") && lower.includes("/jobs")) {
        return "linkedin_url";
      }
      return "url";
    } catch {
      return "url";
    }
  }

  if (looksLikeEmailText(trimmed)) {
    return "email";
  }

  return "job_description";
}

export function looksLikeEmailText(value: string) {
  const text = value.toLowerCase();
  return (
    text.includes("from:") ||
    text.includes("subject:") ||
    text.includes("dear") ||
    text.includes("regards") ||
    text.includes("sincerely")
  );
}

export function stripHtmlToText(html: string) {
  const withoutScripts = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, " ");

  const text = withoutScripts
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s{2,}/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();

  return text;
}

export function extractJsonLdJobPosting(html: string) {
  const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  for (const match of matches) {
    const raw = (match[1] ?? "").trim();
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown> | Array<Record<string, unknown>>;
      const records = Array.isArray(parsed) ? parsed : [parsed];
      const jobPosting = records.find((record) => {
        const type = String(record["@type"] ?? "").toLowerCase();
        return type.includes("jobposting");
      });

      if (jobPosting) {
        return jobPosting;
      }
    } catch {
      // Ignore malformed JSON-LD snippets.
    }
  }

  return null;
}

export function truncate(value: string, max = 120000) {
  return value.length > max ? value.slice(0, max) : value;
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string) {
  return new Set(normalizeName(value).split(" ").filter(Boolean));
}

export function similarity(a: string, b: string) {
  const aTokens = tokens(a);
  const bTokens = tokens(b);

  if (!aTokens.size || !bTokens.size) return 0;

  let intersection = 0;
  aTokens.forEach((token) => {
    if (bTokens.has(token)) intersection += 1;
  });

  const union = new Set([...aTokens, ...bTokens]).size;
  if (!union) return 0;

  return intersection / union;
}

export function parseDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function formatDdMmYy(value?: Date | null) {
  if (!value) return "";
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const year = String(value.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

export function monthRange(month: string) {
  const [yearRaw, monthRaw] = month.split("-");
  const year = Number(yearRaw);
  const monthNumber = Number(monthRaw);

  if (!Number.isFinite(year) || !Number.isFinite(monthNumber)) {
    throw new HttpsError("invalid-argument", "month must be in YYYY-MM format.");
  }

  const start = new Date(Date.UTC(year, monthNumber - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthNumber, 1, 0, 0, 0, 0));

  return { start, end };
}

export function toIso(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return "";
}

export function validHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function absoluteHttpUrl(value: string) {
  if (!validHttpUrl(value)) return "";
  return value;
}
