import "server-only";

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import { getRuntimeAdminSettings } from "@/lib/firestore/admin-settings";
import type { ResumeAiModel } from "@/types/resume-studio";

type GenerateTextInput = {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  modelOverride?: ResumeAiModel;
};

type GenerateTextResult = {
  text: string;
  modelUsed: string;
  fallbackUsed: boolean;
};

const DEFAULT_OPENAI_MODEL: ResumeAiModel = "gpt-5.3";
const FALLBACK_OPENAI_MODEL: ResumeAiModel = "gpt-5.2";

function cleanCodeFence(text: string) {
  return text.replace(/```json|```/gi, "").trim();
}

export function safeJsonParse<T>(raw: string): T | null {
  const cleaned = cleanCodeFence(raw);
  const startObject = cleaned.indexOf("{");
  const endObject = cleaned.lastIndexOf("}");
  const startArray = cleaned.indexOf("[");
  const endArray = cleaned.lastIndexOf("]");

  const hasObject = startObject !== -1 && endObject !== -1 && endObject >= startObject;
  const hasArray = startArray !== -1 && endArray !== -1 && endArray >= startArray;
  if (!hasObject && !hasArray) return null;

  try {
    if (hasArray && (!hasObject || startArray < startObject)) {
      return JSON.parse(cleaned.slice(startArray, endArray + 1)) as T;
    }
    return JSON.parse(cleaned.slice(startObject, endObject + 1)) as T;
  } catch {
    return null;
  }
}

function isOpenAiModelFallbackCandidate(errorMessage: string) {
  const message = errorMessage.toLowerCase();
  return (
    message.includes("model_not_found") ||
    message.includes("model not found") ||
    message.includes("does not exist") ||
    message.includes("unsupported_model") ||
    message.includes("not available") ||
    message.includes("temporarily unavailable") ||
    message.includes("insufficient_quota")
  );
}

async function runOpenAiRequest(input: GenerateTextInput, model: ResumeAiModel) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: input.temperature ?? 0.3,
      max_tokens: input.maxTokens ?? 900,
      messages: [
        {
          role: "system",
          content: input.system
        },
        {
          role: "user",
          content: input.user
        }
      ]
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI returned empty content.");

  return text;
}

async function runOpenAi(input: GenerateTextInput): Promise<GenerateTextResult> {
  const runtime = await getRuntimeAdminSettings();
  const ai53Enabled = runtime.integrations.resumeAi53Enabled !== false;
  const envOverride = process.env.OPENAI_MODEL;
  const selectedDefault = ai53Enabled ? DEFAULT_OPENAI_MODEL : FALLBACK_OPENAI_MODEL;
  const primaryModel = (input.modelOverride || envOverride || selectedDefault) as ResumeAiModel;
  const fallbackModel = primaryModel === FALLBACK_OPENAI_MODEL ? null : FALLBACK_OPENAI_MODEL;

  try {
    const text = await runOpenAiRequest(input, primaryModel);
    return { text, modelUsed: primaryModel, fallbackUsed: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "OpenAI request failed";
    if (!fallbackModel || !isOpenAiModelFallbackCandidate(message)) {
      throw new Error(`OpenAI request failed: ${message}`);
    }

    const text = await runOpenAiRequest(input, fallbackModel);
    return { text, modelUsed: fallbackModel, fallbackUsed: true };
  }
}

async function runGemini(input: GenerateTextInput): Promise<GenerateTextResult> {
  const runtime = await getRuntimeAdminSettings();
  const apiKey = runtime.secrets.geminiApiKey || runtime.secrets.googleApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing AI provider configuration: OPENAI_API_KEY or GEMINI_API_KEY.");
  }

  const model = runtime.integrations.geminiTextModel || runtime.integrations.geminiModel || process.env.GEMINI_TEXT_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const client = new GoogleGenAI({ apiKey });
  const response = await client.models.generateContent({
    model,
    contents: `${input.system}\n\n${input.user}`,
    config: {
      temperature: input.temperature ?? 0.3,
      maxOutputTokens: input.maxTokens ?? 900
    }
  });

  const text = response.text?.trim();
  if (!text) throw new Error("Gemini returned empty content.");
  return {
    text,
    modelUsed: model,
    fallbackUsed: false
  };
}

export async function generateAiTextWithMeta(input: GenerateTextInput): Promise<GenerateTextResult> {
  if (process.env.OPENAI_API_KEY) {
    return runOpenAi(input);
  }

  return runGemini(input);
}

export async function generateAiText(input: GenerateTextInput) {
  const result = await generateAiTextWithMeta(input);
  return result.text;
}

export async function generateStructuredAi<T>(input: GenerateTextInput & { schema: z.ZodType<T> }) {
  const result = await generateAiTextWithMeta(input);
  const parsed = safeJsonParse<unknown>(result.text);
  if (!parsed) {
    throw new Error("Structured AI response was not valid JSON.");
  }

  const validated = input.schema.parse(parsed);
  return {
    ...result,
    data: validated
  };
}
