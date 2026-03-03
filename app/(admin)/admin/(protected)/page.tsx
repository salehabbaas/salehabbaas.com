import { ControlCenterDashboard } from "@/components/admin/control-center-dashboard";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { getControlCenterSummary } from "@/lib/firestore/control-center";

export default async function AdminOverviewPage() {
  await requireAdminSession("dashboard");
  const summary = await getControlCenterSummary();

  return <ControlCenterDashboard summary={summary} />;
}
