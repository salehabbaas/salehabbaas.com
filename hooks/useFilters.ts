"use client";

import { useEffect, useMemo, useState } from "react";

import type { TaskDoc } from "@/types/project-management";

export type TaskFilters = {
  search: string;
  statuses: string[];
  assignees: string[];
  priorities: Array<"P1" | "P2" | "P3" | "P4">;
  labels: string[];
  dueMode: "any" | "overdue" | "dueSoon";
  hasSubtasks: boolean;
  hasLinks: boolean;
};

const defaultFilters: TaskFilters = {
  search: "",
  statuses: [],
  assignees: [],
  priorities: [],
  labels: [],
  dueMode: "any",
  hasSubtasks: false,
  hasLinks: false
};

function storageKey(projectId: string) {
  return `pm-board-filters-${projectId}`;
}

export function useFilters(projectId: string, tasks: TaskDoc[]) {
  const [filters, setFilters] = useState<TaskFilters>(defaultFilters);
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey(projectId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      let nextFilters: TaskFilters | null = null;
      if (parsed && typeof parsed === "object" && "filters" in parsed) {
        const nested = (parsed as { filters?: unknown }).filters;
        if (nested && typeof nested === "object") {
          nextFilters = nested as TaskFilters;
        }
      } else if (parsed && typeof parsed === "object") {
        nextFilters = parsed as TaskFilters;
      }
      if (!nextFilters) return;
      setFilters({ ...defaultFilters, ...nextFilters });
      setSearchInput(nextFilters.search || "");
    } catch {
      // Ignore invalid persisted data.
    }
  }, [projectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput.trim() }));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey(projectId), JSON.stringify({ filters }));
  }, [projectId, filters]);

  const filteredTasks = useMemo(() => {
    const now = Date.now();
    const search = filters.search.toLowerCase();
    const labelSet = new Set(filters.labels.map((item) => item.toLowerCase()));

    return tasks.filter((task) => {
      if (filters.statuses.length && !filters.statuses.includes(task.statusColumnId)) return false;
      if (filters.assignees.length) {
        const includeUnassigned = filters.assignees.includes("__unassigned__");
        const assignee = task.assigneeId || "";
        const allowed = includeUnassigned ? assignee === "" || filters.assignees.includes(assignee) : filters.assignees.includes(assignee);
        if (!allowed) return false;
      }
      if (filters.priorities.length && !filters.priorities.includes(task.priority)) return false;
      if (filters.dueMode === "overdue") {
        if (!task.dueDate) return false;
        if (new Date(task.dueDate).getTime() >= now) return false;
      }
      if (filters.dueMode === "dueSoon") {
        if (!task.dueDate) return false;
        const due = new Date(task.dueDate).getTime();
        const soon = now + 1000 * 60 * 60 * 24 * 3;
        if (due < now || due > soon) return false;
      }
      if (filters.hasSubtasks && !(task.subtasks?.length > 0)) return false;
      if (filters.hasLinks && !((task.links ?? []).length > 0)) return false;
      if (labelSet.size) {
        const hasAny = task.labels.some((label) => labelSet.has(label.toLowerCase()));
        if (!hasAny) return false;
      }
      if (search) {
        const haystack = [task.taskKey ?? "", task.id, task.title, task.description, task.labels.join(" ")].join(" ").toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [filters, tasks]);

  return {
    filters,
    setFilters,
    searchInput,
    setSearchInput,
    filteredTasks,
    defaultFilters
  };
}
