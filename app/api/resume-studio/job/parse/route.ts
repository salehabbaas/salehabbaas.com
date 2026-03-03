import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ensureResumeStudioFlag } from "@/lib/resume-studio/flags";
import { requireAdminUser } from "@/lib/resume-studio/server";

export const runtime = "nodejs";

const schema = z.object({
  url: z.string().trim().url()
});

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(input: string) {
  return decodeHtmlEntities(
    input
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|h1|h2|h3|li)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normalizeText(input: string) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const normalized = line.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(line);
  }

  return deduped.join("\n");
}

function extractMeta(html: string, property: string) {
  const regex = new RegExp(`<meta[^>]+(?:name|property)=["']${property}["'][^>]*content=["']([^"']+)["'][^>]*>`, "i");
  const match = html.match(regex);
  return match?.[1]?.trim() ?? "";
}

function extractTitle(html: string) {
  const og = extractMeta(html, "og:title");
  if (og) return og;
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch?.[1]?.trim() ?? "";
}

function extractCompany(html: string) {
  const ogSite = extractMeta(html, "og:site_name");
  if (ogSite) return ogSite;

  const companyMatch = html.match(/\b(?:Company|Employer)\s*[:|-]\s*([^\n<]+)/i);
  return companyMatch?.[1]?.trim() ?? "";
}

function extractMainContent(html: string) {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");

  const mainMatch = cleaned.match(/<(main|article)[^>]*>([\s\S]*?)<\/\1>/i);
  if (mainMatch?.[2]) {
    return stripTags(mainMatch[2]);
  }

  const sectionMatches = [...cleaned.matchAll(/<section[^>]*>([\s\S]*?)<\/section>/gi)].map((match) => stripTags(match[1] ?? ""));
  const bestSection = sectionMatches.sort((a, b) => b.length - a.length)[0];
  if (bestSection && bestSection.length > 200) {
    return bestSection;
  }

  const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return stripTags(bodyMatch?.[1] ?? cleaned);
}

function computeConfidence(text: string, warnings: string[]) {
  if (text.length < 200) {
    warnings.push("Extracted content is short and may be incomplete.");
    return 0.35;
  }
  if (text.length < 600) {
    warnings.push("Extraction confidence is moderate due to limited structured content.");
    return 0.62;
  }
  return 0.86;
}

function safeUrl(raw: string) {
  const parsed = new URL(raw);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http(s) URLs are supported.");
  }
  return parsed.toString();
}

export async function POST(request: NextRequest) {
  const sessionResult = await requireAdminUser();
  if (sessionResult.unauthorized) return sessionResult.unauthorized;
  const v2Blocked = await ensureResumeStudioFlag("resumeStudioV2Enabled", "Resume Studio v2 is not enabled.");
  if (v2Blocked) return v2Blocked;
  const parserBlocked = await ensureResumeStudioFlag("resumeJobUrlParserEnabled", "Job URL parser is not enabled.");
  if (parserBlocked) return parserBlocked;

  try {
    const body = schema.parse(await request.json());
    const sourceUrl = safeUrl(body.url);

    const response = await fetch(sourceUrl, {
      method: "GET",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; ResumeStudioBot/2.0; +https://salehabbaas.com)"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Unable to fetch URL (${response.status})` }, { status: 400 });
    }

    const html = await response.text();
    const rawText = extractMainContent(html);
    const normalizedJobDescription = normalizeText(rawText);
    const warnings: string[] = [];
    const confidence = computeConfidence(normalizedJobDescription, warnings);

    const title = extractTitle(html) || undefined;
    const company = extractCompany(html) || undefined;

    return NextResponse.json({
      title,
      company,
      normalizedJobDescription,
      sourceUrl,
      confidence,
      warnings
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to parse job URL";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
