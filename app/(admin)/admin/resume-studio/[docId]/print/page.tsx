import { Metadata } from "next";
import { notFound } from "next/navigation";

import { ResumePrintView } from "@/components/admin/resume-studio/resume-print-view";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { getResumeDocument, getResumeTemplate } from "@/lib/firestore/resume-studio";
import { getBuiltInTemplateById } from "@/lib/resume-studio/defaults";
import { getResumeStudioFlags } from "@/lib/resume-studio/flags";

export const metadata: Metadata = {
  title: "Resume Print Preview"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ResumeStudioPrintPage({ params }: { params: Promise<{ docId: string }> }) {
  const session = await requireAdminSession("resume");
  const flags = await getResumeStudioFlags();
  if (!flags.resumeStudioV2Enabled) {
    notFound();
  }
  const { docId } = await params;

  const doc = await getResumeDocument(docId);
  if (!doc || doc.ownerId !== session.uid) {
    notFound();
  }

  const customTemplate = await getResumeTemplate(doc.templateId);
  const template = customTemplate?.ownerId === session.uid ? customTemplate : getBuiltInTemplateById(doc.templateId);

  return <ResumePrintView doc={doc} template={template} />;
}
