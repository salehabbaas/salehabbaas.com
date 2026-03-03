import { Metadata } from "next";
import { notFound } from "next/navigation";

import { ResumeStudioEditor } from "@/components/admin/resume-studio/resume-studio-editor";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { getResumeStudioFlags } from "@/lib/resume-studio/flags";

export const metadata: Metadata = {
  title: "Resume Editor"
};

export default async function ResumeStudioEditorPage({ params }: { params: Promise<{ docId: string }> }) {
  const session = await requireAdminSession();
  const flags = await getResumeStudioFlags();
  if (!flags.resumeStudioV2Enabled) notFound();
  const { docId } = await params;

  return <ResumeStudioEditor ownerId={session.uid} docId={docId} actorEmail={session.email ?? ""} />;
}
