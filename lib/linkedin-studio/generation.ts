import "server-only";

import { GoogleGenAI } from "@google/genai";

import type { StudioCompany, StudioConfig } from "@/types/linkedin-studio";
import { getRuntimeAdminSettings } from "@/lib/firestore/admin-settings";

type DraftInput = {
  manualCompany?: string;
  manualTopic?: string;
  manualPillar?: string;
};

type PostCandidate = {
  id: string;
  title: string;
  text: string;
  selectedTopics: string[];
};

export type GeneratedStudioPost = {
  selectedCompany: string;
  selectedTopics: string[];
  selectedPillar?: string;
  title: string;
  postText: string;
  hashtags: string[];
  mentions: string[];
  rationale: string;
  whyFit?: string;
  scheduledFor?: string | null;
};

type ParsedAiPayload = {
  title?: string;
  hashtags?: string[];
  mentions?: string[];
  rationale?: string;
  whyFit?: string;
};

const MIN_WORDS = 40;

function normalizeText(input: string) {
  return input
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#@]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toWords(input: string) {
  const normalized = normalizeText(input);
  if (!normalized) return [];
  return normalized.split(" ").filter(Boolean);
}

function toShingles(words: string[], size = 3) {
  const set = new Set<string>();
  if (words.length < size) return set;
  for (let index = 0; index <= words.length - size; index += 1) {
    set.add(words.slice(index, index + size).join(" "));
  }
  return set;
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const value of a) {
    if (b.has(value)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function computeSimilarity(a: string, b: string) {
  const wordsA = toWords(a);
  const wordsB = toWords(b);
  if (wordsA.length < MIN_WORDS || wordsB.length < MIN_WORDS) return 0;
  return jaccard(toShingles(wordsA), toShingles(wordsB));
}

function buildTitleFallback(input: { title?: string; company: string; topics: string[]; text: string }) {
  const cleanedTitle = input.title?.trim() ?? "";
  if (cleanedTitle && normalizeText(cleanedTitle) !== normalizeText(input.company)) {
    return cleanedTitle;
  }

  const firstLine = input.text
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (firstLine) {
    return firstLine.replace(/[.!?]+$/g, "").slice(0, 80);
  }

  if (input.topics[0]) {
    return `${input.topics[0]} insights`;
  }

  return input.company;
}

function hasDuplicate(candidate: { title: string; text: string }, history: PostCandidate[]) {
  const candidateTitle = normalizeText(candidate.title);
  return history.some((item) => {
    const titleMatch = candidateTitle && candidateTitle === normalizeText(item.title) && candidateTitle.length > 3;
    const similarity = computeSimilarity(candidate.text, item.text);
    return titleMatch || similarity >= 0.55;
  });
}

function pickCompany(companies: StudioCompany[], contextText: string) {
  if (!companies.length) {
    throw new Error("Add at least one company in LinkedIn Studio setup.");
  }

  const lowered = contextText.toLowerCase();
  const scored = companies.map((company) => {
    const daysSinceLastUse = company.lastUsedAt
      ? Math.max(1, Math.floor((Date.now() - new Date(company.lastUsedAt).getTime()) / 86400000))
      : 30;
    const relevance = lowered.includes(company.name.toLowerCase()) ? 3 : 0;
    return {
      company,
      score: daysSinceLastUse * 0.6 + Number(company.rotationWeight ?? 1) * 2 + Number(company.priority ?? 1) + relevance
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.company ?? companies[0];
}

function pickTopics(config: StudioConfig, recentTopics: string[], manualTopic?: string) {
  if (manualTopic?.trim()) {
    return [manualTopic.trim()];
  }

  const candidates = [
    ...config.targeting.pillars,
    ...config.targeting.technologies,
    ...config.targeting.industries
  ]
    .map((value) => value.trim())
    .filter(Boolean);

  if (!candidates.length) {
    return ["Software engineering execution"];
  }

  const recent = new Set(recentTopics.map((item) => item.toLowerCase()));
  const filtered = candidates.filter((item) => !recent.has(item.toLowerCase()));
  const source = filtered.length ? filtered : candidates;

  return Array.from(new Set(source)).slice(0, 2);
}

function nextCadenceIso(config: StudioConfig) {
  const days = new Map<string, number>([
    ["SU", 0],
    ["MO", 1],
    ["TU", 2],
    ["WE", 3],
    ["TH", 4],
    ["FR", 5],
    ["SA", 6]
  ]);

  const targetDays = config.settings.cadenceDaysOfWeek
    .map((day) => days.get(day))
    .filter((value): value is number => Number.isFinite(value));

  if (!targetDays.length) return null;

  const [hourRaw, minuteRaw] = config.settings.reminderTimeLocal.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  const now = new Date();

  for (let offset = 0; offset <= 21; offset += 1) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(Number.isFinite(hour) ? hour : 9, Number.isFinite(minute) ? minute : 0, 0, 0);
    if (!targetDays.includes(candidate.getDay())) continue;
    if (candidate > now) {
      return candidate.toISOString();
    }
  }

  return null;
}

function buildIdentityContext(config: StudioConfig) {
  const experience = config.experience
    .map((entry) => {
      const bullets = entry.bullets.join(" | ");
      const tech = entry.technologies.join(", ");
      const lessons = entry.lessonsLearned.join(" | ");
      return `Role: ${entry.roleTitle} at ${entry.company}\nIndustry: ${entry.industry ?? ""}\nDates: ${entry.startDate ?? ""} - ${entry.endDate ?? "Present"}\nBullets: ${bullets}\nTechnologies: ${tech}\nLessons: ${lessons}`;
    })
    .join("\n\n");

  return [
    `You are writing in the voice of ${config.profile.displayName}.`,
    `Headline: ${config.profile.headline}`,
    `About: ${config.profile.about}`,
    `Goals: ${config.profile.goals.join("; ")}`,
    `Location: ${config.profile.location ?? ""}`,
    `Tone: ${config.profile.voiceStyle.tone}`,
    `Length: ${config.profile.voiceStyle.length}`,
    `Do: ${config.profile.voiceStyle.dos.join("; ")}`,
    `Don't: ${config.profile.voiceStyle.donts.join("; ")}`,
    `Target industries: ${config.targeting.industries.join(", ")}`,
    `Target technologies: ${config.targeting.technologies.join(", ")}`,
    `Content pillars: ${config.targeting.pillars.join(", ")}`,
    "",
    "Experience (do not invent beyond this):",
    experience
  ].join("\n");
}

function cleanJson(raw: string) {
  const cleaned = raw.replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return "{}";
  }
  return cleaned.slice(start, end + 1);
}

function parseAiResponse(raw: string) {
  const sanitized = raw.replace(/```json|```/gi, "").trim();
  const jsonMarker = sanitized.indexOf("JSON:");

  let postPart = sanitized;
  let jsonPart = "{}";

  if (jsonMarker >= 0) {
    postPart = sanitized.slice(0, jsonMarker);
    jsonPart = sanitized.slice(jsonMarker + "JSON:".length);
  }

  postPart = postPart.replace(/^POST:/i, "").trim();

  const parsed = JSON.parse(cleanJson(jsonPart)) as ParsedAiPayload;

  return {
    postText: postPart,
    title: parsed.title ?? "",
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
    mentions: Array.isArray(parsed.mentions) ? parsed.mentions : [],
    rationale: parsed.rationale ?? "",
    whyFit: parsed.whyFit ?? ""
  };
}

async function runGemini(prompt: string) {
  const runtime = await getRuntimeAdminSettings();
  const apiKey =
    runtime.secrets.geminiApiKey ||
    runtime.secrets.googleApiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY (or GOOGLE_API_KEY) server environment variable.");
  }

  const model =
    runtime.integrations.geminiTextModel ||
    runtime.integrations.geminiModel ||
    process.env.GEMINI_TEXT_MODEL ||
    process.env.GEMINI_MODEL ||
    "gemini-2.5-flash";
  const client = new GoogleGenAI({ apiKey });

  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.35,
      maxOutputTokens: 1400
    }
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Model returned an empty response.");
  }

  return text;
}

