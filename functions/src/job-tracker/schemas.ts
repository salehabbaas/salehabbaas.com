import { z } from "zod";

export const jobExtractionJsonSchema = {
  type: "object",
  properties: {
    job_title: { type: "string" },
    company_name: { type: "string" },
    company_website: { type: "string" },
    job_url: { type: "string" },
    location: { type: "string" },
    employment_type: { type: "string" },
    salary_range: { type: "string" },
    department: { type: "string" },
    posting_date: { type: "string" },
    application_deadline: { type: "string" },
    job_description: { type: "string" },
    requirements: { type: "array", items: { type: "string" } },
    responsibilities: { type: "array", items: { type: "string" } },
    skills: { type: "array", items: { type: "string" } },
    source_platform: {
      type: "string",
      enum: ["LinkedIn", "Company Website", "Indeed", "Greenhouse", "Lever", "Workday", "Other"]
    },
    confidence: { type: "number" }
  },
  required: ["job_title", "company_name", "job_description"]
} as const;

export const emailClassificationJsonSchema = {
  type: "object",
  properties: {
    email_type: {
      type: "string",
      enum: [
        "application_received",
        "interview_invitation",
        "interview_scheduled",
        "rejection",
        "offer",
        "follow_up_required",
        "general_update",
        "newsletter",
        "unknown"
      ]
    },
    company_name: { type: "string" },
    job_title: { type: "string" },
    job_reference_id: { type: "string" },
    detected_status: {
      type: "string",
      enum: ["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED", "UNKNOWN"]
    },
    interview_details: {
      type: "object",
      properties: {
        interview_datetime: { type: "string" },
        interviewer_name: { type: "string" },
        meeting_link: { type: "string" },
        interview_stage: { type: "string" }
      }
    },
    action_required: { type: "boolean" },
    confidence: { type: "number" },
    reasoning: { type: "string" }
  },
  required: ["email_type", "company_name", "detected_status", "confidence"]
} as const;

export const aiExtractInputSchema = z.object({
  inputText: z.string().min(1).max(250000)
});

export const classifyEmailInputSchema = z.object({
  emailId: z.string().min(1)
});

export const exportMonthlyInputSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/)
});

const zString = z.string().optional().default("");

export const jobExtractionResultSchema = z.object({
  job_title: zString,
  company_name: zString,
  company_website: zString,
  job_url: zString,
  location: zString,
  employment_type: zString,
  salary_range: zString,
  department: zString,
  posting_date: zString,
  application_deadline: zString,
  job_description: zString,
  requirements: z.array(z.string()).optional().default([]),
  responsibilities: z.array(z.string()).optional().default([]),
  skills: z.array(z.string()).optional().default([]),
  source_platform: z
    .enum(["LinkedIn", "Company Website", "Indeed", "Greenhouse", "Lever", "Workday", "Other"])
    .optional()
    .default("Other"),
  confidence: z.number().min(0).max(1).optional().default(0)
});

export const emailClassificationResultSchema = z.object({
  email_type: z
    .enum([
      "application_received",
      "interview_invitation",
      "interview_scheduled",
      "rejection",
      "offer",
      "follow_up_required",
      "general_update",
      "newsletter",
      "unknown"
    ])
    .optional()
    .default("unknown"),
  company_name: zString,
  job_title: zString,
  job_reference_id: zString,
  detected_status: z.enum(["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED", "UNKNOWN"]).optional().default("UNKNOWN"),
  interview_details: z
    .object({
      interview_datetime: zString,
      interviewer_name: zString,
      meeting_link: zString,
      interview_stage: zString
    })
    .optional(),
  action_required: z.boolean().optional().default(false),
  confidence: z.number().min(0).max(1).optional().default(0),
  reasoning: zString
});

export type JobExtractionResult = z.infer<typeof jobExtractionResultSchema>;
export type EmailClassificationResult = z.infer<typeof emailClassificationResultSchema>;
