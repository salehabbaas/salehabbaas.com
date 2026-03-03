import "server-only";

import type { DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";
import { normalizeResumeDocumentRecord, normalizeResumeTemplateRecord } from "@/lib/resume-studio/normalize";
import type {
  JobResumeLinkRecord,
  JobTrackerCompanyRecord,
  JobTrackerJobRecord,
  ResumeActivityRecord,
  ResumeDocumentRecord,
  ResumeTemplateRecord,
  ResumeVersionRecord
} from "@/types/resume-studio";

function asIso(input: unknown): string | undefined {
  if (!input) return undefined;
  if (typeof input === "string") return input;
  if (input instanceof Date) return input.toISOString();
  if (typeof input === "object" && input && "toDate" in input && typeof input.toDate === "function") {
    return input.toDate().toISOString();
  }
  return undefined;
}

function docToResume(doc: QueryDocumentSnapshot<DocumentData>): ResumeDocumentRecord {
  return normalizeResumeDocumentRecord({
    id: doc.id,
    data: doc.data()
  });
}

function mapJob(doc: QueryDocumentSnapshot<DocumentData>): JobTrackerJobRecord {
  const data = doc.data();
  return {
    id: doc.id,
    ownerId: String(data.ownerId ?? ""),
    companyId: typeof data.companyId === "string" ? data.companyId : undefined,
    company: String(data.company ?? ""),
    title: String(data.title ?? ""),
    location: typeof data.location === "string" ? data.location : "",
    jobUrl: typeof data.jobUrl === "string" ? data.jobUrl : "",
    status: (["saved", "applied", "interviewing", "offer", "rejected", "archived"] as const).includes(data.status)
      ? data.status
      : "saved",
    appliedAt: asIso(data.appliedAt),
    nextFollowUpAt: asIso(data.nextFollowUpAt),
    descriptionText: String(data.descriptionText ?? ""),
    descriptionSource: ["paste", "url", "import"].includes(String(data.descriptionSource))
      ? (data.descriptionSource as JobTrackerJobRecord["descriptionSource"])
      : "paste",
    tags: Array.isArray(data.tags) ? data.tags.filter((item: unknown): item is string => typeof item === "string") : [],
    createdAt: asIso(data.createdAt),
    updatedAt: asIso(data.updatedAt)
  };
}

function mapCompany(doc: QueryDocumentSnapshot<DocumentData>): JobTrackerCompanyRecord {
  const data = doc.data();
  return {
    id: doc.id,
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
  };
}

function mapJobLink(doc: QueryDocumentSnapshot<DocumentData>): JobResumeLinkRecord {
  const data = doc.data();
  return {
    id: doc.id,
    ownerId: String(data.ownerId ?? ""),
    jobId: String(data.jobId ?? ""),
    docId: String(data.docId ?? ""),
    createdAt: asIso(data.createdAt),
    atsScore: typeof data.atsScore === "number" ? data.atsScore : undefined,
    notes: typeof data.notes === "string" ? data.notes : ""
  };
}

function mapActivity(doc: QueryDocumentSnapshot<DocumentData>): ResumeActivityRecord {
  const data = doc.data();
  const rawEntityType = String(data.entityType ?? "").trim();
  return {
    id: doc.id,
    ownerId: String(data.ownerId ?? ""),
    entityType: rawEntityType === "job" ? "job" : rawEntityType === "company" ? "company" : "resumeDocument",
    entityId: String(data.entityId ?? ""),
    action: String(data.action ?? ""),
    from: typeof data.from === "string" ? data.from : "",
    to: typeof data.to === "string" ? data.to : "",
    createdAt: asIso(data.createdAt)
  };
}

function mapTemplate(doc: QueryDocumentSnapshot<DocumentData>): ResumeTemplateRecord {
  return normalizeResumeTemplateRecord({
    id: doc.id,
    data: doc.data()
  });
}

export async function getResumeDocuments(ownerId: string) {
  const snap = await adminDb.collection("resumeDocuments").where("ownerId", "==", ownerId).orderBy("updatedAt", "desc").get();
  return snap.docs.map(docToResume);
}

export async function getResumeDocument(docId: string) {
  const snap = await adminDb.collection("resumeDocuments").doc(docId).get();
  if (!snap.exists) return null;
  return docToResume(snap as QueryDocumentSnapshot<DocumentData>);
}

export async function getResumeTemplate(templateId: string) {
  const snap = await adminDb.collection("resumeTemplates").doc(templateId).get();
  if (!snap.exists) return null;
  return mapTemplate(snap as QueryDocumentSnapshot<DocumentData>);
}

export async function getResumeTemplates(ownerId: string) {
  const snap = await adminDb.collection("resumeTemplates").where("ownerId", "==", ownerId).orderBy("updatedAt", "desc").get();
  return snap.docs.map(mapTemplate);
}

export async function getResumeVersions(ownerId: string, docId: string) {
  const snap = await adminDb
    .collection("resumeVersions")
    .where("ownerId", "==", ownerId)
    .where("docId", "==", docId)
    .orderBy("createdAt", "desc")
    .limit(30)
    .get();

  return snap.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id,
      ownerId: String(data.ownerId ?? ""),
      docId: String(data.docId ?? ""),
      createdAt: asIso(data.createdAt),
      note: typeof data.note === "string" ? data.note : "",
      snapshot: (data.snapshot ?? {}) as ResumeVersionRecord["snapshot"]
    } satisfies ResumeVersionRecord;
  });
}