function buildGenerationPrompt(input: {
  identityContext: string;
  selectedCompany: string;
  selectedTopics: string[];
  selectedPillar?: string;
  avoidPosts: Array<{ title: string; snippet: string }>;
}) {
  const avoidBlock = input.avoidPosts.length
    ? `Avoid repeating these recent posts:\n${input.avoidPosts.map((item) => `- ${item.title}: ${item.snippet}`).join("\n")}`
    : "";

  return `You are a LinkedIn content strategist.

${input.identityContext}

Rules:
- Never invent facts or claims.
- Keep a practical, engineering voice.
- Focus on actionable insights.
- Include a concise CTA.
- Title must be specific and not only the company name.
${avoidBlock}

Selected company: ${input.selectedCompany}
Selected topics: ${input.selectedTopics.join(" | ")}
Selected pillar: ${input.selectedPillar ?? ""}

Return exactly in this format:
POST:
<LinkedIn post text>
JSON:
{
  "title": "short title",
  "hashtags": ["#example"],
  "mentions": ["Company", "Tech"],
  "rationale": "why this company and topic fit",
  "whyFit": "why this aligns with profile"
}`;
}

function buildRefinePrompt(input: {
  identityContext: string;
  originalPost: string;
  feedback?: string;
}) {
  return `Refine this LinkedIn post while preserving factual accuracy and voice.

${input.identityContext}

Original post:
${input.originalPost}

Feedback:
${input.feedback?.trim() || "Improve clarity, pacing, and specificity without adding new facts."}

Return exactly in this format:
POST:
<Refined LinkedIn post>
JSON:
{
  "title": "short title",
  "hashtags": ["#example"],
  "mentions": ["Company", "Tech"],
  "rationale": "what changed",
  "whyFit": "why this aligns with profile"
}`;
}

