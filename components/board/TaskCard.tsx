"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CSS } from "@dnd-kit/utilities";
import { defaultAnimateLayoutChanges, useSortable, type AnimateLayoutChanges } from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, CheckCircle2, Circle, Clock3, MessageSquare, UserRound } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { priorityIconMap } from "@/lib/project-management/priority-ui";
import { formatDateOnly, formatTaskIdentifier, isTaskOverdue, toDatetimeLocalInput } from "@/lib/project-management/utils";
import { priorityLabelMap, priorityToneMap, type TaskDoc, type TaskPriority } from "@/types/project-management";

const prioritySurfaceStyleMap: Record<TaskPriority, CSSProperties> = {
  P1: {
    borderColor: "rgb(248 113 113 / 0.55)",
    backgroundColor: "rgb(248 113 113 / 0.12)"
  },
  P2: {
    borderColor: "rgb(251 146 60 / 0.55)",
    backgroundColor: "rgb(251 146 60 / 0.12)"
  },
  P3: {
    borderColor: "rgb(96 165 250 / 0.55)",
    backgroundColor: "rgb(96 165 250 / 0.12)"
  },
  P4: {
    borderColor: "rgb(148 163 184 / 0.55)",
    backgroundColor: "rgb(148 163 184 / 0.12)"
  }
};

type TaskCardProps = {
  task: TaskDoc;
  canWrite: boolean;
  assigneeLabel?: string;
  memberOptions: Array<{ uid: string; label: string }>;
  onSubtaskStatusChange: (subtaskId: string, status: "todo" | "in_progress" | "done") => void;
  onQuickPriorityChange: (priority: TaskPriority) => void;
  onQuickAssigneeChange: (assigneeId: string) => void;
  onQuickDueDateChange: (dueDateInput: string | null) => void;
  onOpen: () => void;
};

type SubtaskStatus = "todo" | "in_progress" | "done";
type TaskMenuType = "priority" | "assignee" | "due";

const subtaskStatusLabelMap: Record<SubtaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done"
};

const subtaskStatusTextToneMap: Record<SubtaskStatus, string> = {
  todo: "text-muted-foreground",
  in_progress: "text-amber-500",
  done: "text-emerald-500"
};

const priorityMenuToneMap: Record<TaskPriority, string> = {
  P1: "text-red-500",
  P2: "text-orange-500",
  P3: "text-blue-500",
  P4: "text-slate-500"
};

const menuHoverClass =
  "transition-all duration-150 hover:bg-primary/15 hover:text-foreground hover:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.35)] hover:translate-x-0.5";

const animateTaskLayoutChanges: AnimateLayoutChanges = (args) => {
  if (args.wasDragging && args.newIndex !== args.index) return true;
  return defaultAnimateLayoutChanges(args);
};

function SubtaskStatusIcon({ status, className = "h-3 w-3" }: { status: SubtaskStatus; className?: string }) {
  if (status === "done") return <CheckCircle2 className={className} />;
  if (status === "in_progress") return <Clock3 className={className} />;
  return <Circle className={className} />;
}

function subtaskStatusTone(status: SubtaskStatus) {
  if (status === "done") return "border-emerald-500/45 bg-emerald-500/10 text-emerald-500";
  if (status === "in_progress") return "border-amber-500/45 bg-amber-500/10 text-amber-500";
  return "border-border/70 bg-card/60 text-muted-foreground";
}

function toLocalInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hour = String(value.getHours()).padStart(2, "0");
  const minute = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function getInitials(value: string) {
  const normalized = value.trim();
  if (!normalized) return "?";
  const chunks = normalized.split(/\s+/).filter(Boolean);
  if (chunks.length === 1) return chunks[0].slice(0, 2).toUpperCase();
  return `${chunks[0][0] ?? ""}${chunks[1][0] ?? ""}`.toUpperCase();
}

