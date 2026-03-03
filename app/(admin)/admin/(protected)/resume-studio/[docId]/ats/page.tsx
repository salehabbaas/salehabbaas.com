import { Metadata } from "next";
import { notFound } from "next/navigation";

import { ResumeStudioAts } from "@/components/admin/resume-studio/resume-studio-ats";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { getResumeStudioFlags } from "@/lib/resume-studio/flags";

export const metadata: Metadata = {
  title: "ATS Check"
};

export default async function ResumeStudioAtsPage({ params }: { params: Promise<{ docId: string }> }) {
  await requireAdminSession();
  const flags = await getResumeStudioFlags();
  if (!flags.resumeStudioV2Enabled) notFound();
  const { docId } = await params;

  return <ResumeStudioAts docId={docId} />;
}
