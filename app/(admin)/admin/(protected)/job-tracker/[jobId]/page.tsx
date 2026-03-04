import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/admin-session";

export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  await requireAdminSession("jobs");
  const { jobId } = await params;
  redirect(`/admin/job-tracker/jobs?jobId=${jobId}`);
}
