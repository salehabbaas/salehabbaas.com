import { HttpsError } from "firebase-functions/v2/https";

function extractJsonString(content: unknown) {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    const joined = content
      .map((part) => {
        if (!part || typeof part !== "object") return "";
        if ((part as Record<string, unknown>).type === "text") {
          return String((part as Record<string, unknown>).text ?? "");
        }
        return "";
      })
      .join("\n")
      .trim();

    return joined;
  }

  return "";
}

function safeParseJson<T>(raw: string): T {
  const cleaned = raw.replace(/```json|```/gi, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new HttpsError("internal", "OpenAI response did not contain JSON.");
  }

  try {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as T;
  } catch (error) {
    throw new HttpsError("internal", `OpenAI JSON parse error: ${error instanceof Error ? error.message : "unknown"}`);
  }
}

export async function runOpenAiStructured<T>(input: {
  schemaName: string;
  schema: Record<string, unknown>;
  systemPrompt: string;
  userPrompt: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new HttpsError("failed-precondition", "Missing OPENAI_API_KEY.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.2",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: input.systemPrompt
        },
        {
          role: "user",
          content: input.userPrompt
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: input.schemaName,
          schema: input.schema,
          strict: true
        }
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new HttpsError("internal", `OpenAI request failed: ${body}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: unknown;
      };
    }>;
  };

  const rawContent = payload.choices?.[0]?.message?.content;
  const text = extractJsonString(rawContent);
  if (!text) {
    throw new HttpsError("internal", "OpenAI returned empty content.");
  }

  return safeParseJson<T>(text);
}
