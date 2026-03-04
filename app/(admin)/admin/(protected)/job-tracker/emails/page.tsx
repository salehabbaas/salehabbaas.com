import { Metadata } from "next";

import { JobTrackerEmailsPage } from "@/components/admin/job-tracker-v2/emails-page";
import { requireAdminSession } from "@/lib/auth/admin-session";

export const metadata: Metadata = {
  title: "Job Tracker Emails"
};

export default async function JobTrackerEmailsRoute() {
  const session = await requireAdminSession("jobs");
  return <JobTrackerEmailsPage ownerId={session.uid} />;
}
