"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarClock, GripVertical, Plus, Settings2 } from "lucide-react";
import { motion } from "framer-motion";

import { TaskDrawer } from "@/components/admin/projects/task-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  formatDateTime,
  fromDatetimeLocalInput,
  isTaskOverdue,
  orderColumns,
  parseTagInput,
  toDatetimeLocalInput
} from "@/lib/project-management/utils";
import {
  priorityToneMap,
  type BoardColumn,
  type BoardDoc,
  type ProjectDoc,
  type TaskDoc,
  type TaskPriority
} from "@/types/project-management";

type ProjectBoardPayload = {
  project: ProjectDoc;
  board: BoardDoc | null;
  tasks: TaskDoc[];
};

type ProjectBoardProps = {
  projectId: string;
};

type SortableTaskCardProps = {
  task: TaskDoc;
  onClick: () => void;
  onQuickEdit: () => void;
};

function SortableTaskCard({ task, onClick, onQuickEdit }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: {
      type: "task",
      task,
      columnId: task.statusColumnId
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={`cursor-pointer rounded-2xl border border-border/70 ${isDragging ? "opacity-65" : "opacity-100"}`}
        onClick={onClick}
      >
        <CardContent className="space-y-3 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium tracking-tight">{task.title}</p>
            <div
              className="inline-flex cursor-grab items-center rounded-lg border border-border/70 bg-card/70 p-1.5"
              {...attributes}
              {...listeners}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={priorityToneMap[task.priority]}>{task.priority}</Badge>
            <span className={`text-xs ${isTaskOverdue(task) ? "text-destructive" : "text-muted-foreground"}`}>
              {task.dueDate ? formatDateTime(task.dueDate) : "No due date"}
            </span>
          </div>

          <div className="flex flex-wrap gap-1">
            {task.labels.slice(0, 4).map((label) => (
              <span key={`${task.id}-${label}`} className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                {label}
              </span>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={(event) => {
              event.stopPropagation();
              onQuickEdit();
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            Quick edit
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ColumnDroppable({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${id}` });
  return (
    <div ref={setNodeRef} className={`space-y-2 rounded-2xl p-2 transition-colors ${isOver ? "bg-primary/10" : "bg-transparent"}`}>
      {children}
    </div>
  );
}

function normalizeColumnTasks(tasks: TaskDoc[]) {
  return [...tasks].sort((a, b) => {
    if (a.orderInColumn !== b.orderInColumn) return a.orderInColumn - b.orderInColumn;
    if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank;
    return a.title.localeCompare(b.title);
  });
}

function replaceColumnTasks(all: TaskDoc[], columnId: string, nextColumnTasks: TaskDoc[]) {
  const other = all.filter((task) => task.statusColumnId !== columnId);
  return [...other, ...nextColumnTasks];
}

function normalizeOrder(tasks: TaskDoc[], columnId: string) {
  return normalizeColumnTasks(tasks)
    .filter((task) => task.statusColumnId === columnId)
    .map((task, index) => ({
      ...task,
      orderInColumn: index
    }));
}

export function ProjectBoard({ projectId }: ProjectBoardProps) {
  const searchParams = useSearchParams();

  const [payload, setPayload] = useState<ProjectBoardPayload | null>(null);
  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("P3");
  const [statusColumnId, setStatusColumnId] = useState("");
  const [dueDateInput, setDueDateInput] = useState("");
  const [labelsInput, setLabelsInput] = useState("");

  const [quickEditTask, setQuickEditTask] = useState<TaskDoc | null>(null);
  const [quickPriority, setQuickPriority] = useState<TaskPriority>("P3");
  const [quickDueDate, setQuickDueDate] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6
      }
    })
  );

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch(`/api/admin/projects/${projectId}`, { cache: "no-store" });
      const data = (await response.json()) as ProjectBoardPayload & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to load board");
      setPayload(data);
      setTasks(data.tasks ?? []);

      const defaultColumn = orderColumns(data.board?.columns ?? [])[0];
      if (defaultColumn) setStatusColumnId((prev) => prev || defaultColumn.id);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load board");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    const taskId = searchParams.get("taskId");
    if (taskId) setDrawerTaskId(taskId);
  }, [searchParams]);

  const board = payload?.board;
  const project = payload?.project;
  const orderedColumns = useMemo(() => orderColumns(board?.columns ?? []), [board?.columns]);

  const tasksByColumn = useMemo(() => {
    const map: Record<string, TaskDoc[]> = {};
    orderedColumns.forEach((column) => {
      map[column.id] = normalizeColumnTasks(tasks.filter((task) => task.statusColumnId === column.id));
    });
    return map;
  }, [orderedColumns, tasks]);

  const drawerTask = tasks.find((task) => task.id === drawerTaskId) ?? null;
  const activeTask = tasks.find((task) => task.id === activeTaskId) ?? null;

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!board) return;

    setCreating(true);
    setStatus("");

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
          watchers: []
        })
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to create task");

      setCreateOpen(false);
      setTitle("");
      setDescription("");
      setPriority("P3");
      setDueDateInput("");
      setLabelsInput("");
      await loadBoard();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create task");
    } finally {
      setCreating(false);
    }
  }

  async function saveQuickEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quickEditTask) return;

    setStatus("");

    try {
      const response = await fetch(`/api/admin/projects/${projectId}/tasks/${quickEditTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priority: quickPriority,
          dueDate: fromDatetimeLocalInput(quickDueDate) ?? null
        })
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to update task");

      setQuickEditTask(null);
      await loadBoard();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update task");
    }
  }

  function openQuickEdit(task: TaskDoc) {
    setQuickEditTask(task);
    setQuickPriority(task.priority);
    setQuickDueDate(toDatetimeLocalInput(task.dueDate));
  }

  function onDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setActiveTaskId(id);
  }

  async function persistReorder(nextTasks: TaskDoc[], updates: Array<{ taskId: string; statusColumnId: string; orderInColumn: number }>, movedTaskId: string, fromColumnId: string, toColumnId: string) {
    const response = await fetch(`/api/admin/projects/${projectId}/tasks/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        updates,
        movedTaskId,
        fromColumnId,
        toColumnId
      })
    });

    const data = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(data.error ?? "Unable to persist task order");

    setTasks(nextTasks);
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveTaskId(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const activeTaskRow = tasks.find((task) => task.id === activeId);
    if (!activeTaskRow) return;

    const overTask = tasks.find((task) => task.id === overId);
    const toColumnId = overId.startsWith("column-") ? overId.replace("column-", "") : overTask?.statusColumnId;
    if (!toColumnId) return;

    const fromColumnId = activeTaskRow.statusColumnId;
    const previousTasks = tasks;

    const sourceTasks = normalizeColumnTasks(tasks.filter((task) => task.statusColumnId === fromColumnId));
    const targetTasks = normalizeColumnTasks(tasks.filter((task) => task.statusColumnId === toColumnId));

    let nextTasks = [...tasks];

    if (fromColumnId === toColumnId) {
      const oldIndex = sourceTasks.findIndex((task) => task.id === activeId);
      const newIndex = overId.startsWith("column-") ? sourceTasks.length - 1 : sourceTasks.findIndex((task) => task.id === overId);
      if (oldIndex < 0 || newIndex < 0) return;

      const moved = arrayMove(sourceTasks, oldIndex, newIndex).map((task, index) => ({
        ...task,
        orderInColumn: index
      }));
      nextTasks = replaceColumnTasks(nextTasks, fromColumnId, moved);

      const updates = moved.map((task) => ({
        taskId: task.id,
        statusColumnId: task.statusColumnId,
        orderInColumn: task.orderInColumn
      }));

      setTasks(nextTasks);
      try {
        await persistReorder(nextTasks, updates, activeId, fromColumnId, toColumnId);
      } catch (error) {
        setTasks(previousTasks);
        setStatus(error instanceof Error ? error.message : "Unable to persist task order");
      }

      return;
    }

    const removedSource = sourceTasks.filter((task) => task.id !== activeId).map((task, index) => ({
      ...task,
      orderInColumn: index
    }));

    const movedTask: TaskDoc = {
      ...activeTaskRow,
      statusColumnId: toColumnId
    };

    const insertIndex = overId.startsWith("column-") ? targetTasks.length : targetTasks.findIndex((task) => task.id === overId);
    const nextTargetBase = [...targetTasks];
    const normalizedInsert = insertIndex < 0 ? nextTargetBase.length : insertIndex;
    nextTargetBase.splice(normalizedInsert, 0, movedTask);

    const reorderedTarget = nextTargetBase.map((task, index) => ({
      ...task,
      orderInColumn: index,
      statusColumnId: toColumnId
    }));

    nextTasks = tasks.filter((task) => task.statusColumnId !== fromColumnId && task.statusColumnId !== toColumnId);
    nextTasks = [...nextTasks, ...removedSource, ...reorderedTarget];

    const sourceUpdates = normalizeOrder(nextTasks, fromColumnId);
    const targetUpdates = normalizeOrder(nextTasks, toColumnId);
    const updates = [...sourceUpdates, ...targetUpdates].map((task) => ({
      taskId: task.id,
      statusColumnId: task.statusColumnId,
      orderInColumn: task.orderInColumn
    }));

    setTasks(nextTasks);

    try {
      await persistReorder(nextTasks, updates, activeId, fromColumnId, toColumnId);
    } catch (error) {
      setTasks(previousTasks);
      setStatus(error instanceof Error ? error.message : "Unable to persist task move");
    }
  }

  const columnTone = [
    "border-slate-500/35 bg-slate-500/10",
    "border-blue-500/35 bg-blue-500/10",
    "border-amber-500/35 bg-amber-500/10",
    "border-emerald-500/35 bg-emerald-500/10"
  ];

  if (loading) {
    return (
      <div className="admin-workspace">
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">Loading board...</CardContent>
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
            <CardDescription>{status || "This project does not have a board yet."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={`/admin/projects/${projectId}/settings`}>
                <Settings2 className="h-4 w-4" />
                Open project settings
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-workspace space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>{project.name}</CardTitle>
            <CardDescription>{project.description || "No description"}</CardDescription>
            {status ? <p className="mt-2 text-sm text-primary">{status}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/admin/projects/${projectId}/settings`}>
                <Settings2 className="h-4 w-4" />
                Settings
              </Link>
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </div>
        </CardHeader>
      </Card>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {orderedColumns.map((column, index) => {
            const columnTasks = tasksByColumn[column.id] ?? [];
            const wipExceeded = typeof column.wipLimit === "number" && columnTasks.length > column.wipLimit;

            return (
              <motion.section
                key={column.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="w-[86vw] min-w-[18rem] max-w-[22rem] flex-none sm:w-[20rem]"
              >
                <Card className="h-full rounded-3xl border border-border/70">
                  <CardHeader className={`rounded-3xl border ${columnTone[index % columnTone.length]}`}>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base">{column.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{columnTasks.length}</Badge>
                        {typeof column.wipLimit === "number" ? (
                          <Badge variant={wipExceeded ? "outline" : "secondary"}>WIP {column.wipLimit}</Badge>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-2">
                    <ColumnDroppable id={column.id}>
                      <SortableContext items={columnTasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
                        {columnTasks.map((task) => (
                          <SortableTaskCard
                            key={task.id}
                            task={task}
                            onClick={() => setDrawerTaskId(task.id)}
                            onQuickEdit={() => openQuickEdit(task)}
                          />
                        ))}
                      </SortableContext>
                      {!columnTasks.length ? <p className="rounded-xl border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">Drop task here</p> : null}
                    </ColumnDroppable>
                  </CardContent>
                </Card>
              </motion.section>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-[18rem] rounded-2xl border border-primary/35 bg-card/95 p-3 shadow-elev2">
              <p className="text-sm font-medium">{activeTask.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{activeTask.priority}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskDrawer projectId={projectId} task={drawerTask} columns={orderedColumns} open={Boolean(drawerTask)} onOpenChange={(open) => (!open ? setDrawerTaskId(null) : undefined)} onSaved={loadBoard} />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create task</DialogTitle>
            <DialogDescription>Add a new card to the board.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={createTask}>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                  <option value="P3">P3</option>
                  <option value="P4">P4</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Column</Label>
                <Select value={statusColumnId} onChange={(event) => setStatusColumnId(event.target.value)}>
                  {orderedColumns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Due date</Label>
                <Input type="datetime-local" value={dueDateInput} onChange={(event) => setDueDateInput(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Labels</Label>
                <Input value={labelsInput} onChange={(event) => setLabelsInput(event.target.value)} placeholder="api, urgent" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(quickEditTask)} onOpenChange={(open) => (!open ? setQuickEditTask(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Edit</DialogTitle>
            <DialogDescription>Update priority and due date quickly.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveQuickEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={quickPriority} onChange={(event) => setQuickPriority(event.target.value as TaskPriority)}>
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
                <option value="P4">P4</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input type="datetime-local" value={quickDueDate} onChange={(event) => setQuickDueDate(event.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="rounded-2xl border border-border/70 bg-card/80 p-4 text-xs text-muted-foreground">
        <p className="flex items-center gap-2">
          <CalendarClock className="h-3.5 w-3.5" />
          Drag cards within a column to reorder or across columns to change status. Updates persist with optimistic UI and rollback on failure.
        </p>
      </div>
    </div>
  );
}
