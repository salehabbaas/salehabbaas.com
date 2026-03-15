import "server-only";

import { z } from "zod";

type OpenAiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function parseJsonFromText(text: string) {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  const startObject = cleaned.indexOf("{");
  const endObject = cleaned.lastIndexOf("}");
  const startArray = cleaned.indexOf("[");
  const endArray = cleaned.lastIndexOf("]");

  try {
    if (startArray !== -1 && endArray !== -1 && (startObject === -1 || startArray < startObject)) {
      return JSON.parse(cleaned.slice(startArray, endArray + 1));
    }
    if (startObject !== -1 && endObject !== -1) {
      return JSON.parse(cleaned.slice(startObject, endObject + 1));
    }
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export async function callOpenAiStructured<T>(input: {
  schemaName: string;
  schema: Record<string, unknown>;
  responseSchema: z.ZodType<T>;
  messages: OpenAiMessage[];
  temperature?: number;
  model?: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const model = input.model || process.env.OPENAI_MODEL || "gpt-5-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: input.temperature ?? 0.2,
      messages: input.messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: input.schemaName,
          strict: true,
          schema: input.schema,
        },
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI structured output request failed: ${message}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const rawText = payload.choices?.[0]?.message?.content?.trim();
  if (!rawText) {
    throw new Error("OpenAI structured output returned empty content.");
  }

  const parsed = parseJsonFromText(rawText);
  if (!parsed) {
    throw new Error("OpenAI structured output was not valid JSON.");
  }

  return input.responseSchema.parse(parsed);
}
