import { Metadata } from "next";

import { JobTrackerCompaniesPage } from "@/components/admin/job-tracker-v2/companies-page";
import { requireAdminSession } from "@/lib/auth/admin-session";

export const metadata: Metadata = {
  title: "Job Tracker Companies"
};

export default async function JobTrackerCompaniesRoute() {
  const session = await requireAdminSession("jobs");
  return <JobTrackerCompaniesPage ownerId={session.uid} />;
}
