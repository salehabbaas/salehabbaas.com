"use client";

import { type RefObject, useEffect, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { GripVertical, Plus } from "lucide-react";

import {
  InlineCreateTask,
  type InlineCreateTaskDraft,
} from "@/components/board/InlineCreateTask";
import { TaskCard } from "@/components/board/TaskCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  type BoardColumn as BoardColumnType,
  type TaskDoc,
  type TaskPriority,
} from "@/types/project-management";

type BoardColumnProps = {
  column: BoardColumnType;
  tasks: TaskDoc[];
  canWrite: boolean;
  assigneeNameById: Record<string, string>;
  memberOptions: Array<{ uid: string; label: string }>;
  inlineCreateOpen: boolean;
  creating: boolean;
  onOpenInlineCreate: () => void;
  onCancelInlineCreate: () => void;
  onCreateInline: (draft: InlineCreateTaskDraft) => Promise<void>;
  onSubtaskStatusChange: (
    taskId: string,
    subtaskId: string,
    status: "todo" | "in_progress" | "done",
  ) => void;
  onTaskPriorityChange: (taskId: string, priority: TaskPriority) => void;
  onTaskAssigneeChange: (taskId: string, assigneeId: string) => void;
  onTaskDueDateChange: (taskId: string, dueDateInput: string | null) => void;
  onOpenTask: (taskId: string) => void;
  boardRootRef?: RefObject<HTMLElement | null>;
  canManageColumn?: boolean;
  onRenameColumn?: (nextName: string) => Promise<void>;
  savingColumns?: boolean;
};

export function BoardColumn({
  column,
  tasks,
  canWrite,
  assigneeNameById,
  memberOptions,
  inlineCreateOpen,
  creating,
  onOpenInlineCreate,
  onCancelInlineCreate,
  onCreateInline,
  onSubtaskStatusChange,
  onTaskPriorityChange,
  onTaskAssigneeChange,
  onTaskDueDateChange,
  onOpenTask,
  boardRootRef,
  canManageColumn = false,
  onRenameColumn,
  savingColumns = false,
}: BoardColumnProps) {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(column.name);
  const [renaming, setRenaming] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: `column-${column.id}` });
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `board-column-${column.id}`,
    disabled: !canManageColumn || savingColumns,
    transition: {
      duration: 240,
      easing: "cubic-bezier(0.18, 0.67, 0.3, 1.02)",
    },
    data: {
      type: "column",
      columnId: column.id,
    },
  });

  useEffect(() => {
    setDraftName(column.name);
    setEditingName(false);
  }, [column.id, column.name]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  async function commitName() {
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === column.name || !onRenameColumn) {
      setDraftName(column.name);
      setEditingName(false);
      return;
    }

    setRenaming(true);
    try {
      await onRenameColumn(trimmed);
      setEditingName(false);
    } finally {
      setRenaming(false);
    }
  }

  return (
    <motion.section
      ref={setSortableRef}
      style={style}
      layout="position"
      className={`w-[86vw] min-w-[18rem] max-w-[22rem] flex-none sm:w-[20rem] ${isDragging ? "opacity-70" : "opacity-100"}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.18,
        ease: "easeOut",
        layout: {
          type: "spring",
          stiffness: 420,
          damping: 34,
          mass: 0.8,
        },
      }}
    >
      <Card className="h-full rounded-2xl border border-border/70 transition-shadow hover:shadow-elev1">
        <CardHeader
          className={`rounded-2xl border ${isOver ? "border-primary/40 bg-primary/10" : "border-border/70 bg-card/60"}`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              {editingName && canManageColumn ? (
                <Input
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  autoFocus
                  className="h-8 text-sm"
                  onBlur={() => void commitName()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void commitName();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setDraftName(column.name);
                      setEditingName(false);
                    }
                  }}
                  disabled={renaming || savingColumns}
                />
              ) : (
                <button
                  type="button"
                  className="w-full truncate text-left text-sm font-semibold hover:text-primary"
                  onClick={() => {
                    if (!canManageColumn || savingColumns) return;
                    setEditingName(true);
                  }}
                  disabled={!canManageColumn || savingColumns}
                >
                  {column.name}
                </button>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="secondary">{tasks.length}</Badge>
              {canManageColumn ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  title="Drag to reorder column"
                  {...attributes}
                  {...listeners}
                  disabled={savingColumns}
                  onClick={(event) => event.stopPropagation()}
                >
                  <GripVertical className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          </div>
          {canWrite && !inlineCreateOpen ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 w-fit px-2 text-xs"
              onClick={onOpenInlineCreate}
            >
              <Plus className="h-3.5 w-3.5" />
              Create
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="p-2">
          <div ref={setNodeRef} className="space-y-2">
            <InlineCreateTask
              open={inlineCreateOpen}
              members={memberOptions}
              boardRootRef={boardRootRef}
              busy={creating}
              onCancel={onCancelInlineCreate}
              onCreate={onCreateInline}
            />
            <SortableContext
              items={tasks.map((task) => task.id)}
              strategy={verticalListSortingStrategy}
            >
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  canWrite={canWrite}
                  assigneeLabel={
                    task.assigneeId
                      ? assigneeNameById[task.assigneeId]
                      : undefined
                  }
                  memberOptions={memberOptions}
                  onSubtaskStatusChange={(subtaskId, status) =>
                    onSubtaskStatusChange(task.id, subtaskId, status)
                  }
                  onQuickPriorityChange={(priority) =>
                    onTaskPriorityChange(task.id, priority)
                  }
                  onQuickAssigneeChange={(assigneeId) =>
                    onTaskAssigneeChange(task.id, assigneeId)
                  }
                  onQuickDueDateChange={(dueDateInput) =>
                    onTaskDueDateChange(task.id, dueDateInput)
                  }
                  onOpen={() => onOpenTask(task.id)}
                />
              ))}
            </SortableContext>
            <AnimatePresence initial={false}>
              {!tasks.length ? (
                <motion.p
                  key="empty-column"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground"
                >
                  No tasks
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
}
