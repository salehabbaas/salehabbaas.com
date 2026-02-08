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
      roleTitle: data.roleTitle ?? "",
      salaryRate: data.salaryRate ?? "",
      jobAdvertUrl: data.jobAdvertUrl ?? "",
      applicationDate: data.applicationDate ?? "",
      contact: data.contact ?? "",
      response: data.response ?? "No response",
      interviewStage: data.interviewStage ?? "None",
      interviewDate: data.interviewDate ?? "",
      interviewTime: data.interviewTime ?? "",
      interviewerName: data.interviewerName ?? "",
      offer: data.offer ?? "",
      notes: data.notes ?? "",
      createdAt: asIso(data.createdAt),
      updatedAt: asIso(data.updatedAt)
    } satisfies JobApplication;
  });
}
