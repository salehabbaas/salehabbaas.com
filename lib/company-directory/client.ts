import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type FirestoreError,
  type Unsubscribe
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { normalizeCompanyInput, normalizeCompanyNameKey } from "@/lib/company-directory/utils";
import type { JobTrackerCompanyRecord } from "@/types/resume-studio";

function asIso(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return "";
}

function mapCompany(documentId: string, data: Record<string, unknown>): JobTrackerCompanyRecord {
  return {
    id: documentId,
    ownerId: String(data.ownerId ?? ""),
    name: String(data.name ?? ""),
    normalizedName: String(data.normalizedName ?? ""),
    city: typeof data.city === "string" ? data.city : "",
    companyType: typeof data.companyType === "string" ? data.companyType : "",
    careersUrl: typeof data.careersUrl === "string" ? data.careersUrl : "",
    websiteUrl: typeof data.websiteUrl === "string" ? data.websiteUrl : "",
    notes: typeof data.notes === "string" ? data.notes : "",
    lastCheckedAt: asIso(data.lastCheckedAt),
    lastCheckNote: typeof data.lastCheckNote === "string" ? data.lastCheckNote : "",
    createdAt: asIso(data.createdAt),
    updatedAt: asIso(data.updatedAt)
  } satisfies JobTrackerCompanyRecord;
}

export type CompanyUpsertInput = {
  name: string;
  city?: string;
  companyType?: string;
  careersUrl?: string;
  websiteUrl?: string;
  notes?: string;
};

export function subscribeTrackedCompanies(
  ownerId: string,
  onChange: (companies: JobTrackerCompanyRecord[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const companyQuery = query(collection(db, "trackedCompanies"), where("ownerId", "==", ownerId), orderBy("updatedAt", "desc"));
  return onSnapshot(
    companyQuery,
    (snap) => {
      onChange(snap.docs.map((entry) => mapCompany(entry.id, entry.data() as Record<string, unknown>)));
    },
    (error) => {
      onError?.(error);
      if (error.code === "permission-denied") {
        onChange([]);
      }
    }
  );
}

export async function createTrackedCompany(ownerId: string, input: CompanyUpsertInput) {
  const payload = normalizeCompanyInput(input);
  if (!payload.name || !payload.normalizedName) {
    throw new Error("Company name is required");
  }

  const ref = await addDoc(collection(db, "trackedCompanies"), {
    ownerId,
    ...payload,
    lastCheckedAt: null,
    lastCheckNote: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  const created = await getDoc(ref);
  if (!created.exists()) {
    throw new Error("Unable to load created company");
  }

  return mapCompany(created.id, created.data() as Record<string, unknown>);
}

export async function updateTrackedCompany(companyId: string, patch: Partial<CompanyUpsertInput>) {
  const trimmedName = patch.name?.trim();
  const next: Record<string, unknown> = {
    ...patch,
    updatedAt: serverTimestamp()
  };

  if (typeof patch.name === "string") {
    next.name = trimmedName || "";
    next.normalizedName = normalizeCompanyNameKey(trimmedName || "");
  }

  await updateDoc(doc(db, "trackedCompanies", companyId), next);
}

export async function markCompanyChecked(companyId: string, note?: string) {
  await updateDoc(doc(db, "trackedCompanies", companyId), {
    lastCheckedAt: serverTimestamp(),
    lastCheckNote: note?.trim() || "",
    updatedAt: serverTimestamp()
  });
}

export async function ensureCompanyByName(ownerId: string, input: CompanyUpsertInput) {
  const normalized = normalizeCompanyNameKey(input.name);
  if (!normalized) {
    throw new Error("Company name is required");
  }

  const existingSnap = await getDocs(
    query(
      collection(db, "trackedCompanies"),
      where("ownerId", "==", ownerId),
      where("normalizedName", "==", normalized),
      limit(1)
    )
  );

  if (!existingSnap.empty) {
    const existing = existingSnap.docs[0];
    return mapCompany(existing.id, existing.data() as Record<string, unknown>);
  }

  return createTrackedCompany(ownerId, input);
}
