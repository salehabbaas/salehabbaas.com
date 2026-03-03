import type { Metadata } from "next";

import { ProjectTaskPage } from "@/components/admin/projects/project-task-page";

export const metadata: Metadata = {
  title: "Task"
};

type AdminProjectTaskPageProps = {
  params: Promise<{
    projectId: string;
    taskId: string;
  }>;
};

export default async function AdminProjectTaskPage({ params }: AdminProjectTaskPageProps) {
  const { projectId, taskId } = await params;
  return <ProjectTaskPage projectId={projectId} taskId={taskId} />;
}

