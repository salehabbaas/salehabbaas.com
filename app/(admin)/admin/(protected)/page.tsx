import { SystemInboxDashboard } from "@/components/admin/system-inbox-dashboard";
import { getSystemInboxSummary } from "@/lib/firestore/system-inbox";

export default async function AdminOverviewPage() {
  const summary = await getSystemInboxSummary();

  return <SystemInboxDashboard summary={summary} />;
}