export function TaskCard({
  task,
  canWrite,
  assigneeLabel,
  memberOptions,
  onSubtaskStatusChange,
  onQuickPriorityChange,
  onQuickAssigneeChange,
  onQuickDueDateChange,
  onOpen
}: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !canWrite,
    transition: {
      duration: 240,
      easing: "cubic-bezier(0.18, 0.67, 0.3, 1.02)"
    },
    animateLayoutChanges: animateTaskLayoutChanges,
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

  const shownLabels = task.labels.slice(0, 2);
  const extraLabels = Math.max(0, task.labels.length - shownLabels.length);
  const shownSubtasks = task.subtasks;
  const PriorityIcon = priorityIconMap[task.priority];
  const cardStyle = prioritySurfaceStyleMap[task.priority];
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const pointerMovedRef = useRef(false);
  const [openSubtaskMenuId, setOpenSubtaskMenuId] = useState<string | null>(null);
  const [openTaskMenu, setOpenTaskMenu] = useState<TaskMenuType | null>(null);
  const [dueDraft, setDueDraft] = useState("");

  useEffect(() => {
    setDueDraft(toDatetimeLocalInput(task.dueDate));
  }, [task.dueDate]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-subtask-status-menu-root='true']") && !target?.closest("[data-task-menu-root='true']")) {
        setOpenSubtaskMenuId(null);
        setOpenTaskMenu(null);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const todayAt1800 = (() => {
    const next = new Date();
    next.setHours(18, 0, 0, 0);
    return toLocalInputValue(next);
  })();

  const tomorrowAt1800 = (() => {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(18, 0, 0, 0);
    return toLocalInputValue(next);
  })();

  const hasOpenMenu = Boolean(openSubtaskMenuId || openTaskMenu);
  const dndPointerDown = listeners?.onPointerDown;
  const dndKeyDown = listeners?.onKeyDown;

  return (
    <div ref={setNodeRef} style={style} className={`relative ${hasOpenMenu ? "z-40" : "z-0"}`}>
      <motion.div
        layout="position"
        initial={{ opacity: 0 }}
        animate={{ opacity: isDragging ? 0.88 : 1, scale: isDragging ? 1.015 : 1 }}
        transition={{
          opacity: { duration: 0.16, ease: "easeOut" },
          scale: { duration: 0.14, ease: "easeOut" },
          layout: {
            type: "spring",
            stiffness: 500,
            damping: 36,
            mass: 0.72
          }
        }}
        whileHover={isDragging ? undefined : { y: -1.5 }}
      >
        <Card
          className={`rounded-xl border ${isDragging ? "opacity-65" : "opacity-100"} cursor-pointer transition-[box-shadow,filter] hover:brightness-[0.98] hover:shadow-elev1 will-change-transform`}
          style={cardStyle}
          {...attributes}
          {...listeners}
          role="button"
          tabIndex={0}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            dndPointerDown?.(event);
            pointerStartRef.current = { x: event.clientX, y: event.clientY };
            pointerMovedRef.current = false;
          }}
          onPointerMove={(event) => {
            const start = pointerStartRef.current;
            if (!start) return;
            if (Math.abs(event.clientX - start.x) > 5 || Math.abs(event.clientY - start.y) > 5) {
              pointerMovedRef.current = true;
            }
          }}
          onPointerUp={(event) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest("[data-no-task-open='true']")) {
              pointerStartRef.current = null;
              pointerMovedRef.current = false;
              return;
            }
            if (!pointerMovedRef.current && !isDragging) {
              onOpen();
            }
            pointerStartRef.current = null;
            pointerMovedRef.current = false;
          }}
          onPointerCancel={() => {
            pointerStartRef.current = null;
            pointerMovedRef.current = false;
          }}
          onKeyDown={(event) => {
            dndKeyDown?.(event);
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpen();
            }
          }}
        >
          <CardContent className="space-y-2 p-2.5">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium">{task.title}</p>
                {shownSubtasks.length ? (
                  <div className="mt-1.5 space-y-1 rounded-md border border-border/60 bg-card/60 p-1.5">
                    {shownSubtasks.map((subtask) => {
                      const statusValue = (subtask.status || (subtask.completed ? "done" : "todo")) as SubtaskStatus;
                      const isMenuOpen = openSubtaskMenuId === subtask.id;
                      return (
                        <div key={subtask.id} className="grid grid-cols-[1fr_auto] items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="truncate">{subtask.title}</span>
                          <div className="relative" data-subtask-status-menu-root="true" data-no-task-open="true">
                            <button
                              type="button"
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-md border transition ${subtaskStatusTone(statusValue)} ${
                                !canWrite ? "opacity-70" : "hover:brightness-110"
                              }`}
                              title={`Status: ${subtaskStatusLabelMap[statusValue]}`}
                              disabled={!canWrite}
                              onPointerDown={(event) => event.stopPropagation()}
                              onPointerUp={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenSubtaskMenuId((prev) => (prev === subtask.id ? null : subtask.id));
                              }}
                            >
                              <SubtaskStatusIcon status={statusValue} />
                            </button>
                            <AnimatePresence>
                              {isMenuOpen ? (
                                <motion.div
                                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                                  transition={{ duration: 0.14, ease: "easeOut" }}
                                  className="absolute bottom-full right-0 z-30 mb-1 w-36 rounded-lg border border-primary/25 bg-gradient-to-b from-card/95 to-card/85 p-1 shadow-elev2 backdrop-blur"
                                  onPointerDown={(event) => event.stopPropagation()}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  {(["todo", "in_progress", "done"] as const).map((option, index) => (
                                    <motion.button
                                      key={option}
                                      type="button"
                                      initial={{ opacity: 0, x: -4 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      whileHover={{ x: 2, scale: 1.01 }}
                                      whileTap={{ scale: 0.99 }}
                                      transition={{ duration: 0.14, delay: index * 0.02 }}
                                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] ${menuHoverClass} ${
                                        option === statusValue ? "bg-card/80 ring-1 ring-primary/30" : ""
                                      }`}
                                      onPointerDown={(event) => event.stopPropagation()}
                                      onPointerUp={(event) => event.stopPropagation()}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        onSubtaskStatusChange(subtask.id, option);
                                        setOpenSubtaskMenuId(null);
                                      }}
                                    >
                                      <span className={`inline-flex h-4 w-4 items-center justify-center ${subtaskStatusTextToneMap[option]}`}>
                                        <SubtaskStatusIcon status={option} className="h-3.5 w-3.5" />
                                      </span>
                                      {subtaskStatusLabelMap[option]}
                                    </motion.button>
                                  ))}
                                </motion.div>
                              ) : null}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                {shownLabels.map((label) => (
                  <span key={`${task.id}-${label}`} className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] text-muted-foreground">
                    {label}
                  </span>
                ))}
                {extraLabels ? <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] text-muted-foreground">+{extraLabels}</span> : null}
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
              <span className="rounded-md border border-border/70 bg-card/70 px-2 py-0.5" title={`Task ID: ${formatTaskIdentifier(task)}`}>
                {formatTaskIdentifier(task)}
              </span>

              {task.dueDate ? (
                <div className="relative" data-task-menu-root="true" data-no-task-open="true">
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 transition-all duration-150 ${
                      isTaskOverdue(task) ? "text-destructive" : "text-muted-foreground"
                    } hover:bg-primary/15 hover:text-foreground hover:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.35)]`}
                    title={`Due date: ${formatDateOnly(task.dueDate)}`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onPointerUp={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenTaskMenu((prev) => (prev === "due" ? null : "due"));
                    }}
                  >
                    <CalendarClock className="h-3 w-3" />
                    {formatDateOnly(task.dueDate)}
                  </button>
                  <AnimatePresence>
                    {openTaskMenu === "due" ? (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.14, ease: "easeOut" }}
                        className="absolute bottom-full right-0 z-30 mb-1 w-56 rounded-lg border border-primary/25 bg-gradient-to-b from-card/95 to-card/85 p-2 shadow-elev2 backdrop-blur"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="mb-2 grid grid-cols-2 gap-1">
                          <button
                            type="button"
                            className="rounded-md border border-blue-500/35 bg-blue-500/10 px-2 py-1 text-[11px] text-blue-200 transition-all duration-150 hover:-translate-y-0.5 hover:bg-blue-500/25 hover:shadow-[0_0_0_1px_rgba(96,165,250,0.35)]"
                            onClick={() => {
                              setDueDraft(todayAt1800);
                              onQuickDueDateChange(todayAt1800);
                              setOpenTaskMenu(null);
                            }}
                          >
                            Today 6 PM
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-violet-500/35 bg-violet-500/10 px-2 py-1 text-[11px] text-violet-200 transition-all duration-150 hover:-translate-y-0.5 hover:bg-violet-500/25 hover:shadow-[0_0_0_1px_rgba(167,139,250,0.35)]"
                            onClick={() => {
                              setDueDraft(tomorrowAt1800);
                              onQuickDueDateChange(tomorrowAt1800);
                              setOpenTaskMenu(null);
                            }}
                          >
                            Tomorrow 6 PM
                          </button>
                        </div>
                        <input
                          type="datetime-local"
                          value={dueDraft}
                          onChange={(event) => setDueDraft(event.target.value)}
                          className="h-8 w-full rounded-md border border-border/70 bg-background px-2 text-xs"
                        />
                        <div className="mt-2 flex gap-1">
                          <button
                            type="button"
                            className="flex-1 rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200 transition-all duration-150 hover:-translate-y-0.5 hover:bg-emerald-500/25 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.35)]"
                            onClick={() => {
                              onQuickDueDateChange(dueDraft || null);
                              setOpenTaskMenu(null);
                            }}
                          >
                            Apply
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-rose-500/35 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200 transition-all duration-150 hover:-translate-y-0.5 hover:bg-rose-500/25 hover:shadow-[0_0_0_1px_rgba(244,63,94,0.35)]"
                            onClick={() => {
                              setDueDraft("");
                              onQuickDueDateChange(null);
                              setOpenTaskMenu(null);
                            }}
                          >
                            Clear
                          </button>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              ) : null}

              <span className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-0.5" title={`Comments: ${task.comments.length}`}>
                <MessageSquare className="h-3 w-3" />
                {task.comments.length}
              </span>

              <div className="relative" data-task-menu-root="true" data-no-task-open="true">
                <button
                  type="button"
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${priorityToneMap[task.priority]} transition hover:brightness-110`}
                  title={`Priority: ${priorityLabelMap[task.priority]}`}
                  onPointerDown={(event) => event.stopPropagation()}
                  onPointerUp={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenTaskMenu((prev) => (prev === "priority" ? null : "priority"));
                  }}
                >
                  <PriorityIcon className="h-3.5 w-3.5" />
                </button>
                <AnimatePresence>
                  {openTaskMenu === "priority" ? (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.14, ease: "easeOut" }}
                      className="absolute bottom-full right-0 z-30 mb-1 w-44 rounded-lg border border-primary/25 bg-gradient-to-b from-card/95 to-card/85 p-1 shadow-elev2 backdrop-blur"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {(["P1", "P2", "P3", "P4"] as const).map((option, index) => {
                        const OptionIcon = priorityIconMap[option];
                        return (
                          <motion.button
                            key={option}
                            type="button"
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            whileHover={{ x: 2, scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            transition={{ duration: 0.14, delay: index * 0.02 }}
                            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] ${menuHoverClass} ${
                              option === task.priority ? "bg-card/80 ring-1 ring-primary/30" : ""
                            }`}
                            onClick={() => {
                              onQuickPriorityChange(option);
                              setOpenTaskMenu(null);
                            }}
                          >
                            <OptionIcon className={`h-3.5 w-3.5 ${priorityMenuToneMap[option]}`} />
                            {priorityLabelMap[option]}
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <div className="relative" data-task-menu-root="true" data-no-task-open="true">
                <button
                  type="button"
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-muted-foreground transition hover:brightness-110 ${
                    task.assigneeId ? "border-border/70 bg-card/70" : "border-dashed border-border/60 bg-card/40 opacity-80"
                  }`}
                  title={task.assigneeId ? `Assigned to ${assigneeLabel || task.assigneeId}` : "Unassigned"}
                  onPointerDown={(event) => event.stopPropagation()}
                  onPointerUp={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenTaskMenu((prev) => (prev === "assignee" ? null : "assignee"));
                  }}
                >
                  {task.assigneeId && assigneeLabel ? <span className="text-[9px] font-semibold">{getInitials(assigneeLabel)}</span> : <UserRound className="h-3.5 w-3.5" />}
                </button>
                <AnimatePresence>
                  {openTaskMenu === "assignee" ? (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.14, ease: "easeOut" }}
                      className="absolute bottom-full right-0 z-30 mb-1 max-h-56 w-52 overflow-y-auto rounded-lg border border-primary/25 bg-gradient-to-b from-card/95 to-card/85 p-1 shadow-elev2 backdrop-blur"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <motion.button
                        type="button"
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ x: 2, scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        transition={{ duration: 0.14 }}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] ${menuHoverClass} ${
                          !task.assigneeId ? "bg-card/80 ring-1 ring-primary/30" : ""
                        }`}
                        onClick={() => {
                          onQuickAssigneeChange("");
                          setOpenTaskMenu(null);
                        }}
                      >
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-border/70 text-muted-foreground">
                          <UserRound className="h-3 w-3" />
                        </span>
                        Unassigned
                      </motion.button>
                      {memberOptions.map((member, index) => (
                        <motion.button
                          key={member.uid}
                          type="button"
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          whileHover={{ x: 2, scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          transition={{ duration: 0.14, delay: (index + 1) * 0.02 }}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] ${menuHoverClass} ${
                            task.assigneeId === member.uid ? "bg-card/80 ring-1 ring-primary/30" : ""
                          }`}
                          onClick={() => {
                            onQuickAssigneeChange(member.uid);
                            setOpenTaskMenu(null);
                          }}
                          >
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                              {getInitials(member.label)}
                            </span>
                            <span className="truncate">{member.label}</span>
                        </motion.button>
                      ))}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
