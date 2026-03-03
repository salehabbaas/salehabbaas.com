"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Circle, Clock3, Plus, Trash2, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { priorityIconMap } from "@/lib/project-management/priority-ui";
import { priorityLabelMap, type TaskPriority, type TaskSubtask } from "@/types/project-management";
import type { ProjectMemberSummary } from "@/types/admin-access";

type SubtasksTableProps = {
  subtasks: TaskSubtask[];
  canWrite: boolean;
  input: string;
  members: ProjectMemberSummary[];
  onInputChange: (value: string) => void;
  onAdd: () => void;
  onToggle: (id: string, checked: boolean) => void;
  onRename: (id: string, title: string) => void;
  onRenameCommit: (id: string, title: string) => void;
  onRemove: (id: string) => void;
  onAssigneeChange: (id: string, assigneeId: string) => void;
  onStatusChange: (id: string, status: "todo" | "in_progress" | "done") => void;
  onPriorityChange: (id: string, priority: "P1" | "P2" | "P3" | "P4") => void;
};

type StatusValue = "todo" | "in_progress" | "done";
type OpenMenuState = { subtaskId: string; type: "priority" | "status" | "assignee" } | null;

const statusLabelMap: Record<StatusValue, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done"
};

const statusToneMap: Record<StatusValue, string> = {
  todo: "border-border/70 bg-card/60 text-muted-foreground",
  in_progress: "border-amber-500/45 bg-amber-500/10 text-amber-500",
  done: "border-emerald-500/45 bg-emerald-500/10 text-emerald-500"
};

