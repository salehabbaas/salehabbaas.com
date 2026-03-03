import { Metadata } from "next";

import { JobTrackerDashboard } from "@/components/admin/resume-studio/job-tracker-dashboard";
import { requireAdminSession } from "@/lib/auth/admin-session";

export const metadata: Metadata = {
  title: "Job Tracker"
};

export default async function AdminJobTrackerPage() {
  const session = await requireAdminSession();
  return <JobTrackerDashboard ownerId={session.uid} />;
}
