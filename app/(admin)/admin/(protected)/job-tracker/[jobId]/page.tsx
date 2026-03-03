import { Metadata } from "next";

import { JobTrackerDetail } from "@/components/admin/resume-studio/job-tracker-detail";
import { requireAdminSession } from "@/lib/auth/admin-session";

export const metadata: Metadata = {
  title: "Job Detail"
};

export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const session = await requireAdminSession();
  const { jobId } = await params;

  return <JobTrackerDetail ownerId={session.uid} jobId={jobId} />;
}
