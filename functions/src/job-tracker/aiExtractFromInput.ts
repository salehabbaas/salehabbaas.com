import { onCall } from "firebase-functions/v2/https";

import { aiExtractInputSchema, jobExtractionJsonSchema, jobExtractionResultSchema } from "./schemas";
import { runOpenAiStructured } from "./openai";
import {
  detectInputType,
  extractJsonLdJobPosting,
  requireAuthUid,
  stripHtmlToText,
  truncate
} from "./utils";

function emptyPreview(overrides?: Partial<ReturnType<typeof jobExtractionResultSchema.parse>>) {
  return {
    job_title: "",
    company_name: "",
    company_website: "",
    job_url: "",
    location: "",
    employment_type: "",
    salary_range: "",
    department: "",
    posting_date: "",
    application_deadline: "",
    job_description: "",
    requirements: [],
    responsibilities: [],
    skills: [],
    source_platform: "Other" as const,
    confidence: 0,
    ...overrides
  };
}

async function fetchUrlContent(url: string) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml"
    }
  });

  if (!response.ok) {
    return {
      blocked: response.status === 401 || response.status === 403 || response.status === 429,
      text: "",
      html: "",
      status: response.status
    };
  }

  const html = await response.text();
  const text = stripHtmlToText(html);

  return {
    blocked: false,
    text,
    html,
    status: response.status
  };
}

export const aiExtractFromInput = onCall(async (request) => {
  requireAuthUid(request.auth);

  const payload = aiExtractInputSchema.parse(request.data ?? {});
  const inputText = payload.inputText.trim();
  const inputType = detectInputType(inputText);

  let extractedText = inputText;
  let blocked = false;
  let hint = "";
  let jsonLdContext = "";

  if (inputType === "url" || inputType === "linkedin_url") {
    const fetched = await fetchUrlContent(inputText);
    blocked = fetched.blocked;

    if (fetched.text) {
      extractedText = fetched.text;
      const jsonLd = extractJsonLdJobPosting(fetched.html);
      if (jsonLd) {
        jsonLdContext = JSON.stringify(jsonLd).slice(0, 12000);
      }
    }

    if ((inputType === "linkedin_url" && blocked) || !fetched.text) {
      hint =
        "LinkedIn or the target site blocked server-side fetching. Paste the visible job description text directly for a better extraction.";

      if (!fetched.text) {
        return {
          inputType,
          blocked: true,
          hint,
          extractedText: "",
          preview: emptyPreview({
            job_url: inputText,
            source_platform: inputType === "linkedin_url" ? "LinkedIn" : "Other"
          })
        };
      }
    }
  }

  const promptContext = truncate(extractedText, 90000);

  const aiRaw = await runOpenAiStructured<unknown>({
    schemaName: "job_extraction_schema",
    schema: jobExtractionJsonSchema as unknown as Record<string, unknown>,
    systemPrompt:
      "You are a job data extraction engine. Return ONLY valid JSON matching the schema. Do not include markdown, comments, or prose.",
    userPrompt: [
      "Extract structured job data from the following content.",
      "Include confidence as a number between 0 and 1.",
      "If a field is missing, return an empty string or empty array.",
      jsonLdContext ? `JSON-LD Context: ${jsonLdContext}` : "",
      `Raw Content:\n${promptContext}`
    ]
      .filter(Boolean)
      .join("\n\n")
  });

  const parsed = jobExtractionResultSchema.parse(aiRaw);

  return {
    inputType,
    blocked,
    hint,
    extractedText: promptContext,
    preview: {
      ...parsed,
      job_url: parsed.job_url || (inputType === "url" || inputType === "linkedin_url" ? inputText : ""),
      source_platform: inputType === "linkedin_url" ? "LinkedIn" : parsed.source_platform
    }
  };
});
