import { Metadata } from "next";

import { JobTrackerIntakePage } from "@/components/admin/job-tracker-v2/intake-page";
import { requireAdminSession } from "@/lib/auth/admin-session";

export const metadata: Metadata = {
  title: "Job Tracker Intake"
};

export default async function JobTrackerIntakeRoute() {
  const session = await requireAdminSession("jobs");
  return <JobTrackerIntakePage ownerId={session.uid} />;
}
