"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { TaskDrawer } from "@/components/admin/projects/task-drawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBoardData } from "@/hooks/useBoardData";
import { orderColumns } from "@/lib/project-management/utils";

type ProjectTaskPageProps = {
  projectId: string;
  taskId: string;
};

export function ProjectTaskPage({ projectId, taskId }: ProjectTaskPageProps) {
  const router = useRouter();
  const { payload, tasks, setTasks, loading, status, loadBoard } = useBoardData(projectId);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const board = payload?.board;
  const project = payload?.project;
  const members = payload?.members ?? [];
  const actorUid = payload?.actorUid ?? "";
  const accessRole = payload?.accessRole ?? null;
  const canWrite = accessRole === "owner" || accessRole === "editor";
  const orderedColumns = useMemo(() => orderColumns(board?.columns ?? []), [board?.columns]);

  const task = tasks.find((item) => item.id === taskId) ?? null;

  if (loading) {
    return (
      <div className="admin-workspace">
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">Loading task...</CardContent>
        </Card>
      </div>
    );
  }

  if (!project || !board) {
    return (
      <div className="admin-workspace">
        <Card>
          <CardHeader>
            <CardTitle>Task unavailable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{status || "The project board is not available."}</p>
            <Button asChild variant="outline">
              <Link href={`/admin/projects/${projectId}`}>Back to board</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="admin-workspace">
        <Card>
          <CardHeader>
            <CardTitle>Task not found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">The requested task does not exist or you do not have access.</p>
            <Button asChild variant="outline">
              <Link href={`/admin/projects/${projectId}`}>Back to board</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-workspace space-y-3">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={() => router.push(`/admin/projects/${projectId}`)}>
          <ArrowLeft className="h-4 w-4" />
          Back to board
        </Button>
      </div>

      <TaskDrawer
        projectId={projectId}
        task={task}
        tasks={tasks}
        columns={orderedColumns}
        members={members}
        canWrite={canWrite}
        open
        mode="page"
        actorUid={actorUid}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) router.push(`/admin/projects/${projectId}`);
        }}
        onTaskUpdated={(updatedTask) => {
          setTasks((prev) => prev.map((row) => (row.id === updatedTask.id ? updatedTask : row)));
        }}
        onTaskDeleted={() => {
          router.push(`/admin/projects/${projectId}`);
        }}
        onOpenTask={(nextTaskId) => {
          router.push(`/admin/projects/${projectId}/tasks/${nextTaskId}`);
        }}
        onSaved={loadBoard}
      />
    </div>
  );
}
