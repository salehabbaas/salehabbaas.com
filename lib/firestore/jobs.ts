import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { JobApplication } from "@/types/job";

function asIso(input: unknown): string | undefined {
  if (!input) return undefined;
  if (typeof input === "string") return input;
  if (input instanceof Date) return input.toISOString();
  if (typeof input === "object" && input && "toDate" in input && typeof input.toDate === "function") {
    return input.toDate().toISOString();
  }
  return undefined;
}

export async function getJobApplications() {
  const snap = await adminDb.collection("jobApplications").orderBy("updatedAt", "desc").get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      company: data.company ?? "",
      role: data.role ?? "",
      status: data.status ?? "saved",
      location: data.location ?? "",
      workModel: data.workModel ?? "remote",
      source: data.source ?? "",
      jobUrl: data.jobUrl ?? "",
      salaryRange: data.salaryRange ?? "",
      contactName: data.contactName ?? "",
      contactEmail: data.contactEmail ?? "",
      appliedDate: asIso(data.appliedDate),
      nextStepDate: asIso(data.nextStepDate),
      notes: data.notes ?? "",
      createdAt: asIso(data.createdAt),
      updatedAt: asIso(data.updatedAt)
    } satisfies JobApplication;
  });
}
