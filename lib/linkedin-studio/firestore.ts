import "server-only";

import type { DocumentData, DocumentSnapshot, QueryDocumentSnapshot } from "firebase-admin/firestore";

import { defaultStudioConfig } from "@/lib/linkedin-studio/defaults";
import { adminDb } from "@/lib/firebase/admin";
import type { StudioConfig, StudioPostRecord, StudioPostVersion } from "@/types/linkedin-studio";

function toIso(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return "";
}

export function mapConfig(data?: Record<string, unknown> | null): StudioConfig {
  if (!data) return defaultStudioConfig;

  const merged = {
    ...defaultStudioConfig,
    ...(data as Partial<StudioConfig>)
  };

  return {
    ...merged,
    profile: {
      ...defaultStudioConfig.profile,
      ...(merged.profile ?? {}),
      voiceStyle: {
        ...defaultStudioConfig.profile.voiceStyle,
        ...(merged.profile?.voiceStyle ?? {})
      }
    },
    targeting: {
      ...defaultStudioConfig.targeting,
      ...(merged.targeting ?? {})
    },
    settings: {
      ...defaultStudioConfig.settings,
      ...(merged.settings ?? {})
    },
    experience: Array.isArray(merged.experience) ? merged.experience : []
  };
}

export async function readStudioConfig() {
  const snapshot = await adminDb.collection("linkedinStudioProfiles").doc("default").get();
  const config = mapConfig(snapshot.data() as Record<string, unknown> | undefined);

  return {
    ...config,
    createdAt: toIso(snapshot.data()?.createdAt),
    updatedAt: toIso(snapshot.data()?.updatedAt)
  } as StudioConfig;
}

type SnapshotWithData = QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>;

export function mapPost(document: SnapshotWithData): StudioPostRecord {
  const data = document.data() ?? {};
  return {
    id: document.id,
    status: (data.status ?? "draft") as StudioPostRecord["status"],
    selectedCompany: data.selectedCompany ?? "",
    selectedTopics: Array.isArray(data.selectedTopics) ? data.selectedTopics : [],
    selectedPillar: data.selectedPillar ?? "",
    title: data.title ?? "",
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    scheduledFor: toIso(data.scheduledFor),
    publishedAt: toIso(data.publishedAt),
    finalText: data.finalText ?? "",
    hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
    mentions: Array.isArray(data.mentions) ? data.mentions : [],
    internalNotes: {
      rationale: data.internalNotes?.rationale ?? "",
      whyFit: data.internalNotes?.whyFit ?? ""
    }
  };
}

export function mapVersion(document: QueryDocumentSnapshot<DocumentData>): StudioPostVersion {
  const data = document.data();
  return {
    id: document.id,
    versionNumber: Number(data.versionNumber ?? 1),
    text: data.text ?? "",
    feedbackApplied: data.feedbackApplied ?? "",
    createdAt: toIso(data.createdAt)
  };
}
