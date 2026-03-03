import { Metadata } from "next";
import { notFound } from "next/navigation";

import { TemplateBuilder } from "@/components/admin/resume-studio/template-builder";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { getResumeTemplate } from "@/lib/firestore/resume-studio";
import { getResumeStudioFlags } from "@/lib/resume-studio/flags";
import { getBuiltInTemplateById } from "@/lib/resume-studio/defaults";

export const metadata: Metadata = {
  title: "Template Builder"
};

export default async function ResumeTemplateBuilderPage({ params }: { params: Promise<{ templateId: string }> }) {
  const session = await requireAdminSession();
  const flags = await getResumeStudioFlags();
  if (!flags.resumeStudioV2Enabled || !flags.resumeAdvancedTemplateBuilderEnabled) notFound();
  const { templateId } = await params;

  const customTemplate = templateId === "new" ? null : await getResumeTemplate(templateId);
  const initialTemplate = customTemplate?.ownerId === session.uid ? customTemplate : templateId === "new" ? null : getBuiltInTemplateById(templateId);

  return <TemplateBuilder ownerId={session.uid} templateId={templateId} initialTemplate={initialTemplate} />;
}
