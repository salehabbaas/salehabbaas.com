import { Metadata } from "next";

import { JobTrackerExportsPage } from "@/components/admin/job-tracker-v2/exports-page";
import { requireAdminSession } from "@/lib/auth/admin-session";

export const metadata: Metadata = {
  title: "Job Tracker Exports"
};

export default async function JobTrackerExportsRoute() {
  const session = await requireAdminSession("jobs");
  return <JobTrackerExportsPage ownerId={session.uid} />;
}
