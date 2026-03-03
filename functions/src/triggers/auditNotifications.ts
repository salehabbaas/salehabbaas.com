import { onDocumentCreated } from "firebase-functions/v2/firestore";

import { createNotification } from "../lib/notifications/service";
import { getPrimaryAdminUid, getReminderRuntimeSettings } from "../lib/notifications/settings";

const FIRESTORE_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID || process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID || "salehabbaas";

const HIGH_RISK_ACTIONS = new Set([
  "delete",
  "task_deleted",
  "update_integrations",
  "update_visibility",
  "bootstrap_admin_claim",
  "set_admin_claim",
  "unauthorized_access"
]);

const HIGH_RISK_KEYWORDS = [
  "delete",
  "remove",
  "revoke",
  "disable",
  "forbidden",
  "unauthorized",
  "failed",
  "error",
  "critical",
  "security"
];

function isHighRisk(data: Record<string, unknown>) {
  const action = String(data.action ?? "").toLowerCase();
  const summary = String(data.summary ?? "").toLowerCase();
  const module = String(data.module ?? "").toLowerCase();

  if (HIGH_RISK_ACTIONS.has(action)) return true;
  if (module === "settings" && action.includes("update")) return true;

  return HIGH_RISK_KEYWORDS.some((keyword) => action.includes(keyword) || summary.includes(keyword));
}

export const auditNotificationsOnCreate = onDocumentCreated(
  {
    document: "auditLogs/{docId}",
    region: "us-central1",
    database: FIRESTORE_DATABASE_ID
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const docId = event.params.docId;
    const data = snapshot.data() as Record<string, unknown>;

    const settings = await getReminderRuntimeSettings();
    if (!settings.audit.enabled) return;

    if (settings.audit.highRiskOnly && !isHighRisk(data)) return;

    const recipientId = settings.channels.primaryAdminUid || (await getPrimaryAdminUid());
    if (!recipientId) return;

    const summary = String(data.summary ?? "Audit event");
    const module = String(data.module ?? "system");

    await createNotification({
      recipientId,
      dedupeKey: `audit:${docId}`,
      module: "audit",
      sourceType: "audit_log",
      sourceId: docId,
      title: `Audit alert: ${module}`,
      body: summary,
      priority: "high",
      ctaUrl: "/admin/system-inbox",
      metadata: {
        auditId: docId,
        action: String(data.action ?? ""),
        module
      }
    });
  }
);
