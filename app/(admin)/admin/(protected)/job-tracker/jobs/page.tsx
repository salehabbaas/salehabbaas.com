import { Metadata } from "next";

import { JobTrackerJobsPage } from "@/components/admin/job-tracker-v2/jobs-page";
import { requireAdminSession } from "@/lib/auth/admin-session";

export const metadata: Metadata = {
  title: "Job Tracker Jobs"
};

export default async function JobTrackerJobsRoute() {
  const session = await requireAdminSession("jobs");
  return <JobTrackerJobsPage ownerId={session.uid} />;
}
