"use client";

import {
  FormEvent,
  type CSSProperties,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, MessageSquare, UserRound } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { priorityIconMap } from "@/lib/project-management/priority-ui";
import { formatDateOnly } from "@/lib/project-management/utils";
import {
  priorityLabelMap,
  priorityToneMap,
  type TaskPriority,
} from "@/types/project-management";

export type InlineCreateTaskDraft = {
  title: string;
  priority: TaskPriority;
  assigneeId?: string;
  dueDateInput: string;
};

type InlineCreateTaskProps = {
  open: boolean;
  members: Array<{ uid: string; label: string }>;
  boardRootRef?: RefObject<HTMLElement | null>;
  busy?: boolean;
  onCancel: () => void;
  onCreate: (draft: InlineCreateTaskDraft) => Promise<void> | void;
};

const prioritySurfaceStyleMap: Record<TaskPriority, CSSProperties> = {
  P1: {
    borderColor: "rgb(248 113 113 / 0.55)",
    backgroundColor: "rgb(248 113 113 / 0.12)",
  },
  P2: {
    borderColor: "rgb(251 146 60 / 0.55)",
    backgroundColor: "rgb(251 146 60 / 0.12)",
  },
  P3: {
    borderColor: "rgb(96 165 250 / 0.55)",
    backgroundColor: "rgb(96 165 250 / 0.12)",
  },
  P4: {
    borderColor: "rgb(148 163 184 / 0.55)",
    backgroundColor: "rgb(148 163 184 / 0.12)",
  },
};

const menuHoverClass =
  "transition-all duration-150 hover:bg-primary/15 hover:text-foreground hover:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.35)] hover:translate-x-0.5";

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

