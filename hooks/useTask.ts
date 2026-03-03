"use client";

import { useMemo } from "react";

import type { TaskDoc } from "@/types/project-management";

export function useTask(tasks: TaskDoc[], taskId: string | null) {
  return useMemo(() => tasks.find((task) => task.id === taskId) ?? null, [tasks, taskId]);
}
