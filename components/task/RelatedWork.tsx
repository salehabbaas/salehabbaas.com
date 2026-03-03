"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Link2,
  ListTodo,
  Sparkles,
} from "lucide-react";

import { LinkedTasksTable } from "@/components/task/LinkedTasksTable";
import { SubtasksTable } from "@/components/task/SubtasksTable";
import type {
  TaskDoc,
  TaskLinkRelationType,
  TaskSubtask,
} from "@/types/project-management";
import type { ProjectMemberSummary } from "@/types/admin-access";

type RelatedWorkProps = {
  task: TaskDoc;
  taskOptions: TaskDoc[];
  canWrite: boolean;
  subtasks: TaskSubtask[];
  members: ProjectMemberSummary[];
  subtaskInput: string;
  onSubtaskInputChange: (value: string) => void;
  onAddSubtask: () => void;
  onToggleSubtask: (id: string, checked: boolean) => void;
  onRenameSubtask: (id: string, title: string) => void;
  onCommitSubtaskRename: (id: string, title: string) => void;
  onRemoveSubtask: (id: string) => void;
  onSubtaskAssigneeChange: (id: string, assigneeId: string) => void;
  onSubtaskStatusChange: (
    id: string,
    status: "todo" | "in_progress" | "done",
  ) => void;
  onSubtaskPriorityChange: (
    id: string,
    priority: "P1" | "P2" | "P3" | "P4",
  ) => void;
  addRelation: TaskLinkRelationType;
  addTarget: string;
  onRelationChange: (value: TaskLinkRelationType) => void;
  onTargetChange: (value: string) => void;
  onAddLink: () => void;
  onRemoveLink: (id: string) => void;
  onOpenTask: (taskId: string) => void;
};

export function RelatedWork(props: RelatedWorkProps) {
  const linkedTasksCount = (props.task.links ?? []).length;
  const [subtasksCollapsed, setSubtasksCollapsed] = useState(
    props.subtasks.length === 0,
  );
  const [linkedTasksCollapsed, setLinkedTasksCollapsed] = useState(
    linkedTasksCount === 0,
  );

  const subtaskProgress = useMemo(() => {
    const total = props.subtasks.length;
    if (!total) return 0;
    const done = props.subtasks.filter((item) => item.completed).length;
    return Math.round((done / total) * 100);
  }, [props.subtasks]);
  const isProgressComplete =
    props.subtasks.length > 0 && subtaskProgress === 100;

  useEffect(() => {
    setSubtasksCollapsed(props.subtasks.length === 0);
    setLinkedTasksCollapsed(linkedTasksCount === 0);
  }, [props.task.id, props.subtasks.length, linkedTasksCount]);

  useEffect(() => {
    if (props.subtasks.length > 0) {
      setSubtasksCollapsed(false);
    }
  }, [props.subtasks.length]);

  useEffect(() => {
    if (linkedTasksCount > 0) {
      setLinkedTasksCollapsed(false);
    }
  }, [linkedTasksCount]);

  return (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16 }}
    >
      <div className="flex items-center justify-end">
        <motion.div
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
            isProgressComplete
              ? "border-emerald-400/45 bg-emerald-500/12 text-emerald-200"
              : "border-border/70 bg-card/60 text-muted-foreground"
          }`}
          animate={isProgressComplete ? { scale: [1, 1.04, 1] } : { scale: 1 }}
          transition={
            isProgressComplete
              ? { duration: 0.8, repeat: Infinity, repeatDelay: 0.3 }
              : { duration: 0.2 }
          }
        >
          {isProgressComplete ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <ListTodo className="h-3.5 w-3.5" />
          )}
          Progress {subtaskProgress}%
        </motion.div>
      </div>
      <div
        className={`relative h-2 w-full overflow-hidden rounded-full border bg-card/70 ${isProgressComplete ? "border-emerald-500/40" : "border-border/70"}`}
      >
        <motion.div
          className={
            isProgressComplete ? "h-full bg-emerald-500" : "h-full bg-primary"
          }
          initial={{ width: 0 }}
          animate={{ width: `${subtaskProgress}%` }}
          transition={{ duration: 0.26, ease: "easeOut" }}
        />
        {isProgressComplete ? (
          <motion.div
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent"
            initial={{ x: "-120%" }}
            animate={{ x: "220%" }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
          />
        ) : null}
      </div>
      <AnimatePresence>
        {isProgressComplete ? (
          <motion.div
            key="progress-complete"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="inline-flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200"
          >
            <Sparkles className="h-3.5 w-3.5" />
            All subtasks completed
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="rounded-xl border border-border/70 bg-card/35">
        <button
          type="button"
          onClick={() => setSubtasksCollapsed((prev) => !prev)}
          className="flex w-full items-center justify-between px-3 py-2 text-left"
          aria-expanded={!subtasksCollapsed}
        >
          <span className="inline-flex items-center gap-1.5 text-sm font-medium">
            <ListTodo className="h-3.5 w-3.5" />
            Subtasks
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            {props.subtasks.length}
            {subtasksCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </span>
        </button>
        <AnimatePresence initial={false}>
          {subtasksCollapsed ? null : (
            <motion.div
              key="subtasks-expanded"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="relative z-20"
            >
              <div className="px-2 pb-2">
                <SubtasksTable
                  subtasks={props.subtasks}
                  canWrite={props.canWrite}
                  input={props.subtaskInput}
                  members={props.members}
                  onInputChange={props.onSubtaskInputChange}
                  onAdd={props.onAddSubtask}
                  onToggle={props.onToggleSubtask}
                  onRename={props.onRenameSubtask}
                  onRenameCommit={props.onCommitSubtaskRename}
                  onRemove={props.onRemoveSubtask}
                  onAssigneeChange={props.onSubtaskAssigneeChange}
                  onStatusChange={props.onSubtaskStatusChange}
                  onPriorityChange={props.onSubtaskPriorityChange}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="rounded-xl border border-border/70 bg-card/35">
        <button
          type="button"
          onClick={() => setLinkedTasksCollapsed((prev) => !prev)}
          className="flex w-full items-center justify-between px-3 py-2 text-left"
          aria-expanded={!linkedTasksCollapsed}
        >
          <span className="inline-flex items-center gap-1.5 text-sm font-medium">
            <Link2 className="h-3.5 w-3.5" />
            Linked tasks
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            {linkedTasksCount}
            {linkedTasksCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </span>
        </button>
        <AnimatePresence initial={false}>
          {linkedTasksCollapsed ? null : (
            <motion.div
              key="links-expanded"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="relative z-10"
            >
              <div className="px-2 pb-2">
                <LinkedTasksTable
                  task={props.task}
                  taskOptions={props.taskOptions}
                  canWrite={props.canWrite}
                  addRelation={props.addRelation}
                  addTarget={props.addTarget}
                  onRelationChange={props.onRelationChange}
                  onTargetChange={props.onTargetChange}
                  onAdd={props.onAddLink}
                  onRemove={props.onRemoveLink}
                  onOpenTask={props.onOpenTask}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
