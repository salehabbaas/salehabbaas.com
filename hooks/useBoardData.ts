"use client";

import { useCallback, useState } from "react";

import type { BoardDoc, ProjectDoc, TaskDoc } from "@/types/project-management";
import type { ProjectMemberSummary } from "@/types/admin-access";

export type BoardPayload = {
  actorUid: string;
  project: ProjectDoc;
  board: BoardDoc | null;
  tasks: TaskDoc[];
  members: ProjectMemberSummary[];
  accessRole: "owner" | "viewer" | "editor" | null;
};

export function useBoardData(projectId: string) {
  const [payload, setPayload] = useState<BoardPayload | null>(null);
  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch(`/api/admin/projects/${projectId}`, { cache: "no-store" });
      const data = (await response.json()) as BoardPayload & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to load board");
      setPayload(data);
      setTasks(data.tasks ?? []);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load board");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  return {
    payload,
    setPayload,
    tasks,
    setTasks,
    loading,
    status,
    setStatus,
    loadBoard
  };
}
