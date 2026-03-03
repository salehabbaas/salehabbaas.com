"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  defaultDropAnimationSideEffects,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, Settings2 } from "lucide-react";
import { motion } from "framer-motion";

import { BoardColumn } from "@/components/board/BoardColumn";
import { CreateTaskModal } from "@/components/board/CreateTaskModal";
import { BoardSettingsModal } from "@/components/board/BoardSettingsModal";
import { BoardToolbar } from "@/components/board/BoardToolbar";
import { FilterPopover } from "@/components/board/FilterPopover";
import { TaskDrawer } from "@/components/admin/projects/task-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useBoardData } from "@/hooks/useBoardData";
import { useBoardDnDSensors } from "@/hooks/useDnD";
import { useFilters } from "@/hooks/useFilters";
import { useShortcuts } from "@/hooks/useShortcuts";
import { priorityIconMap } from "@/lib/project-management/priority-ui";
import {
  fromDatetimeLocalInput,
  orderColumns,
  parseTagInput,
} from "@/lib/project-management/utils";
import {
  priorityLabelMap,
  priorityRankMap,
  priorityToneMap,
  type BoardColumn as BoardColumnDoc,
  type TaskDoc,
  type TaskSubtask,
  type TaskPriority,
} from "@/types/project-management";

type ProjectBoardProps = {
  projectId: string;
};

function normalizeColumnTasks(tasks: TaskDoc[]) {
  return [...tasks].sort((a, b) => {
    if (a.orderInColumn !== b.orderInColumn)
      return a.orderInColumn - b.orderInColumn;
    if (a.priorityRank !== b.priorityRank)
      return a.priorityRank - b.priorityRank;
    return a.title.localeCompare(b.title);
  });
}

function replaceColumnTasks(
  all: TaskDoc[],
  columnId: string,
  nextColumnTasks: TaskDoc[],
) {
  const other = all.filter((task) => task.statusColumnId !== columnId);
  return [...other, ...nextColumnTasks];
}

function normalizeOrder(tasks: TaskDoc[], columnId: string) {
  return normalizeColumnTasks(tasks)
    .filter((task) => task.statusColumnId === columnId)
    .map((task, index) => ({
      ...task,
      orderInColumn: index,
    }));
}

function generateColumnId(name: string, existingIds: Set<string>) {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "column";
  let next = base;
  let suffix = 2;
  while (existingIds.has(next)) {
    next = `${base}-${suffix}`;
    suffix += 1;
  }
  return next;
}

const taskDropAnimation: DropAnimation = {
  duration: 260,
  easing: "cubic-bezier(0.18, 0.67, 0.3, 1.02)",
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.45",
      },
    },
  }),
};