const statusMenuToneMap: Record<StatusValue, string> = {
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

function StatusGlyph({ status, className = "h-4 w-4" }: { status: StatusValue; className?: string }) {
  if (status === "done") return <CheckCircle2 className={className} />;
  if (status === "in_progress") return <Clock3 className={className} />;
  return <Circle className={className} />;
}

export function SubtasksTable({
  subtasks,
  canWrite,
  input,
  members,
  onInputChange,
  onAdd,
  onToggle: _onToggle,
  onRename,
  onRenameCommit,
  onRemove,
  onAssigneeChange,
  onStatusChange,
  onPriorityChange
}: SubtasksTableProps) {
  const [openMenu, setOpenMenu] = useState<OpenMenuState>(null);
  const memberById = useMemo(() => new Map(members.map((member) => [member.uid, member] as const)), [members]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-subtask-menu-root='true']")) {
        setOpenMenu(null);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function getPersonLabel(member?: ProjectMemberSummary) {
    if (!member) return "";
    return member.displayName || member.email || member.uid;
  }

  function getInitials(value: string) {
    const normalized = value.trim();
    if (!normalized) return "?";
    const chunks = normalized.split(/\s+/).filter(Boolean);
    if (chunks.length === 1) return chunks[0].slice(0, 2).toUpperCase();
    return `${chunks[0][0] ?? ""}${chunks[1][0] ?? ""}`.toUpperCase();
  }

  function isMenuOpen(subtaskId: string, type: NonNullable<OpenMenuState>["type"]) {
    return openMenu?.subtaskId === subtaskId && openMenu.type === type;
  }

  function toggleMenu(subtaskId: string, type: NonNullable<OpenMenuState>["type"]) {
    setOpenMenu((prev) => {
      if (prev?.subtaskId === subtaskId && prev.type === type) return null;
      return { subtaskId, type };
    });
  }

  return (
    <div className="space-y-2 rounded-xl border border-border/70 bg-card/35 p-3">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder="Add subtask..."
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAdd();
            }
          }}
        />
        {canWrite ? (
          <Button type="button" variant="outline" onClick={onAdd}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        ) : null}
      </div>

      <div className="space-y-1">
        {subtasks.map((item) => {
          const statusValue = (item.status || (item.completed ? "done" : "todo")) as StatusValue;
          const isDone = statusValue === "done" || item.completed;
          const priorityValue = (item.priority || "P3") as TaskPriority;
          const PriorityIcon = priorityIconMap[priorityValue];
          const assignee = item.assigneeId ? memberById.get(item.assigneeId) : undefined;
          const assigneeLabel = getPersonLabel(assignee);

          return (
            <div key={item.id} className="rounded-lg border border-border/60 bg-background/50 p-2.5">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <Input
                    value={item.title}
                    onChange={(event) => onRename(item.id, event.target.value)}
                    onBlur={() => onRenameCommit(item.id, item.title)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onRenameCommit(item.id, item.title);
                      }
                    }}
                    disabled={!canWrite}
                    className={`h-8 ${isDone ? "text-muted-foreground line-through" : ""}`}
                  />
                </div>

                <div className="flex items-start gap-1">
                  <div className="relative" data-subtask-menu-root="true">
                    <button
                      type="button"
                      disabled={!canWrite}
                      onClick={() => toggleMenu(item.id, "priority")}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition ${
                        priorityValue === "P1"
                          ? "border-red-500/45 bg-red-500/10 text-red-500"
                          : priorityValue === "P2"
                            ? "border-orange-500/45 bg-orange-500/10 text-orange-500"
                            : priorityValue === "P3"
                              ? "border-blue-500/45 bg-blue-500/10 text-blue-500"
                              : "border-slate-500/45 bg-slate-500/10 text-slate-500"
                      } ${!canWrite ? "opacity-70" : "hover:brightness-110"}`}
                      title={`Priority: ${priorityLabelMap[priorityValue]}`}
                    >
                      <PriorityIcon className="h-4 w-4" />
                    </button>
                    <AnimatePresence>
                      {isMenuOpen(item.id, "priority") ? (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.98 }}
                          transition={{ duration: 0.16, ease: "easeOut" }}
                          className="absolute right-0 z-30 mt-1 w-44 rounded-lg border border-primary/25 bg-gradient-to-b from-card/95 to-card/85 p-1 shadow-elev2 backdrop-blur"
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
                                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${menuHoverClass} ${
                                  option === priorityValue ? "bg-card/80 ring-1 ring-primary/30" : ""
                                }`}
                                onClick={() => {
                                  onPriorityChange(item.id, option);
                                  setOpenMenu(null);
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

                  <div className="relative" data-subtask-menu-root="true">
                    <button
                      type="button"
                      disabled={!canWrite}
                      onClick={() => toggleMenu(item.id, "status")}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition ${statusToneMap[statusValue]} ${
                        !canWrite ? "opacity-70" : "hover:brightness-110"
                      }`}
                      title={`Status: ${statusLabelMap[statusValue]}`}
                    >
                      <StatusGlyph status={statusValue} />
                    </button>
                    <AnimatePresence>
                      {isMenuOpen(item.id, "status") ? (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.98 }}
                          transition={{ duration: 0.16, ease: "easeOut" }}
                          className="absolute right-0 z-30 mt-1 w-44 rounded-lg border border-primary/25 bg-gradient-to-b from-card/95 to-card/85 p-1 shadow-elev2 backdrop-blur"
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
                              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${menuHoverClass} ${
                                option === statusValue ? "bg-card/80 ring-1 ring-primary/30" : ""
                              }`}
                              onClick={() => {
                                onStatusChange(item.id, option);
                                setOpenMenu(null);
                              }}
                            >
                              <StatusGlyph status={option} className={`h-3.5 w-3.5 ${statusMenuToneMap[option]}`} />
                              {statusLabelMap[option]}
                            </motion.button>
                          ))}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>

                  <div className="relative" data-subtask-menu-root="true">
                    <button
                      type="button"
                      disabled={!canWrite}
                      onClick={() => toggleMenu(item.id, "assignee")}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition ${
                        assigneeLabel ? "border-primary/45 bg-primary/10 text-primary" : "border-dashed border-border/60 bg-card/60 text-muted-foreground"
                      } ${!canWrite ? "opacity-70" : "hover:brightness-110"}`}
                      title={assigneeLabel ? `Assignee: ${assigneeLabel}` : "Unassigned"}
                    >
                      {assigneeLabel ? getInitials(assigneeLabel) : <UserRound className="h-4 w-4" />}
                    </button>
                    <AnimatePresence>
                      {isMenuOpen(item.id, "assignee") ? (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.98 }}
                          transition={{ duration: 0.16, ease: "easeOut" }}
                          className="absolute right-0 z-30 mt-1 max-h-56 w-52 overflow-y-auto rounded-lg border border-primary/25 bg-gradient-to-b from-card/95 to-card/85 p-1 shadow-elev2 backdrop-blur"
                        >
                          <motion.button
                            type="button"
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            whileHover={{ x: 2, scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            transition={{ duration: 0.14 }}
                            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${menuHoverClass} ${
                              !item.assigneeId ? "bg-card/80 ring-1 ring-primary/30" : ""
                            }`}
                            onClick={() => {
                              onAssigneeChange(item.id, "");
                              setOpenMenu(null);
                            }}
                          >
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-border/70 text-muted-foreground">
                              <UserRound className="h-3 w-3" />
                            </span>
                            Unassigned
                          </motion.button>
                          {members.map((member, index) => {
                            const label = getPersonLabel(member);
                            return (
                              <motion.button
                                key={member.uid}
                                type="button"
                                initial={{ opacity: 0, x: -4 }}
                                animate={{ opacity: 1, x: 0 }}
                                whileHover={{ x: 2, scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                transition={{ duration: 0.14, delay: (index + 1) * 0.02 }}
                                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs ${menuHoverClass} ${
                                  item.assigneeId === member.uid ? "bg-card/80 ring-1 ring-primary/30" : ""
                                }`}
                                onClick={() => {
                                  onAssigneeChange(item.id, member.uid);
                                  setOpenMenu(null);
                                }}
                              >
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                                  {getInitials(label)}
                                </span>
                                <span className="truncate">{label}</span>
                              </motion.button>
                            );
                          })}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>

                  {canWrite ? (
                    <Button type="button" variant="outline" size="sm" className="h-8 px-2" onClick={() => onRemove(item.id)} title="Remove subtask">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
        {!subtasks.length ? (
          <p className="rounded-lg border border-dashed border-border/70 p-3 text-center text-xs text-muted-foreground">No subtasks yet. Add one to break work into smaller steps.</p>
        ) : null}
      </div>
    </div>
  );
}