export function InlineCreateTask({
  open,
  members,
  boardRootRef,
  busy = false,
  onCancel,
  onCreate,
}: InlineCreateTaskProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("P3");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDateInput, setDueDateInput] = useState("");
  const [openMenu, setOpenMenu] = useState<
    "priority" | "assignee" | "due" | null
  >(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const submitBusyRef = useRef(false);
  const assigneeLabel = useMemo(
    () => members.find((member) => member.uid === assigneeId)?.label ?? "",
    [assigneeId, members],
  );
  const PriorityIcon = priorityIconMap[priority];

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

  useEffect(() => {
    if (!open) {
      setTitle("");
      setPriority("P3");
      setAssigneeId("");
      setDueDateInput("");
      setOpenMenu(null);
      return;
    }
    inputRef.current?.focus();
  }, [open]);

  const submitOrCancel = useCallback(async () => {
    if (busy || submitBusyRef.current) return;
    const value = title.trim();
    if (!value) {
      onCancel();
      return;
    }

    submitBusyRef.current = true;
    try {
      await onCreate({
        title: value,
        priority,
        assigneeId: assigneeId || undefined,
        dueDateInput,
      });
    } finally {
      submitBusyRef.current = false;
    }
  }, [assigneeId, busy, dueDateInput, onCancel, onCreate, priority, title]);

  useEffect(() => {
    if (!open) return;

    function onBoardPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (formRef.current?.contains(target)) return;
      if (boardRootRef?.current && !boardRootRef.current.contains(target))
        return;
      void submitOrCancel();
    }

    document.addEventListener("pointerdown", onBoardPointerDown);
    return () =>
      document.removeEventListener("pointerdown", onBoardPointerDown);
  }, [boardRootRef, open, submitOrCancel]);

  useEffect(() => {
    if (!openMenu) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-inline-create-menu-root='true']")) return;
      setOpenMenu(null);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openMenu]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await submitOrCancel();
  }

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.form
          ref={formRef}
          key="inline-create"
          onSubmit={submit}
          initial={{ opacity: 0, y: -6, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.985 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
          className="space-y-1.5"
        >
          <Card
            className="cursor-text rounded-xl border transition-[box-shadow,filter] hover:brightness-[0.98] hover:shadow-elev1"
            style={prioritySurfaceStyleMap[priority]}
          >
            <CardContent className="space-y-2 p-2.5">
              <div className="rounded-lg border border-border/70 bg-background/65 transition-colors focus-within:border-primary/45 focus-within:bg-background/90">
                <Input
                  ref={inputRef}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Task title"
                  disabled={busy}
                  className="h-9 border-0 bg-transparent px-2.5 py-0 text-[13px] font-semibold tracking-[0.01em] shadow-none placeholder:font-medium placeholder:text-muted-foreground/65 focus-visible:ring-0"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void submitOrCancel();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      onCancel();
                    }
                  }}
                />
              </div>

              <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
                <span
                  className="rounded-md border border-border/70 bg-card/70 px-2 py-0.5"
                  title="New task draft"
                >
                  NEW
                </span>

                <div className="relative" data-inline-create-menu-root="true">
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 transition-all duration-150 ${
                      dueDateInput ? "text-foreground" : "text-muted-foreground"
                    } hover:bg-primary/15 hover:text-foreground hover:shadow-[inset_0_0_0_1px_rgba(59,130,246,0.35)]`}
                    title={
                      dueDateInput
                        ? `Due date: ${formatDateOnly(dueDateInput)}`
                        : "Set due date"
                    }
                    onClick={() =>
                      setOpenMenu((prev) => (prev === "due" ? null : "due"))
                    }
                    disabled={busy}
                  >
                    <CalendarClock className="h-3 w-3" />
                    {dueDateInput ? formatDateOnly(dueDateInput) : "Due"}
                  </button>
                  <AnimatePresence>
                    {openMenu === "due" ? (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.14, ease: "easeOut" }}
                        className="absolute bottom-full right-0 z-30 mb-1 w-56 rounded-lg border border-primary/25 bg-gradient-to-b from-card/95 to-card/85 p-2 shadow-elev2 backdrop-blur"
                      >
                        <div className="mb-2 grid grid-cols-2 gap-1">
                          <button
                            type="button"
                            className="rounded-md border border-blue-500/35 bg-blue-500/10 px-2 py-1 text-[11px] text-blue-200 transition-all duration-150 hover:-translate-y-0.5 hover:bg-blue-500/25 hover:shadow-[0_0_0_1px_rgba(96,165,250,0.35)]"
                            onClick={() => {
                              setDueDateInput(todayAt1800);
                              setOpenMenu(null);
                            }}
                          >
                            Today 6 PM
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-violet-500/35 bg-violet-500/10 px-2 py-1 text-[11px] text-violet-200 transition-all duration-150 hover:-translate-y-0.5 hover:bg-violet-500/25 hover:shadow-[0_0_0_1px_rgba(167,139,250,0.35)]"
                            onClick={() => {
                              setDueDateInput(tomorrowAt1800);
                              setOpenMenu(null);
                            }}
                          >
                            Tomorrow 6 PM
                          </button>
                        </div>
                        <input
                          type="datetime-local"
                          value={dueDateInput}
                          onChange={(event) =>
                            setDueDateInput(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") event.preventDefault();
                          }}
                          className="h-8 w-full rounded-md border border-border/70 bg-background px-2 text-xs"
                        />
                        <div className="mt-2 flex gap-1">
                          <button
                            type="button"
                            className="flex-1 rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200 transition-all duration-150 hover:-translate-y-0.5 hover:bg-emerald-500/25 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.35)]"
                            onClick={() => setOpenMenu(null)}
                          >
                            Done
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-rose-500/35 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200 transition-all duration-150 hover:-translate-y-0.5 hover:bg-rose-500/25 hover:shadow-[0_0_0_1px_rgba(244,63,94,0.35)]"
                            onClick={() => {
                              setDueDateInput("");
                              setOpenMenu(null);
                            }}
                          >
                            Clear
                          </button>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                <span
                  className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-0.5"
                  title="Comments: 0"
                >
                  <MessageSquare className="h-3 w-3" />0
                </span>

                <div className="relative" data-inline-create-menu-root="true">
                  <button
                    type="button"
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${priorityToneMap[priority]} transition hover:brightness-110`}
                    title={`Priority: ${priorityLabelMap[priority]}`}
                    onClick={() =>
                      setOpenMenu((prev) =>
                        prev === "priority" ? null : "priority",
                      )
                    }
                    disabled={busy}
                  >
                    <PriorityIcon className="h-3.5 w-3.5" />
                  </button>
                  <AnimatePresence>
                    {openMenu === "priority" ? (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.14, ease: "easeOut" }}
                        className="absolute bottom-full right-0 z-30 mb-1 w-44 rounded-lg border border-primary/25 bg-gradient-to-b from-card/95 to-card/85 p-1 shadow-elev2 backdrop-blur"
                      >
                        {(["P1", "P2", "P3", "P4"] as const).map(
                          (option, index) => {
                            const OptionIcon = priorityIconMap[option];
                            return (
                              <motion.button
                                key={option}
                                type="button"
                                initial={{ opacity: 0, x: -4 }}
                                animate={{ opacity: 1, x: 0 }}
                                whileHover={{ x: 2, scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                transition={{
                                  duration: 0.14,
                                  delay: index * 0.02,
                                }}
                                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] ${menuHoverClass} ${
                                  option === priority
                                    ? "bg-card/80 ring-1 ring-primary/30"
                                    : ""
                                }`}
                                onClick={() => {
                                  setPriority(option);
                                  setOpenMenu(null);
                                }}
                              >
                                <OptionIcon className="h-3.5 w-3.5" />
                                {priorityLabelMap[option]}
                              </motion.button>
                            );
                          },
                        )}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                <div className="relative" data-inline-create-menu-root="true">
                  <button
                    type="button"
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-muted-foreground transition hover:brightness-110 ${
                      assigneeId
                        ? "border-border/70 bg-card/70"
                        : "border-dashed border-border/60 bg-card/40 opacity-80"
                    }`}
                    title={
                      assigneeId
                        ? `Assigned to ${assigneeLabel || assigneeId}`
                        : "Unassigned"
                    }
                    onClick={() =>
                      setOpenMenu((prev) =>
                        prev === "assignee" ? null : "assignee",
                      )
                    }
                    disabled={busy}
                  >
                    {assigneeId && assigneeLabel ? (
                      <span className="text-[9px] font-semibold">
                        {getInitials(assigneeLabel)}
                      </span>
                    ) : (
                      <UserRound className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <AnimatePresence>
                    {openMenu === "assignee" ? (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.14, ease: "easeOut" }}
                        className="absolute bottom-full right-0 z-30 mb-1 max-h-56 w-52 overflow-y-auto rounded-lg border border-primary/25 bg-gradient-to-b from-card/95 to-card/85 p-1 shadow-elev2 backdrop-blur"
                      >
                        <motion.button
                          type="button"
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          whileHover={{ x: 2, scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          transition={{ duration: 0.14 }}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] ${menuHoverClass} ${
                            !assigneeId
                              ? "bg-card/80 ring-1 ring-primary/30"
                              : ""
                          }`}
                          onClick={() => {
                            setAssigneeId("");
                            setOpenMenu(null);
                          }}
                        >
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-border/70 text-muted-foreground">
                            <UserRound className="h-3 w-3" />
                          </span>
                          Unassigned
                        </motion.button>
                        {members.map((member, index) => (
                          <motion.button
                            key={member.uid}
                            type="button"
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            whileHover={{ x: 2, scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            transition={{
                              duration: 0.14,
                              delay: (index + 1) * 0.02,
                            }}
                            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] ${menuHoverClass} ${
                              assigneeId === member.uid
                                ? "bg-card/80 ring-1 ring-primary/30"
                                : ""
                            }`}
                            onClick={() => {
                              setAssigneeId(member.uid);
                              setOpenMenu(null);
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
          <p className="text-[11px] text-muted-foreground">
            Press Enter to create. Click anywhere in board to create or cancel.
          </p>
        </motion.form>
      ) : null}
    </AnimatePresence>
  );
}
