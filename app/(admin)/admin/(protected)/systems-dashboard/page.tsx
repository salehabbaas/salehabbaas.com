import type { Metadata } from "next";

import { AdminSystemsDashboard } from "@/components/admin/admin-systems-dashboard";
import { getAdminSystemsSummary } from "@/lib/firestore/admin-systems-dashboard";

export const metadata: Metadata = {
  title: "Admin Systems Dashboard"
};

export default async function AdminSystemsDashboardPage() {
  const summary = await getAdminSystemsSummary();

  return <AdminSystemsDashboard summary={summary} />;
}
