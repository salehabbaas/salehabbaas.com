import { Metadata } from "next";
import { notFound } from "next/navigation";

import { TemplateImport } from "@/components/admin/resume-studio/template-import";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { getResumeStudioFlags } from "@/lib/resume-studio/flags";

export const metadata: Metadata = {
  title: "Import Resume Template"
};

export default async function ResumeTemplateImportPage() {
  const session = await requireAdminSession();
  const flags = await getResumeStudioFlags();
  if (!flags.resumeStudioV2Enabled) notFound();
  return <TemplateImport ownerId={session.uid} />;
}
