"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type FirestoreError,
  type QueryConstraint,
  type Unsubscribe
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { db, storage } from "@/lib/firebase/client";
import {
  COMPANY_CATEGORY_SEED,
  type CompanyCategoryRecord,
  type CompanyRecord,
  type DocumentRecord,
  type EmailAiResultRecord,
  type EmailMessageRecord,
  type InterviewRecord,
  type JobRecord,
  type JobStatus,
  type MonthlyExportRecord,
  type NotificationRecord,
  type TaskRecord
} from "@/types/job-tracker-system";

function asIso(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return "";
}

function asBool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function toDateOrNull(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

async function sha256Hex(value: string) {
  if (!value) return "";

  try {
    const encoder = new TextEncoder();
    const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(value));
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return `fallback_${Math.abs(hash)}`;
  }
}

function sortByDateDesc<T extends { createdAt?: string; uploadedAt?: string }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const aValue = a.createdAt ?? a.uploadedAt;
    const bValue = b.createdAt ?? b.uploadedAt;
    const aTime = aValue ? new Date(aValue).getTime() : 0;
    const bTime = bValue ? new Date(bValue).getTime() : 0;
    return bTime - aTime;
  });
}

function observeByPolling<T>(input: {
  run: () => Promise<T>;
  onData: (data: T) => void;
  onError?: (error: FirestoreError) => void;
  intervalMs?: number;
}): Unsubscribe {
  const intervalMs = input.intervalMs ?? 10000;
  let active = true;

  const tick = async () => {
    try {
      const data = await input.run();
      if (!active) return;
      input.onData(data);
    } catch (error) {
      if (!active) return;
      input.onError?.(error as FirestoreError);
    }
  };

  void tick();
  const timer = window.setInterval(() => {
    void tick();
  }, intervalMs);

  return () => {
    active = false;
    window.clearInterval(timer);
  };
}