export async function getJobTrackerJobs(ownerId: string) {
  const snap = await adminDb.collection("jobTrackerJobs").where("ownerId", "==", ownerId).orderBy("updatedAt", "desc").get();
  return snap.docs.map(mapJob);
}

export async function getJobTrackerJob(jobId: string) {
  const snap = await adminDb.collection("jobTrackerJobs").doc(jobId).get();
  if (!snap.exists) return null;
  return mapJob(snap as QueryDocumentSnapshot<DocumentData>);
}

export async function getTrackedCompanies(ownerId: string) {
  const snap = await adminDb.collection("trackedCompanies").where("ownerId", "==", ownerId).orderBy("updatedAt", "desc").get();
  return snap.docs.map(mapCompany);
}

export async function getTrackedCompany(companyId: string) {
  const snap = await adminDb.collection("trackedCompanies").doc(companyId).get();
  if (!snap.exists) return null;
  return mapCompany(snap as QueryDocumentSnapshot<DocumentData>);
}

export async function getJobResumeLinks(ownerId: string) {
  const snap = await adminDb.collection("jobResumeLinks").where("ownerId", "==", ownerId).orderBy("createdAt", "desc").get();
  return snap.docs.map(mapJobLink);
}

export async function getJobResumeLinksByJob(ownerId: string, jobId: string) {
  const snap = await adminDb
    .collection("jobResumeLinks")
    .where("ownerId", "==", ownerId)
    .where("jobId", "==", jobId)
    .orderBy("createdAt", "desc")
    .get();

  return snap.docs.map(mapJobLink);
}

export async function getActivityForEntity(ownerId: string, entityType: ResumeActivityRecord["entityType"], entityId: string) {
  const snap = await adminDb
    .collection("activity")
    .where("ownerId", "==", ownerId)
    .where("entityType", "==", entityType)
    .where("entityId", "==", entityId)
    .orderBy("createdAt", "desc")
    .limit(40)
    .get();

  return snap.docs.map(mapActivity);
}

export async function writeResumeActivity(input: {
  ownerId: string;
  entityType: ResumeActivityRecord["entityType"];
  entityId: string;
  action: string;
  from?: string;
  to?: string;
}) {
  await adminDb.collection("activity").add({
    ownerId: input.ownerId,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    from: input.from ?? "",
    to: input.to ?? "",
    createdAt: new Date()
  });
}

export async function saveResumeVersion(input: {
  docId: string;
  ownerId: string;
  snapshot: Omit<ResumeDocumentRecord, "id">;
  note?: string;
}) {
  await adminDb.collection("resumeVersions").add({
    docId: input.docId,
    ownerId: input.ownerId,
    createdAt: new Date(),
    note: input.note ?? "",
    snapshot: input.snapshot
  });
}
