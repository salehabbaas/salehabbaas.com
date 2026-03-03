import { Metadata } from "next";

import { JobTrackerCompanyDetail } from "@/components/admin/resume-studio/job-tracker-company-detail";
import { requireAdminSession } from "@/lib/auth/admin-session";

export const metadata: Metadata = {
  title: "Company Detail"
};

export default async function JobTrackerCompanyDetailPage({ params }: { params: Promise<{ companyId: string }> }) {
  const session = await requireAdminSession();
  const { companyId } = await params;

  return <JobTrackerCompanyDetail ownerId={session.uid} companyId={companyId} />;
}
