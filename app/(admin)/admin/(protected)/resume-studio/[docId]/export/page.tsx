import { Metadata } from "next";
import { notFound } from "next/navigation";

import { ResumeStudioExport } from "@/components/admin/resume-studio/resume-studio-export";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { getResumeStudioFlags } from "@/lib/resume-studio/flags";

export const metadata: Metadata = {
  title: "Resume Export"
};

export default async function ResumeStudioExportPage({ params }: { params: Promise<{ docId: string }> }) {
  const session = await requireAdminSession();
  const flags = await getResumeStudioFlags();
  if (!flags.resumeStudioV2Enabled) notFound();
  const { docId } = await params;

  return <ResumeStudioExport docId={docId} actorEmail={session.email ?? ""} />;
}
