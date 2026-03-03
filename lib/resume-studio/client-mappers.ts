import type { ResumeDocumentRecord, ResumeTemplateRecord } from "@/types/resume-studio";
import { normalizeResumeDocumentRecord, normalizeResumeTemplateRecord } from "@/lib/resume-studio/normalize";

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export function mapResumeDocumentSnapshot(documentId: string, data: unknown): ResumeDocumentRecord {
  return normalizeResumeDocumentRecord({
    id: documentId,
    data: asObject(data)
  });
}

export function mapResumeTemplateSnapshot(documentId: string, data: unknown): ResumeTemplateRecord {
  return normalizeResumeTemplateRecord({
    id: documentId,
    data: asObject(data)
  });
}
