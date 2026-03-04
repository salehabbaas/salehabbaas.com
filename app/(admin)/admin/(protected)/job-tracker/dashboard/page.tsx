import { Metadata } from "next";

import { JobTrackerDashboardPage } from "@/components/admin/job-tracker-v2/dashboard-page";
import { requireAdminSession } from "@/lib/auth/admin-session";

export const metadata: Metadata = {
  title: "Job Tracker Dashboard"
};

export default async function JobTrackerDashboardRoute() {
  const session = await requireAdminSession("jobs");
  return <JobTrackerDashboardPage ownerId={session.uid} />;
}
