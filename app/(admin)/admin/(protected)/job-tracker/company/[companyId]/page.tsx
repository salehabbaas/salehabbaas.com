import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/admin-session";

export default async function JobTrackerCompanyDetailPage({ params }: { params: Promise<{ companyId: string }> }) {
  await requireAdminSession("jobs");
  const { companyId } = await params;
  redirect(`/admin/job-tracker/companies?companyId=${companyId}`);
}