export function buildAvoidList(posts: PostCandidate[], limit = 6) {
  return posts.slice(0, limit).map((item) => {
    const snippet = item.text
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean)
      ?.slice(0, 140);

    return {
      title: item.title || "Untitled",
      snippet: snippet || ""
    };
  });
}

export async function generateStudioPost(input: {
  config: StudioConfig;
  recentPosts: PostCandidate[];
  request: DraftInput;
}) {
  const identityContext = buildIdentityContext(input.config);

  const recentTopics = input.recentPosts.flatMap((item) => item.selectedTopics || []);
  const selectedTopics = pickTopics(input.config, recentTopics, input.request.manualTopic);
  const selectedPillar = input.request.manualPillar || input.config.targeting.pillars[0] || selectedTopics[0] || "";
  const selectedCompany = input.request.manualCompany?.trim()
    ? input.request.manualCompany.trim()
    : pickCompany(input.config.targeting.companies, `${selectedTopics.join(" ")} ${selectedPillar}`).name;

  const prompt = buildGenerationPrompt({
    identityContext,
    selectedCompany,
    selectedTopics,
    selectedPillar,
    avoidPosts: buildAvoidList(input.recentPosts)
  });

  const raw = await runGemini(prompt);
  const parsed = parseAiResponse(raw);

  const title = buildTitleFallback({
    title: parsed.title,
    company: selectedCompany,
    topics: selectedTopics,
    text: parsed.postText
  });

  if (hasDuplicate({ title, text: parsed.postText }, input.recentPosts)) {
    throw new Error("Generated draft is too similar to a recent post. Try a different topic or run again.");
  }

  return {
    selectedCompany,
    selectedTopics,
    selectedPillar,
    title,
    postText: parsed.postText,
    hashtags: parsed.hashtags,
    mentions: parsed.mentions,
    rationale: parsed.rationale,
    whyFit: parsed.whyFit,
    scheduledFor: nextCadenceIso(input.config)
  } satisfies GeneratedStudioPost;
}

export async function refineStudioPost(input: {
  config: StudioConfig;
  originalPost: string;
  company: string;
  topics: string[];
  feedback?: string;
}) {
  const identityContext = buildIdentityContext(input.config);
  const prompt = buildRefinePrompt({
    identityContext,
    originalPost: input.originalPost,
    feedback: input.feedback
  });

  const raw = await runGemini(prompt);
  const parsed = parseAiResponse(raw);

  const title = buildTitleFallback({
    title: parsed.title,
    company: input.company,
    topics: input.topics,
    text: parsed.postText
  });

  return {
    title,
    postText: parsed.postText,
    hashtags: parsed.hashtags,
    mentions: parsed.mentions,
    rationale: parsed.rationale,
    whyFit: parsed.whyFit
  };
}
