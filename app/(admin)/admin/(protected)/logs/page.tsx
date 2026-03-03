import { AdminLogsDashboard } from "@/components/admin/admin-logs-dashboard";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { getAdminLogsSummary } from "@/lib/firestore/admin-logs";

export const metadata = {
  title: "Admin Logs"
};

export default async function AdminLogsPage() {
  await requireAdminSession("dashboard");
  const summary = await getAdminLogsSummary();

  return <AdminLogsDashboard summary={summary} />;
}
