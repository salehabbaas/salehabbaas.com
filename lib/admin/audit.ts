import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";

import { adminDb } from "@/lib/firebase/admin";
import type { AdminRequestContext } from "@/lib/admin/request-context";

type AuditInput = {
  module: string;
  action: string;
  targetType?: string;
  targetId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
};

function sanitizeMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return {};
  try {
    return JSON.parse(JSON.stringify(metadata)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function writeAdminAuditLog(input: AuditInput, actor: DecodedIdToken | null, context?: Partial<AdminRequestContext>) {
  try {
    const metadata = sanitizeMetadata({
      ...(input.metadata ?? {}),
      request: {
        path: context?.path ?? "",
        deviceType: context?.deviceType ?? "",
        browser: context?.browser ?? "",
        country: context?.country ?? "",
        city: context?.city ?? ""
      }
    });

    await adminDb.collection("auditLogs").add({
      module: input.module,
      action: input.action,
      targetType: input.targetType ?? "",
      targetId: input.targetId ?? "",
      summary: input.summary,
      metadata,
      actorUid: actor?.uid ?? "system",
      actorEmail: actor?.email ?? "",
      actorIpHash: context?.ipHash ?? "",
      actorIpMasked: context?.ipMasked ?? "",
      actorDeviceType: context?.deviceType ?? "",
      actorBrowser: context?.browser ?? "",
      actorCountry: context?.country ?? "",
      actorCity: context?.city ?? "",
      createdAt: new Date()
    });
  } catch {
    // Audit logging must not block admin workflows.
  }
}

export function toIso(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return "";
}
