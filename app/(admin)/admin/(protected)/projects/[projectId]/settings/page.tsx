import type { Metadata } from "next";

import { ProjectSettings } from "@/components/admin/projects/project-settings";

export const metadata: Metadata = {
  title: "Project Settings"
};

export default async function AdminProjectSettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectSettings projectId={projectId} />;
}
