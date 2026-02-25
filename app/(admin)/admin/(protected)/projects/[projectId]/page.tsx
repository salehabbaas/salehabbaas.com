import type { Metadata } from "next";

import { ProjectBoard } from "@/components/admin/projects/project-board";

export const metadata: Metadata = {
  title: "Project Board"
};

export default async function AdminProjectBoardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectBoard projectId={projectId} />;
}