export function subscribeCompanyCategories(
  onChange: (items: CompanyCategoryRecord[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  return observeByPolling({
    run: async () => {
      const snap = await getDocs(collection(db, "companyCategories"));
      const categories = snap.docs.map((entry) => {
        const data = entry.data();
        return {
          id: entry.id,
          name: asString(data.name),
          createdAt: asIso(data.createdAt)
        } satisfies CompanyCategoryRecord;
      });
      return categories.sort((a, b) => a.name.localeCompare(b.name));
    },
    onData: onChange,
    onError
  });
}

export async function seedCompanyCategoriesIfMissing() {
  const snap = await getDocs(collection(db, "companyCategories"));
  const existing = new Set(
    snap.docs.map((entry) => asString(entry.data().name).trim().toLowerCase()).filter(Boolean)
  );
  const missing = COMPANY_CATEGORY_SEED.filter((name) => !existing.has(name.toLowerCase()));

  if (missing.length === 0) return;

  await Promise.all(
    missing.map((name) =>
      addDoc(collection(db, "companyCategories"), {
        name,
        createdAt: serverTimestamp()
      })
    )
  );
}

export async function createCompanyCategory(name: string) {
  const cleanName = name.trim();
  if (!cleanName) {
    throw new Error("Category name is required.");
  }

  const normalized = cleanName.toLowerCase();
  const existingSnap = await getDocs(collection(db, "companyCategories"));
  const alreadyExists = existingSnap.docs.some(
    (entry) => asString(entry.data().name).trim().toLowerCase() === normalized
  );

  if (alreadyExists) {
    throw new Error("Category already exists.");
  }

  const ref = await addDoc(collection(db, "companyCategories"), {
    name: cleanName,
    createdAt: serverTimestamp()
  });

  return ref.id;
}

export function subscribeCompanies(
  userId: string,
  onChange: (items: CompanyRecord[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const q = query(collection(db, "companies"), where("userId", "==", userId));
  return observeByPolling({
    run: async () => {
      const snap = await getDocs(q);
      const rows = snap.docs.map((entry) => {
        const data = entry.data();
        return {
          id: entry.id,
          userId: asString(data.userId),
          name: asString(data.name),
          categoryId: asString(data.categoryId),
          websiteUrl: asString(data.websiteUrl),
          careerPageUrl: asString(data.careerPageUrl),
          notes: asString(data.notes),
          lastCheckedAt: asIso(data.lastCheckedAt),
          watchEnabled: asBool(data.watchEnabled, false),
          watchFrequency: ["daily", "twiceDaily", "weekly"].includes(asString(data.watchFrequency))
            ? (data.watchFrequency as CompanyRecord["watchFrequency"])
            : "daily",
          lastScanAt: asIso(data.lastScanAt),
          createdAt: asIso(data.createdAt),
          updatedAt: asIso(data.updatedAt)
        } satisfies CompanyRecord;
      });

      return sortByDateDesc(rows);
    },
    onData: onChange,
    onError
  });
}

export async function createCompany(
  input: Omit<CompanyRecord, "id" | "createdAt" | "updatedAt" | "lastCheckedAt" | "lastScanAt">
) {
  const payload = {
    userId: input.userId,
    name: input.name.trim(),
    categoryId: input.categoryId,
    websiteUrl: input.websiteUrl.trim(),
    careerPageUrl: input.careerPageUrl.trim(),
    notes: input.notes.trim(),
    watchEnabled: Boolean(input.watchEnabled),
    watchFrequency: input.watchFrequency || "daily",
    lastCheckedAt: null,
    lastScanAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const ref = await addDoc(collection(db, "companies"), payload);
  return ref.id;
}

export async function updateCompany(companyId: string, patch: Partial<CompanyRecord>) {
  const next: Record<string, unknown> = {
    updatedAt: serverTimestamp()
  };

  if (typeof patch.name === "string") next.name = patch.name.trim();
  if (typeof patch.categoryId === "string") next.categoryId = patch.categoryId;
  if (typeof patch.websiteUrl === "string") next.websiteUrl = patch.websiteUrl.trim();
  if (typeof patch.careerPageUrl === "string") next.careerPageUrl = patch.careerPageUrl.trim();
  if (typeof patch.notes === "string") next.notes = patch.notes;
  if (typeof patch.watchEnabled === "boolean") next.watchEnabled = patch.watchEnabled;
  if (typeof patch.watchFrequency === "string") next.watchFrequency = patch.watchFrequency;

  await updateDoc(doc(db, "companies", companyId), next);
}

export async function deleteCompany(companyId: string) {
  await deleteDoc(doc(db, "companies", companyId));
}

function mapJob(id: string, data: Record<string, unknown>): JobRecord {
  const status = asString(data.status).toUpperCase();
  const sourceType = asString(data.sourceType);

  return {
    id,
    userId: asString(data.userId),
    companyId: asString(data.companyId),
    roleTitle: asString(data.roleTitle),
    jobUrl: asString(data.jobUrl),
    location: asString(data.location),
    salaryRateText: asString(data.salaryRateText),
    status: ["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED"].includes(status)
      ? (status as JobStatus)
      : "SAVED",
    applicationDate: asIso(data.applicationDate),
    deadline: asIso(data.deadline),
    sourceType: ["manual", "url_import", "ai_intake", "email"].includes(sourceType)
      ? (sourceType as JobRecord["sourceType"])
      : "manual",
    resumeStudioDocId: typeof data.resumeStudioDocId === "string" ? data.resumeStudioDocId : null,
    notes: asString(data.notes),
    createdAt: asIso(data.createdAt),
    updatedAt: asIso(data.updatedAt)
  };
}

export function subscribeJobs(
  userId: string,
  onChange: (items: JobRecord[]) => void,
  onError?: (error: FirestoreError) => void,
  extraConstraints: QueryConstraint[] = []
): Unsubscribe {
  const q = query(collection(db, "jobs"), where("userId", "==", userId), ...extraConstraints);
  return observeByPolling({
    run: async () => {
      const snap = await getDocs(q);
      const rows = snap.docs.map((entry) => mapJob(entry.id, entry.data() as Record<string, unknown>));
      return sortByDateDesc(rows);
    },
    onData: onChange,
    onError
  });
}

export async function findCompanyByName(userId: string, companyName: string) {
  const normalized = companyName.trim().toLowerCase();
  if (!normalized) return null;

  const snap = await getDocs(query(collection(db, "companies"), where("userId", "==", userId)));
  const match = snap.docs.find((entry) => asString(entry.data().name).trim().toLowerCase() === normalized);

  if (!match) return null;
  return {
    id: match.id,
    ...(match.data() as Record<string, unknown>)
  };
}

export async function createJob(input: Omit<JobRecord, "id" | "createdAt" | "updatedAt">) {
  const cleanUrl = input.jobUrl.trim();
  const jobUrlHash = await sha256Hex(cleanUrl);

  if (cleanUrl) {
    const existingSnap = await getDocs(query(collection(db, "jobs"), where("userId", "==", input.userId)));
    const alreadyExists = existingSnap.docs.some((entry) => {
      const data = entry.data();
      const existingHash = asString(data.jobUrlHash);
      const existingUrl = asString(data.jobUrl).trim();
      if (existingHash && jobUrlHash) {
        return existingHash === jobUrlHash;
      }
      return existingUrl === cleanUrl;
    });
    if (alreadyExists) {
      throw new Error("A job with this URL already exists.");
    }
  }

  const ref = await addDoc(collection(db, "jobs"), {
    userId: input.userId,
    companyId: input.companyId,
    roleTitle: input.roleTitle.trim(),
    jobUrl: cleanUrl,
    location: input.location.trim(),
    salaryRateText: input.salaryRateText.trim(),
    status: input.status,
    applicationDate: toDateOrNull(input.applicationDate),
    deadline: toDateOrNull(input.deadline),
    jobUrlHash,
    sourceType: input.sourceType,
    resumeStudioDocId: input.resumeStudioDocId,
    notes: input.notes?.trim() || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await addDoc(collection(db, "jobStatusHistory"), {
    userId: input.userId,
    jobId: ref.id,
    fromStatus: "UNKNOWN",
    toStatus: input.status,
    reason: "Job created",
    createdAt: serverTimestamp()
  });

  return ref.id;
}

export async function updateJob(jobId: string, patch: Partial<JobRecord>) {
  const next: Record<string, unknown> = {
    updatedAt: serverTimestamp()
  };

  if (typeof patch.companyId === "string") next.companyId = patch.companyId;
  if (typeof patch.roleTitle === "string") next.roleTitle = patch.roleTitle.trim();
  if (typeof patch.jobUrl === "string") {
    const cleanUrl = patch.jobUrl.trim();
    next.jobUrl = cleanUrl;
    next.jobUrlHash = await sha256Hex(cleanUrl);
  }
  if (typeof patch.location === "string") next.location = patch.location.trim();
  if (typeof patch.salaryRateText === "string") next.salaryRateText = patch.salaryRateText.trim();
  if (typeof patch.status === "string") next.status = patch.status;
  if (typeof patch.sourceType === "string") next.sourceType = patch.sourceType;
  if ("resumeStudioDocId" in patch) next.resumeStudioDocId = patch.resumeStudioDocId ?? null;
  if (typeof patch.notes === "string") next.notes = patch.notes;
  if (patch.applicationDate !== undefined) next.applicationDate = toDateOrNull(patch.applicationDate);
  if (patch.deadline !== undefined) next.deadline = toDateOrNull(patch.deadline);

  await updateDoc(doc(db, "jobs", jobId), next);
}

export async function updateJobStatusWithHistory(input: {
  userId: string;
  jobId: string;
  fromStatus: JobStatus;
  toStatus: JobStatus;
  reason: string;
}) {
  await Promise.all([
    updateDoc(doc(db, "jobs", input.jobId), {
      status: input.toStatus,
      updatedAt: serverTimestamp()
    }),
    addDoc(collection(db, "jobStatusHistory"), {
      userId: input.userId,
      jobId: input.jobId,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      reason: input.reason,
      createdAt: serverTimestamp()
    })
  ]);
}

export async function deleteJob(jobId: string) {
  await deleteDoc(doc(db, "jobs", jobId));
}

export function subscribeInterviewsForJob(
  userId: string,
  jobId: string,
  onChange: (items: InterviewRecord[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const q = query(collection(db, "interviews"), where("userId", "==", userId));
  return observeByPolling({
    run: async () => {
      const snap = await getDocs(q);
      const rows = snap.docs.map((entry) => {
        const data = entry.data();
        return {
          id: entry.id,
          userId: asString(data.userId),
          jobId: asString(data.jobId),
          stage: ["Screen", "Technical", "HR", "Onsite", "Final", "Other"].includes(asString(data.stage))
            ? (data.stage as InterviewRecord["stage"])
            : "Other",
          interviewDateTime: asIso(data.interviewDateTime),
          mode: ["Zoom", "Phone", "Onsite", "Other"].includes(asString(data.mode)) ? (data.mode as InterviewRecord["mode"]) : "Other",
          interviewerName: asString(data.interviewerName),
          meetingLink: asString(data.meetingLink),
          notes: asString(data.notes),
          createdAt: asIso(data.createdAt)
        } satisfies InterviewRecord;
      });
      return sortByDateDesc(rows.filter((entry) => entry.jobId === jobId));
    },
    onData: onChange,
    onError
  });
}

export async function createInterview(input: Omit<InterviewRecord, "id" | "createdAt">) {
  await addDoc(collection(db, "interviews"), {
    ...input,
    interviewDateTime: toDateOrNull(input.interviewDateTime),
    createdAt: serverTimestamp()
  });
}

export function subscribeTasksForJob(
  userId: string,
  jobId: string,
  onChange: (items: TaskRecord[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const q = query(collection(db, "tasks"), where("userId", "==", userId));
  return observeByPolling({
    run: async () => {
      const snap = await getDocs(q);
      const rows = snap.docs.map((entry) => {
        const data = entry.data();
        return {
          id: entry.id,
          userId: asString(data.userId),
          jobId: asString(data.jobId),
          title: asString(data.title),
          dueDateTime: asIso(data.dueDateTime),
          reminderAt: asIso(data.reminderAt),
          reminderSentAt: asIso(data.reminderSentAt) || null,
          isCompleted: asBool(data.isCompleted, false),
          createdAt: asIso(data.createdAt),
          updatedAt: asIso(data.updatedAt)
        } satisfies TaskRecord;
      });
      return sortByDateDesc(rows.filter((entry) => entry.jobId === jobId));
    },
    onData: onChange,
    onError
  });
}

export async function createTask(input: Omit<TaskRecord, "id" | "createdAt" | "updatedAt" | "reminderSentAt">) {
  await addDoc(collection(db, "tasks"), {
    userId: input.userId,
    jobId: input.jobId,
    title: input.title.trim(),
    dueDateTime: toDateOrNull(input.dueDateTime),
    reminderAt: toDateOrNull(input.reminderAt),
    reminderSentAt: null,
    isCompleted: Boolean(input.isCompleted),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function toggleTaskCompletion(taskId: string, isCompleted: boolean) {
  await updateDoc(doc(db, "tasks", taskId), {
    isCompleted,
    updatedAt: serverTimestamp()
  });
}

export function subscribeDocumentsForJob(
  userId: string,
  jobId: string,
  onChange: (items: DocumentRecord[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const q = query(collection(db, "documents"), where("userId", "==", userId));
  return observeByPolling({
    run: async () => {
      const snap = await getDocs(q);
      const rows = snap.docs.map((entry) => {
        const data = entry.data();
        return {
          id: entry.id,
          userId: asString(data.userId),
          jobId: typeof data.jobId === "string" ? data.jobId : null,
          type: ["resume", "cover_letter", "other", "export"].includes(asString(data.type))
            ? (data.type as DocumentRecord["type"])
            : "other",
          storagePath: asString(data.storagePath),
          fileUrl: asString(data.fileUrl),
          uploadedAt: asIso(data.uploadedAt)
        } satisfies DocumentRecord;
      });
      return sortByDateDesc(rows.filter((entry) => entry.jobId === jobId));
    },
    onData: onChange,
    onError
  });
}

export async function uploadJobDocument(input: {
  userId: string;
  jobId: string;
  file: File;
  type: DocumentRecord["type"];
}) {
  const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `job-tracker/${input.userId}/jobs/${input.jobId}/${Date.now()}-${safeName}`;
  const objectRef = ref(storage, path);
  await uploadBytes(objectRef, input.file, {
    contentType: input.file.type || "application/octet-stream"
  });

  const fileUrl = await getDownloadURL(objectRef);
  const docRef = await addDoc(collection(db, "documents"), {
    userId: input.userId,
    jobId: input.jobId,
    type: input.type,
    storagePath: path,
    fileUrl,
    uploadedAt: serverTimestamp()
  });

  return {
    docId: docRef.id,
    storagePath: path,
    fileUrl
  };
}

export async function createEmailMessage(input: Omit<EmailMessageRecord, "id" | "createdAt">) {
  const ref = await addDoc(collection(db, "emailMessages"), {
    userId: input.userId,
    subject: input.subject.trim(),
    fromEmail: input.fromEmail.trim(),
    bodyText: input.bodyText,
    receivedAt: toDateOrNull(input.receivedAt),
    rawSource: input.rawSource,
    createdAt: serverTimestamp()
  });

  return ref.id;
}

export function subscribeEmailMessages(
  userId: string,
  onChange: (items: EmailMessageRecord[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const q = query(collection(db, "emailMessages"), where("userId", "==", userId));
  return observeByPolling({
    run: async () => {
      const snap = await getDocs(q);
      const rows = snap.docs.map((entry) => {
        const data = entry.data();
        return {
          id: entry.id,
          userId: asString(data.userId),
          subject: asString(data.subject),
          fromEmail: asString(data.fromEmail),
          bodyText: asString(data.bodyText),
          receivedAt: asIso(data.receivedAt),
          rawSource: ["pasted", "eml_upload", "forwarded"].includes(asString(data.rawSource))
            ? (data.rawSource as EmailMessageRecord["rawSource"])
            : "pasted",
          createdAt: asIso(data.createdAt)
        } satisfies EmailMessageRecord;
      });
      return sortByDateDesc(rows);
    },
    onData: onChange,
    onError
  });
}

export function subscribeEmailAiResults(
  userId: string,
  onChange: (items: EmailAiResultRecord[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const q = query(collection(db, "emailAiResults"), where("userId", "==", userId));
  return observeByPolling({
    run: async () => {
      const snap = await getDocs(q);
      const rows = snap.docs.map((entry) => {
        const data = entry.data();
        return {
          id: entry.id,
          userId: asString(data.userId),
          emailId: asString(data.emailId),
          detectedCompanyName: asString(data.detectedCompanyName),
          detectedJobTitle: asString(data.detectedJobTitle),
          detectedJobReferenceId: asString(data.detectedJobReferenceId),
          detectedStatus: ["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED", "UNKNOWN"].includes(asString(data.detectedStatus))
            ? (data.detectedStatus as EmailAiResultRecord["detectedStatus"])
            : "UNKNOWN",
          emailType: asString(data.emailType),
          interviewDetails:
            typeof data.interviewDetails === "object" && data.interviewDetails
              ? {
                  interview_datetime: asString((data.interviewDetails as Record<string, unknown>).interview_datetime),
                  interviewer_name: asString((data.interviewDetails as Record<string, unknown>).interviewer_name),
                  meeting_link: asString((data.interviewDetails as Record<string, unknown>).meeting_link),
                  interview_stage: asString((data.interviewDetails as Record<string, unknown>).interview_stage)
                }
              : undefined,
          actionRequired: asBool(data.actionRequired, false),
          confidence: typeof data.confidence === "number" ? data.confidence : 0,
          reasoning: asString(data.reasoning),
          matchedCompanyId: typeof data.matchedCompanyId === "string" ? data.matchedCompanyId : null,
          matchedJobId: typeof data.matchedJobId === "string" ? data.matchedJobId : null,
          createdAt: asIso(data.createdAt)
        } satisfies EmailAiResultRecord;
      });
      return sortByDateDesc(rows);
    },
    onData: onChange,
    onError
  });
}

export function subscribeNotifications(
  userId: string,
  onChange: (items: NotificationRecord[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const q = query(collection(db, "notifications"), where("userId", "==", userId));
  return observeByPolling({
    run: async () => {
      const snap = await getDocs(q);
      const rows = snap.docs.map((entry) => {
        const data = entry.data();
        return {
          id: entry.id,
          userId: asString(data.userId),
          type: ["task_reminder", "new_job_found", "email_status_update", "export_ready"].includes(asString(data.type))
            ? (data.type as NotificationRecord["type"])
            : "task_reminder",
          title: asString(data.title),
          body: asString(data.body),
          linkUrl: asString(data.linkUrl),
          isRead: asBool(data.isRead, false),
          createdAt: asIso(data.createdAt)
        } satisfies NotificationRecord;
      });
      return sortByDateDesc(rows);
    },
    onData: onChange,
    onError
  });
}

export async function markNotificationRead(notificationId: string, isRead = true) {
  await updateDoc(doc(db, "notifications", notificationId), {
    isRead,
    updatedAt: serverTimestamp()
  });
}

export function subscribeMonthlyExports(
  userId: string,
  onChange: (items: MonthlyExportRecord[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const q = query(collection(db, "monthlyExports"), where("userId", "==", userId));
  return observeByPolling({
    run: async () => {
      const snap = await getDocs(q);
      const rows = snap.docs.map((entry) => {
        const data = entry.data();
        return {
          id: entry.id,
          userId: asString(data.userId),
          month: asString(data.month),
          storagePath: asString(data.storagePath),
          fileUrl: asString(data.fileUrl),
          createdAt: asIso(data.createdAt)
        } satisfies MonthlyExportRecord;
      });
      return sortByDateDesc(rows);
    },
    onData: onChange,
    onError
  });
}

export async function getResumeDocumentIds(userId: string) {
  const snap = await getDocs(query(collection(db, "resumeDocuments"), where("ownerId", "==", userId)));
  return snap.docs.map((entry) => {
    const data = entry.data();
    return {
      id: entry.id,
      title: asString(data.title) || "Untitled Resume"
    };
  });
}

export async function createOrLoadUserDoc(userId: string, input: { name?: string; email?: string }) {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) return;

  await setDoc(userRef, {
    name: input.name?.trim() ?? "",
    email: input.email?.trim() ?? "",
    createdAt: serverTimestamp()
  });
}
