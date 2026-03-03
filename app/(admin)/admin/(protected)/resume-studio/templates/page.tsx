import { Metadata } from "next";
import { notFound } from "next/navigation";

import { TemplateGallery } from "@/components/admin/resume-studio/template-gallery";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { getResumeStudioFlags } from "@/lib/resume-studio/flags";

export const metadata: Metadata = {
  title: "Resume Templates"
};

export default async function ResumeTemplateGalleryPage() {
  const session = await requireAdminSession();
  const flags = await getResumeStudioFlags();
  if (!flags.resumeStudioV2Enabled) notFound();
  return <TemplateGallery ownerId={session.uid} />;
}
