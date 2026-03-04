import { adminDb } from "../lib/admin";

export async function writeNotification(input: {
  userId: string;
  type: "task_reminder" | "new_job_found" | "email_status_update" | "export_ready";
  title: string;
  body: string;
  linkUrl: string;
}) {
  await adminDb.collection("notifications").add({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    linkUrl: input.linkUrl,
    isRead: false,
    createdAt: new Date()
  });
}

export async function writeAuditLog(input: {
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  await adminDb.collection("auditLogs").add({
    module: "job-tracker",
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    summary: input.summary,
    actorUid: input.userId,
    actorEmail: "",
    metadata: input.metadata ?? {},
    createdAt: new Date()
  });
}
