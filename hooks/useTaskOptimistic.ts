"use client";

import { useCallback } from "react";

import type { TaskDoc } from "@/types/project-management";

export function useTaskOptimistic(setTasks: React.Dispatch<React.SetStateAction<TaskDoc[]>>) {
  const applyPatch = useCallback((taskId: string, patch: Partial<TaskDoc>) => {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...patch } : task)));
  }, [setTasks]);

  const replaceTask = useCallback((nextTask: TaskDoc) => {
    setTasks((prev) => prev.map((task) => (task.id === nextTask.id ? nextTask : task)));
  }, [setTasks]);

  const removeTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  }, [setTasks]);

  return {
    applyPatch,
    replaceTask,
    removeTask
  };
}
