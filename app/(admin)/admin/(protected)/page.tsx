import { ControlCenterDashboard } from "@/components/admin/control-center-dashboard";
import { getControlCenterSummary } from "@/lib/firestore/control-center";

export default async function AdminOverviewPage() {
  const summary = await getControlCenterSummary();

  return <ControlCenterDashboard summary={summary} />;
}