export function ProjectBoard({ projectId }: ProjectBoardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const boardAreaRef = useRef<HTMLDivElement | null>(null);

  const {
    payload,
    setPayload,
    tasks,
    setTasks,
    loading,
    status,
    setStatus,
    loadBoard,
  } = useBoardData(projectId);
  const { filters, setFilters, searchInput, setSearchInput, filteredTasks } =
    useFilters(projectId, tasks);

  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("P3");
  const [statusColumnId, setStatusColumnId] = useState("");
  const [createAssigneeId, setCreateAssigneeId] = useState("");
  const [dueDateInput, setDueDateInput] = useState("");
  const [labelsInput, setLabelsInput] = useState("");

  const [filterOpen, setFilterOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inlineCreateColumnId, setInlineCreateColumnId] = useState<
    string | null
  >(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  const [boardSettings, setBoardSettings] = useState({
    showLabels: true,
    showDueDate: true,
    showSubtasks: true,
    showComments: true,
    showPriority: true,
    showAssignee: true,
  });
  const [savingColumns, setSavingColumns] = useState(false);

  const sensors = useBoardDnDSensors();

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    const taskId = searchParams.get("taskId");
    if (taskId) setDrawerTaskId(taskId);
  }, [searchParams]);

  const board = payload?.board;
  const project = payload?.project;
  const members = useMemo(() => payload?.members ?? [], [payload?.members]);
  const actorUid = payload?.actorUid ?? "";
  const accessRole = payload?.accessRole ?? null;
  const canWrite = accessRole === "owner" || accessRole === "editor";
  const assigneeNameById = useMemo(() => {
    const map: Record<string, string> = {};
    members.forEach((member) => {
      map[member.uid] = member.displayName || member.email || member.uid;
    });
    return map;
  }, [members]);
  const memberOptions = useMemo(
    () =>
      members.map((member) => ({
        uid: member.uid,
        label: member.displayName || member.email || member.uid,
      })),
    [members],
  );
  const orderedColumns = useMemo(
    () => orderColumns(board?.columns ?? []),
    [board?.columns],
  );

  useEffect(() => {
    if (!statusColumnId && orderedColumns.length) {
      setStatusColumnId(orderedColumns[0].id);
    }
  }, [orderedColumns, statusColumnId]);

  const tasksByColumn = useMemo(() => {
    const map: Record<string, TaskDoc[]> = {};
    orderedColumns.forEach((column) => {
      map[column.id] = normalizeColumnTasks(
        filteredTasks.filter((task) => task.statusColumnId === column.id),
      );
    });
    return map;
  }, [orderedColumns, filteredTasks]);

  const drawerTask = tasks.find((task) => task.id === drawerTaskId) ?? null;
  const activeTask = tasks.find((task) => task.id === activeTaskId) ?? null;

  async function createTaskForColumn(
    columnId: string,
    draft: {
      title: string;
      priority: TaskPriority;
      assigneeId?: string;
      dueDateInput: string;
    },
  ) {
    if (!board || !canWrite) return;
    const dueDate = fromDatetimeLocalInput(draft.dueDateInput);
    const nextPriority = draft.priority;
    const previousTasks = tasks;

    const optimisticId = `tmp-${Date.now().toString(36)}`;
    const optimisticTask: TaskDoc = {
      id: optimisticId,
      projectId,
      boardId: board.id,
      title: draft.title,
      description: "",
      priority: nextPriority,
      priorityRank: priorityRankMap[nextPriority],
      statusColumnId: columnId,
      dueDate,
      labels: [],
      assigneeId: draft.assigneeId || undefined,
      watchers: [],
      subtasks: [],
      comments: [],
      links: [],
      startDate: undefined,
      completedAt: undefined,
      category: undefined,
      orderInColumn: 0,
      reminderConfig: {
        email24h: true,
        email1h: true,
        dailyOverdue: true,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMovedAt: new Date().toISOString(),
    };

    setTasks([
      ...previousTasks.map((task) =>
        task.statusColumnId === columnId
          ? { ...task, orderInColumn: task.orderInColumn + 1 }
          : task,
      ),
      optimisticTask,
    ]);
    // Close inline composer immediately so the row never lingers on slower requests.
    setInlineCreateColumnId(null);

    try {
      const response = await fetch(`/api/admin/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId: board.id,
          title: draft.title,
          description: "",
          priority: nextPriority,
          statusColumnId: columnId,
          dueDate,
          assigneeId: draft.assigneeId || undefined,
          labels: [],
          watchers: [],
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        taskId?: string;
        taskKey?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Unable to create task");

      const createdTaskId = data.taskId || optimisticId;
      setTasks((prev) =>
        prev.map((task) =>
          task.id === optimisticId
            ? {
                ...task,
                id: createdTaskId,
                taskKey: data.taskKey || task.taskKey,
              }
            : task,
        ),
      );
    } catch (error) {
      setTasks(previousTasks);
      setStatus(
        error instanceof Error ? error.message : "Unable to create task",
      );
    }
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!board || !canWrite) return;
    setCreating(true);
    try {
      const response = await fetch(`/api/admin/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId: board.id,
          title,
          description,
          priority,
          statusColumnId,
          dueDate: fromDatetimeLocalInput(dueDateInput),
          labels: parseTagInput(labelsInput),
          assigneeId: createAssigneeId || undefined,
          watchers: [],
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        taskId?: string;
        taskKey?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Unable to create task");

      setTasks((prev) => [
        ...prev.map((task) =>
          task.statusColumnId === statusColumnId
            ? { ...task, orderInColumn: task.orderInColumn + 1 }
            : task,
        ),
        {
          id: data.taskId || `tmp-${Date.now().toString(36)}`,
          taskKey: data.taskKey,
          projectId,
          boardId: board.id,
          title,
          description,
          priority,
          priorityRank: priorityRankMap[priority],
          statusColumnId,
          dueDate: fromDatetimeLocalInput(dueDateInput),
          labels: parseTagInput(labelsInput),
          assigneeId: createAssigneeId || undefined,
          watchers: [],
          subtasks: [],
          comments: [],
          links: [],
          startDate: undefined,
          completedAt: undefined,
          category: undefined,
          orderInColumn: 0,
          reminderConfig: { email24h: true, email1h: true, dailyOverdue: true },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastMovedAt: new Date().toISOString(),
        },
      ]);

      setCreateOpen(false);
      setTitle("");
      setDescription("");
      setPriority("P3");
      setCreateAssigneeId("");
      setDueDateInput("");
      setLabelsInput("");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Unable to create task",
      );
    } finally {
      setCreating(false);
    }
  }

  function mapSubtasksForUpdate(items: TaskSubtask[]) {
    return items.map((item) => ({
      id: item.id,
      title: item.title.trim(),
      completed: item.completed,
      assigneeId: item.assigneeId || "",
      status: item.status || (item.completed ? "done" : "todo"),
      priority: item.priority || "P3",
    }));
  }

  async function updateSubtaskStatus(
    taskId: string,
    subtaskId: string,
    statusValue: "todo" | "in_progress" | "done",
  ) {
    if (!canWrite) return;
    const currentTask = tasks.find((task) => task.id === taskId);
    if (!currentTask) return;

    const nextSubtasks = currentTask.subtasks.map((item) =>
      item.id === subtaskId
        ? {
            ...item,
            status: statusValue,
            completed: statusValue === "done",
          }
        : item,
    );

    const previousTasks = tasks;
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: nextSubtasks,
              updatedAt: new Date().toISOString(),
            }
          : task,
      ),
    );

    try {
      const response = await fetch(
        `/api/admin/projects/${projectId}/tasks/${taskId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subtasks: mapSubtasksForUpdate(nextSubtasks),
          }),
        },
      );
      const data = (await response.json()) as {
        error?: string;
        task?: TaskDoc;
      };
      if (!response.ok)
        throw new Error(data.error ?? "Unable to update subtask status");
      const updatedTask = data.task;
      if (updatedTask) {
        setTasks((prev) =>
          prev.map((task) => (task.id === taskId ? updatedTask : task)),
        );
      }
    } catch (error) {
      setTasks(previousTasks);
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to update subtask status",
      );
    }
  }

  async function patchTaskQuick(
    taskId: string,
    payload: Record<string, unknown>,
    optimistic: (task: TaskDoc) => TaskDoc,
    errorMessage: string,
  ) {
    if (!canWrite) return;
    const previousTasks = tasks;
    setTasks((prev) =>
      prev.map((task) => (task.id === taskId ? optimistic(task) : task)),
    );

    try {
      const response = await fetch(
        `/api/admin/projects/${projectId}/tasks/${taskId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await response.json()) as {
        error?: string;
        task?: TaskDoc;
      };
      if (!response.ok) throw new Error(data.error ?? errorMessage);
      if (data.task) {
        setTasks((prev) =>
          prev.map((task) => (task.id === taskId ? data.task! : task)),
        );
      }
    } catch (error) {
      setTasks(previousTasks);
      setStatus(error instanceof Error ? error.message : errorMessage);
    }
  }

  async function updateTaskPriority(
    taskId: string,
    nextPriority: TaskPriority,
  ) {
    const current = tasks.find((task) => task.id === taskId);
    if (!current || current.priority === nextPriority) return;
    await patchTaskQuick(
      taskId,
      { priority: nextPriority },
      (task) => ({
        ...task,
        priority: nextPriority,
        priorityRank: priorityRankMap[nextPriority],
        updatedAt: new Date().toISOString(),
      }),
      "Unable to update task priority",
    );
  }

  async function updateTaskAssignee(taskId: string, nextAssigneeId: string) {
    const current = tasks.find((task) => task.id === taskId);
    const normalizedNext = nextAssigneeId || "";
    const normalizedCurrent = current?.assigneeId || "";
    if (!current || normalizedCurrent === normalizedNext) return;
    await patchTaskQuick(
      taskId,
      { assigneeId: normalizedNext || null },
      (task) => ({
        ...task,
        assigneeId: normalizedNext || undefined,
        updatedAt: new Date().toISOString(),
      }),
      "Unable to update task assignee",
    );
  }

  async function updateTaskDueDate(
    taskId: string,
    dueDateInputValue: string | null,
  ) {
    const current = tasks.find((task) => task.id === taskId);
    if (!current) return;
    const nextDueDate = dueDateInputValue
      ? (fromDatetimeLocalInput(dueDateInputValue) ?? null)
      : null;
    const currentDueDate = current.dueDate || null;
    if ((currentDueDate || "") === (nextDueDate || "")) return;
    await patchTaskQuick(
      taskId,
      { dueDate: nextDueDate },
      (task) => ({
        ...task,
        dueDate: nextDueDate || undefined,
        updatedAt: new Date().toISOString(),
      }),
      "Unable to update task due date",
    );
  }

  function onDragStart(event: DragStartEvent) {
    if (!canWrite) return;
    const activeType = String(event.active.data.current?.type ?? "");
    if (activeType === "task") {
      setActiveTaskId(String(event.active.id));
      return;
    }
    setActiveTaskId(null);
  }

  async function persistReorder(
    nextTasks: TaskDoc[],
    updates: Array<{
      taskId: string;
      statusColumnId: string;
      orderInColumn: number;
    }>,
    movedTaskId: string,
    fromColumnId: string,
    toColumnId: string,
  ) {
    const response = await fetch(
      `/api/admin/projects/${projectId}/tasks/reorder`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates,
          movedTaskId,
          fromColumnId,
          toColumnId,
        }),
      },
    );
    const data = (await response.json()) as { error?: string };
    if (!response.ok)
      throw new Error(data.error ?? "Unable to persist task order");
    setTasks(nextTasks);
  }

  async function onDragEnd(event: DragEndEvent) {
    if (!canWrite) return;
    const activeType = String(event.active.data.current?.type ?? "");
    setActiveTaskId(null);

    const { active, over } = event;
    if (activeType === "column") {
      if (!over) return;
      const activeId = String(active.id);
      const overId = String(over.id);
      if (activeId === overId) return;

      const activeColumnId = activeId.startsWith("board-column-")
        ? activeId.replace("board-column-", "")
        : "";
      if (!activeColumnId) return;

      let overColumnId = "";
      if (overId.startsWith("board-column-")) {
        overColumnId = overId.replace("board-column-", "");
      } else if (overId.startsWith("column-")) {
        overColumnId = overId.replace("column-", "");
      } else {
        const overTask = tasks.find((task) => task.id === overId);
        overColumnId = overTask?.statusColumnId ?? "";
      }
      if (!overColumnId || overColumnId === activeColumnId) return;

      const oldIndex = orderedColumns.findIndex(
        (column) => column.id === activeColumnId,
      );
      const newIndex = orderedColumns.findIndex(
        (column) => column.id === overColumnId,
      );
      if (oldIndex < 0 || newIndex < 0) return;

      const reordered = arrayMove(orderedColumns, oldIndex, newIndex).map(
        (column, index) => ({
          ...column,
          order: index,
        }),
      );
      await saveBoardColumns(reordered);
      return;
    }

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const activeTaskRow = tasks.find((task) => task.id === activeId);
    if (!activeTaskRow) return;

    const overTask = tasks.find((task) => task.id === overId);
    const toColumnId = overId.startsWith("column-")
      ? overId.replace("column-", "")
      : overTask?.statusColumnId;
    if (!toColumnId) return;

    const fromColumnId = activeTaskRow.statusColumnId;
    const previousTasks = tasks;

    const sourceTasks = normalizeColumnTasks(
      tasks.filter((task) => task.statusColumnId === fromColumnId),
    );
    const targetTasks = normalizeColumnTasks(
      tasks.filter((task) => task.statusColumnId === toColumnId),
    );

    let nextTasks = [...tasks];

    if (fromColumnId === toColumnId) {
      const oldIndex = sourceTasks.findIndex((task) => task.id === activeId);
      const newIndex = overId.startsWith("column-")
        ? sourceTasks.length - 1
        : sourceTasks.findIndex((task) => task.id === overId);
      if (oldIndex < 0 || newIndex < 0) return;

      const moved = arrayMove(sourceTasks, oldIndex, newIndex).map(
        (task, index) => ({ ...task, orderInColumn: index }),
      );
      nextTasks = replaceColumnTasks(nextTasks, fromColumnId, moved);
      const updates = moved.map((task) => ({
        taskId: task.id,
        statusColumnId: task.statusColumnId,
        orderInColumn: task.orderInColumn,
      }));

      setTasks(nextTasks);
      try {
        await persistReorder(
          nextTasks,
          updates,
          activeId,
          fromColumnId,
          toColumnId,
        );
      } catch (error) {
        setTasks(previousTasks);
        setStatus(
          error instanceof Error
            ? error.message
            : "Unable to persist task order",
        );
      }
      return;
    }

    const removedSource = sourceTasks
      .filter((task) => task.id !== activeId)
      .map((task, index) => ({ ...task, orderInColumn: index }));
    const movedTask: TaskDoc = { ...activeTaskRow, statusColumnId: toColumnId };
    const insertIndex = overId.startsWith("column-")
      ? targetTasks.length
      : targetTasks.findIndex((task) => task.id === overId);
    const nextTargetBase = [...targetTasks];
    const normalizedInsert =
      insertIndex < 0 ? nextTargetBase.length : insertIndex;
    nextTargetBase.splice(normalizedInsert, 0, movedTask);

    const reorderedTarget = nextTargetBase.map((task, index) => ({
      ...task,
      orderInColumn: index,
      statusColumnId: toColumnId,
    }));
    nextTasks = tasks.filter(
      (task) =>
        task.statusColumnId !== fromColumnId &&
        task.statusColumnId !== toColumnId,
    );
    nextTasks = [...nextTasks, ...removedSource, ...reorderedTarget];

    const sourceUpdates = normalizeOrder(nextTasks, fromColumnId);
    const targetUpdates = normalizeOrder(nextTasks, toColumnId);
    const updates = [...sourceUpdates, ...targetUpdates].map((task) => ({
      taskId: task.id,
      statusColumnId: task.statusColumnId,
      orderInColumn: task.orderInColumn,
    }));

    setTasks(nextTasks);
    try {
      await persistReorder(
        nextTasks,
        updates,
        activeId,
        fromColumnId,
        toColumnId,
      );
    } catch (error) {
      setTasks(previousTasks);
      setStatus(
        error instanceof Error ? error.message : "Unable to persist task move",
      );
    }
  }

  async function saveBoardColumns(nextColumns: BoardColumnDoc[]) {
    if (!board || !canWrite) return;
    const normalized = nextColumns.map((column, index) => ({
      id: column.id,
      name: column.name.trim(),
      order: index,
    }));
    if (!normalized.length) {
      setStatus("At least one column is required.");
      return;
    }

    const previousColumns = [...(board.columns ?? [])];
    setSavingColumns(true);
    setStatus("");
    setPayload((prev) =>
      prev?.board
        ? {
            ...prev,
            board: {
              ...prev.board,
              columns: normalized,
            },
          }
        : prev,
    );

    try {
      const response = await fetch(`/api/admin/projects/${projectId}/board`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId: board.id,
          name: board.name || "Board",
          columns: normalized,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(data.error ?? "Unable to save board columns");
      setStatus("Board columns updated.");
    } catch (error) {
      setPayload((prev) =>
        prev?.board
          ? {
              ...prev,
              board: {
                ...prev.board,
                columns: previousColumns,
              },
            }
          : prev,
      );
      setStatus(
        error instanceof Error ? error.message : "Unable to save board columns",
      );
    } finally {
      setSavingColumns(false);
    }
  }

  async function renameBoardColumn(columnId: string, nextName: string) {
    const trimmed = nextName.trim();
    if (!trimmed) return;
    const next = orderedColumns.map((column) =>
      column.id === columnId ? { ...column, name: trimmed } : column,
    );
    await saveBoardColumns(next);
  }

  async function addBoardColumn() {
    if (!canWrite || !board) return;
    const trimmed = newColumnName.trim();
    if (!trimmed) return;
    if (orderedColumns.length >= 12) {
      setStatus("Maximum 12 columns allowed.");
      return;
    }
    const idSet = new Set(orderedColumns.map((column) => column.id));
    const id = generateColumnId(trimmed, idSet);
    const next = [
      ...orderedColumns,
      { id, name: trimmed, order: orderedColumns.length },
    ];
    await saveBoardColumns(next);
    setAddingColumn(false);
    setNewColumnName("");
  }

  useShortcuts({
    onCreate: () => canWrite && setCreateOpen(true),
    onFocusSearch: () => searchInputRef.current?.focus(),
    onEscape: () => {
      if (drawerTaskId) setDrawerTaskId(null);
      if (inlineCreateColumnId) setInlineCreateColumnId(null);
    },
  });

  if (loading) {
    return (
      <div className="admin-workspace">
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Loading board...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project || !board) {
    return (
      <div className="admin-workspace space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Board unavailable</CardTitle>
            <CardDescription>
              {status || "This project does not have a board yet."}
            </CardDescription>
          </CardHeader>
          {canWrite ? (
            <CardContent>
              <Button asChild>
                <Link href={`/admin/projects/${projectId}/settings`}>
                  <Settings2 className="h-4 w-4" />
                  Open project settings
                </Link>
              </Button>
            </CardContent>
          ) : null}
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-workspace space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        <Card>
          <CardHeader className="space-y-3">
            <div>
              <CardTitle>{project.name}</CardTitle>
              <CardDescription>
                {project.description || "No description"}
              </CardDescription>
              {status ? (
                <p className="mt-2 text-sm text-primary">{status}</p>
              ) : null}
              {!canWrite ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Read-only access: viewer permissions.
                </p>
              ) : null}
            </div>
            <BoardToolbar
              search={searchInput}
              onSearchChange={setSearchInput}
              onOpenFilters={() => setFilterOpen(true)}
              onOpenSettings={() => setSettingsOpen(true)}
              onCreate={() => setCreateOpen(true)}
              onFocusSearchRef={(el) => {
                searchInputRef.current = el;
              }}
            />
          </CardHeader>
        </Card>
      </motion.div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div ref={boardAreaRef} className="flex gap-3 overflow-x-auto pb-2">
          <SortableContext
            items={orderedColumns.map((column) => `board-column-${column.id}`)}
            strategy={horizontalListSortingStrategy}
          >
            {orderedColumns.map((column, index) => (
              <motion.div
                key={column.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16, delay: index * 0.03 }}
              >
                <BoardColumn
                  column={column}
                  tasks={tasksByColumn[column.id] ?? []}
                  canWrite={canWrite}
                  assigneeNameById={assigneeNameById}
                  memberOptions={memberOptions}
                  inlineCreateOpen={inlineCreateColumnId === column.id}
                  creating={creating}
                  onOpenInlineCreate={() => setInlineCreateColumnId(column.id)}
                  onCancelInlineCreate={() => setInlineCreateColumnId(null)}
                  onCreateInline={async (inlineDraft) => {
                    setCreating(true);
                    await createTaskForColumn(column.id, inlineDraft);
                    setCreating(false);
                  }}
                  onSubtaskStatusChange={updateSubtaskStatus}
                  onTaskPriorityChange={updateTaskPriority}
                  onTaskAssigneeChange={updateTaskAssignee}
                  onTaskDueDateChange={updateTaskDueDate}
                  onOpenTask={(taskId) => setDrawerTaskId(taskId)}
                  boardRootRef={boardAreaRef}
                  canManageColumn={canWrite}
                  onRenameColumn={(nextName) =>
                    renameBoardColumn(column.id, nextName)
                  }
                  savingColumns={savingColumns}
                />
              </motion.div>
            ))}
          </SortableContext>

          {canWrite ? (
            <motion.section
              className="w-[86vw] min-w-[18rem] max-w-[22rem] flex-none sm:w-[20rem]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
            >
              <Card className="h-full rounded-2xl border border-dashed border-border/70 bg-card/40">
                <CardContent className="flex h-full min-h-[132px] items-center justify-center p-3">
                  {addingColumn ? (
                    <form
                      className="w-full space-y-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void addBoardColumn();
                      }}
                    >
                      <Input
                        value={newColumnName}
                        onChange={(event) =>
                          setNewColumnName(event.target.value)
                        }
                        placeholder="Column name"
                        className="h-9"
                        autoFocus
                        disabled={savingColumns}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          size="sm"
                          disabled={!newColumnName.trim() || savingColumns}
                        >
                          Add
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAddingColumn(false);
                            setNewColumnName("");
                          }}
                          disabled={savingColumns}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAddingColumn(true)}
                      disabled={savingColumns || orderedColumns.length >= 12}
                    >
                      <Plus className="h-4 w-4" />
                      Add column
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.section>
          ) : null}
        </div>

        {canWrite ? (
          <DragOverlay dropAnimation={taskDropAnimation}>
            {activeTask
              ? (() => {
                  const PriorityIcon = priorityIconMap[activeTask.priority];
                  return (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.12, ease: "easeOut" }}
                      className="w-[18rem] rounded-xl border border-primary/35 bg-card/95 p-3 shadow-elev2"
                    >
                      <p className="text-sm font-medium">{activeTask.title}</p>
                      <Badge
                        className={`mt-1 inline-flex items-center gap-1 ${priorityToneMap[activeTask.priority]}`}
                      >
                        <PriorityIcon className="h-3 w-3" />
                        {priorityLabelMap[activeTask.priority]}
                      </Badge>
                    </motion.div>
                  );
                })()
              : null}
          </DragOverlay>
        ) : null}
      </DndContext>

      <TaskDrawer
        projectId={projectId}
        task={drawerTask}
        tasks={tasks}
        columns={orderedColumns}
        members={members}
        canWrite={canWrite}
        open={Boolean(drawerTask)}
        actorUid={actorUid}
        onOpenChange={(open) => (!open ? setDrawerTaskId(null) : undefined)}
        onTaskUpdated={(updatedTask) => {
          setTasks((prev) =>
            prev.map((task) =>
              task.id === updatedTask.id ? updatedTask : task,
            ),
          );
        }}
        onTaskDeleted={(taskId) => {
          setTasks((prev) => prev.filter((task) => task.id !== taskId));
        }}
        onOpenFullPage={(taskId) => {
          router.push(`/admin/projects/${projectId}/tasks/${taskId}`);
        }}
        onOpenTask={(taskId) => setDrawerTaskId(taskId)}
        onSaved={loadBoard}
      />

      <FilterPopover
        open={filterOpen}
        onOpenChange={setFilterOpen}
        filters={filters}
        onChange={setFilters}
        columns={orderedColumns}
        members={members}
        tasks={tasks}
      />

      <BoardSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={boardSettings}
        onChange={setBoardSettings}
        accessSummary={canWrite ? "owner/editor" : "viewer"}
      />

      <CreateTaskModal
        open={createOpen}
        canWrite={canWrite}
        creating={creating}
        title={title}
        description={description}
        priority={priority}
        statusColumnId={statusColumnId}
        assigneeId={createAssigneeId}
        dueDateInput={dueDateInput}
        labelsInput={labelsInput}
        members={members}
        columns={orderedColumns}
        onOpenChange={setCreateOpen}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onPriorityChange={setPriority}
        onStatusChange={setStatusColumnId}
        onAssigneeChange={setCreateAssigneeId}
        onDueDateChange={setDueDateInput}
        onLabelsChange={setLabelsInput}
        onSubmit={createTask}
      />
    </div>
  );
}
