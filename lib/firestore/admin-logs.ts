import "server-only";

import { toIso } from "@/lib/admin/audit";
import { adminDb } from "@/lib/firebase/admin";

const LOG_LIMIT = 120;
const TIMELINE_LIMIT = 160;

type AuditLogRow = {
  id: string;
  module: string;
  action: string;
  summary: string;
  actorEmail: string;
  targetType: string;
  targetId: string;
  createdAt: string;
};

type AdminAccessLogRow = {
  id: string;
  eventType: string;
  actorEmail: string;
  actorUid: string;
  deviceType: string;
  browser: string;
  country: string;
  city: string;
  ipMasked: string;
  path: string;
  createdAt: string;
};

type EmailActivityRow = {
  id: string;
  status: string;
  provider: string;
  senderEmail: string;
  recipient: string;
  subject: string;
  module: string;
  templateId: string;
  trigger: string;
  source: string;
  attachmentCount: number;
  errorMessage: string;
  createdAt: string;
};

type ActivityRow = {
  id: string;
  action: string;
  actorId: string;
  projectId: string;
  taskId: string;
  ownerId: string;
  entityType: string;
  entityId: string;
  from: string;
  to: string;
  createdAt: string;
};

type LogTimelineRow = {
  id: string;
  type: "audit" | "access" | "email" | "activity";
  title: string;
  detail: string;
  createdAt: string;
};

export type AdminLogsSummary = {
  locations: {
    audit: string;
    adminAccess: string;
    email: string;
    activity: string;
  };
  metrics: {
    latestEventAt: string;
    auditActions: number;
    accessEvents: number;
    emailSent: number;
    emailFailed: number;
    activityEvents: number;
  };
  audit: AuditLogRow[];
  adminAccess: AdminAccessLogRow[];
  email: EmailActivityRow[];
  activity: ActivityRow[];
  timeline: LogTimelineRow[];
};

function sortByCreatedAtDesc<T extends { createdAt: string }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const aTime = Date.parse(a.createdAt || "");
    const bTime = Date.parse(b.createdAt || "");
    return bTime - aTime;
  });
}

export async function getAdminLogsSummary(): Promise<AdminLogsSummary> {
  const [auditSnap, accessSnap, emailSnap, activitySnap] = await Promise.all([
    adminDb.collection("auditLogs").orderBy("createdAt", "desc").limit(LOG_LIMIT).get(),
    adminDb.collection("adminAccessLogs").orderBy("createdAt", "desc").limit(LOG_LIMIT).get(),
    adminDb.collection("emailActivity").orderBy("createdAt", "desc").limit(LOG_LIMIT).get(),
    adminDb.collection("activity").orderBy("createdAt", "desc").limit(LOG_LIMIT).get()
  ]);

  const audit = auditSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      module: String(data.module ?? ""),
      action: String(data.action ?? ""),
      summary: String(data.summary ?? ""),
      actorEmail: String(data.actorEmail ?? ""),
      targetType: String(data.targetType ?? ""),
      targetId: String(data.targetId ?? ""),
      createdAt: toIso(data.createdAt)
    } satisfies AuditLogRow;
  });

  const adminAccess = accessSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      eventType: String(data.eventType ?? ""),
      actorEmail: String(data.actorEmail ?? ""),
      actorUid: String(data.actorUid ?? ""),
      deviceType: String(data.deviceType ?? ""),
      browser: String(data.browser ?? ""),
      country: String(data.country ?? ""),
      city: String(data.city ?? ""),
      ipMasked: String(data.ipMasked ?? ""),
      path: String(data.path ?? ""),
      createdAt: toIso(data.createdAt)
    } satisfies AdminAccessLogRow;
  });

  const email = emailSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      status: String(data.status ?? ""),
      provider: String(data.provider ?? ""),
      senderEmail: String(data.senderEmail ?? ""),
      recipient: String(data.recipient ?? ""),
      subject: String(data.subject ?? ""),
      module: String(data.module ?? ""),
      templateId: String(data.templateId ?? ""),
      trigger: String(data.trigger ?? ""),
      source: String(data.source ?? ""),
      attachmentCount: Number(data.attachmentCount ?? 0),
      errorMessage: String(data.errorMessage ?? ""),
      createdAt: toIso(data.createdAt)
    } satisfies EmailActivityRow;
  });

  const activity = activitySnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      action: String(data.action ?? ""),
      actorId: String(data.actorId ?? ""),
      projectId: String(data.projectId ?? ""),
      taskId: String(data.taskId ?? ""),
      ownerId: String(data.ownerId ?? ""),
      entityType: String(data.entityType ?? ""),
      entityId: String(data.entityId ?? ""),
      from: String(data.from ?? ""),
      to: String(data.to ?? ""),
      createdAt: toIso(data.createdAt)
    } satisfies ActivityRow;
  });

  const timeline = sortByCreatedAtDesc([
    ...audit.map((row) => ({
      id: `audit-${row.id}`,
      type: "audit" as const,
      title: row.summary || "Audit action",
      detail: [row.module, row.action, row.actorEmail || "system"].filter(Boolean).join(" · "),
      createdAt: row.createdAt
    })),
    ...adminAccess.map((row) => ({
      id: `access-${row.id}`,
      type: "access" as const,
      title: `${row.eventType.toUpperCase() || "ACCESS"} ${row.actorEmail || row.actorUid || "unknown"}`,
      detail: [row.deviceType || "unknown", row.browser || "unknown", row.country || "unknown", row.ipMasked || "n/a"].join(" · "),
      createdAt: row.createdAt
    })),
    ...email.map((row) => ({
      id: `email-${row.id}`,
      type: "email" as const,
      title: `${row.status.toUpperCase() || "EMAIL"} ${row.subject || "No subject"}`,
      detail: [row.recipient || "unknown recipient", row.provider || "unknown provider"].join(" · "),
      createdAt: row.createdAt
    })),
    ...activity.map((row) => ({
      id: `activity-${row.id}`,
      type: "activity" as const,
      title: row.action || "Activity event",
      detail: [row.projectId || row.ownerId || "unknown", row.taskId || row.entityId || ""].filter(Boolean).join(" · "),
      createdAt: row.createdAt
    }))
  ]).slice(0, TIMELINE_LIMIT);

  return {
    locations: {
      audit: "auditLogs",
      adminAccess: "adminAccessLogs",
      email: "emailActivity",
      activity: "activity"
    },
    metrics: {
      latestEventAt: timeline[0]?.createdAt ?? "",
      auditActions: audit.length,
      accessEvents: adminAccess.length,
      emailSent: email.filter((row) => row.status === "sent").length,
      emailFailed: email.filter((row) => row.status === "failed").length,
      activityEvents: activity.length
    },
    audit,
    adminAccess,
    email,
    activity,
    timeline
  };
}
