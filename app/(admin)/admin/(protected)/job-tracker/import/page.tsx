import { Metadata } from "next";

import { JobTrackerImport } from "@/components/admin/resume-studio/job-tracker-import";
import { requireAdminSession } from "@/lib/auth/admin-session";

export const metadata: Metadata = {
  title: "Import Job"
};

export default async function JobImportPage() {
  const session = await requireAdminSession();
  return <JobTrackerImport ownerId={session.uid} />;
}
