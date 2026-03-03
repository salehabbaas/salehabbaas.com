import { Metadata } from "next";
import { notFound } from "next/navigation";

import { ResumeStudioDocuments } from "@/components/admin/resume-studio/resume-studio-documents";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { getResumeStudioFlags } from "@/lib/resume-studio/flags";

export const metadata: Metadata = {
  title: "Resume Studio"
};

export default async function ResumeStudioPage() {
  const session = await requireAdminSession();
  const flags = await getResumeStudioFlags();
  if (!flags.resumeStudioV2Enabled) notFound();
  return <ResumeStudioDocuments ownerId={session.uid} />;
}
