import "server-only";

import { getAdminHealthStatus } from "@/lib/admin/health";
import { adminDb } from "@/lib/firebase/admin";
import { toIso } from "@/lib/admin/audit";

export type SystemInboxSummary = {
  health: Awaited<ReturnType<typeof getAdminHealthStatus>>;
  recentAudit: Array<{
    id: string;
    module: string;
    action: string;
    summary: string;
    actorEmail: string;
    createdAt: string;
  }>;
  pendingIssues: Array<{
    id: string;
    title: string;
    detail: string;
    severity: "high" | "medium";
  }>;
};

export async function getSystemInboxSummary(): Promise<SystemInboxSummary> {
  const [health, auditSnap] = await Promise.all([
    getAdminHealthStatus(),
    adminDb.collection("auditLogs").orderBy("createdAt", "desc").limit(20).get()
  ]);

  const recentAudit = auditSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      module: String(data.module ?? "unknown"),
      action: String(data.action ?? ""),
      summary: String(data.summary ?? ""),
      actorEmail: String(data.actorEmail ?? ""),
      createdAt: toIso(data.createdAt)
    };
  });

  const pendingIssues: SystemInboxSummary["pendingIssues"] = health.features
    .filter((feature) => feature.status === "degraded")
    .map((feature) => ({
      id: `health-${feature.feature}`,
      title: `${feature.label} degraded`,
      detail: feature.missing.join(", "),
      severity: feature.missing.length > 1 ? "high" : "medium"
    }));

  return {
    health,
    recentAudit,
    pendingIssues
  };
}
