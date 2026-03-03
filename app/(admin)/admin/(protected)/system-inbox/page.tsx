import type { Metadata } from "next";

import { SystemInboxDashboard } from "@/components/admin/system-inbox-dashboard";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { getSystemInboxSummary } from "@/lib/firestore/system-inbox";

export const metadata: Metadata = {
  title: "System Inbox"
};

export default async function AdminSystemInboxPage() {
  await requireAdminSession("dashboard");
  const summary = await getSystemInboxSummary();

  return <SystemInboxDashboard summary={summary} />;
}
