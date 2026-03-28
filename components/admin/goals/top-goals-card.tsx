"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { DndContext, PointerSensor, closestCorners, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, ChevronDown, ChevronUp, GripVertical, ListChecks, Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { parseTagInput } from "@/lib/project-management/utils";
import type { ProjectDoc, TopGoal } from "@/types/project-management";

type SettingsPayload = {
  topGoals: TopGoal[];
};

const goalTones = [
  "border-sky-300/80 bg-sky-50 text-sky-800 dark:border-sky-500/45 dark:bg-sky-500/15 dark:text-sky-100",
  "border-emerald-300/80 bg-emerald-50 text-emerald-800 dark:border-emerald-500/45 dark:bg-emerald-500/15 dark:text-emerald-100",
  "border-amber-300/80 bg-amber-50 text-amber-800 dark:border-amber-500/45 dark:bg-amber-500/15 dark:text-amber-100",
  "border-rose-300/80 bg-rose-50 text-rose-800 dark:border-rose-500/45 dark:bg-rose-500/15 dark:text-rose-100",
  "border-violet-300/80 bg-violet-50 text-violet-800 dark:border-violet-500/45 dark:bg-violet-500/15 dark:text-violet-100"
];

function makeGoalId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `goal-${Date.now()}`;
}

function formatGoalDate(value: string | undefined) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(parsed);
}

function toDateInput(value: string | undefined) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const offsetMs = parsed.getTimezoneOffset() * 60 * 1000;
  const local = new Date(parsed.getTime() - offsetMs);
  return local.toISOString().slice(0, 10);
}

function fromDateInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

function normalizeTags(value: string) {
  const unique = new Map<string, string>();
  parseTagInput(value).forEach((tag) => {
    const cleaned = tag.trim();
    if (!cleaned) return;
    const key = cleaned.toLowerCase();
    if (!unique.has(key)) unique.set(key, cleaned);
  });
  return Array.from(unique.values());
}

function DoneIcon() {
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4 text-emerald-700 drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)] dark:text-emerald-300" aria-hidden="true">
      <path
        d="M1.7 9.6L4.7 12.6L9.2 7.1"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
      <path
        d="M7 9.6L10 12.6L14.5 7.1"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function isNearGoalDeadline(deadline?: string, days = 3) {
  if (!deadline) return false;
  const dueTime = new Date(deadline).getTime();
  if (Number.isNaN(dueTime)) return false;
  const now = Date.now();
  const diff = dueTime - now;
  return diff > 0 && diff <= days * 24 * 60 * 60 * 1000;
}

type SortableGoalCardProps = {
  goal: TopGoal;
  index: number;
  projectLabel: string;
  onOpen: (goal: TopGoal) => void;
  onDone: (goalId: string) => void;
  reorderEnabled: boolean;
  doneDisabled: boolean;
};

function SortableGoalCard({ goal, index, projectLabel, onOpen, onDone, reorderEnabled, doneDisabled }: SortableGoalCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: goal.id,
    disabled: !reorderEnabled
  });
  const nearDeadline = isNearGoalDeadline(goal.deadline);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div ref={setNodeRef} style={style}>
      <motion.div
        role="button"
        tabIndex={0}
        onClick={() => onOpen(goal)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen(goal);
          }
        }}
        className={`relative min-h-[96px] min-w-[180px] rounded-xl border px-3 py-2.5 pb-11 text-left transition hover:scale-[1.01] ${isDragging ? "opacity-60" : "opacity-100"} ${nearDeadline ? "border-rose-400/80 dark:border-rose-400/70" : ""} ${goalTones[index % goalTones.length]}`}
        animate={
          nearDeadline && !isDragging
            ? {
                scale: [1, 1.02, 1],
                boxShadow: [
                  "0 0 0 0 rgba(251, 113, 133, 0)",
                  "0 0 0 6px rgba(251, 113, 133, 0.2)",
                  "0 0 0 0 rgba(251, 113, 133, 0)"
                ]
              }
            : undefined
        }
        transition={
          nearDeadline && !isDragging
            ? {
                duration: 1.8,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut"
              }
            : undefined
        }
      >
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm font-semibold tracking-tight">{goal.title}</p>
          <span
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full border border-current/40 ${reorderEnabled ? "cursor-grab" : "cursor-default opacity-50"}`}
            {...(reorderEnabled ? attributes : {})}
            {...(reorderEnabled ? listeners : {})}
            onClick={(event) => event.stopPropagation()}
          >
            <GripVertical className="h-3 w-3" />
          </span>
        </div>

        <p className="mt-1 text-[11px] font-medium opacity-80">{projectLabel}</p>

        <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] opacity-90">
          <span>{formatGoalDate(goal.createdAt)}</span>
          {goal.deadline ? (
            <span
              className={`rounded-full border px-2 py-0.5 ${nearDeadline ? "border-rose-400/80 bg-rose-100 text-rose-700 dark:border-rose-400/70 dark:bg-rose-500/20 dark:text-rose-100" : "border-current/40"}`}
            >
              Due {formatGoalDate(goal.deadline)}
            </span>
          ) : null}
        </div>
        <span
          role="button"
          tabIndex={doneDisabled ? -1 : 0}
          aria-label="Mark goal as done"
          aria-disabled={doneDisabled}
          className={`absolute bottom-2 right-2 inline-flex items-center justify-center ${
            doneDisabled ? "cursor-not-allowed opacity-40" : "cursor-pointer transition-transform hover:scale-110"
          }`}
          onClick={(event) => {
            event.stopPropagation();
            if (doneDisabled) return;
            onDone(goal.id);
          }}
          onKeyDown={(event) => {
            if (doneDisabled) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              onDone(goal.id);
            }
          }}
        >
          <DoneIcon />
        </span>
      </motion.div>
    </div>
  );
}

export function TopGoalsCard({
  initialTopGoals,
  projects
}: {
  initialTopGoals: TopGoal[];
  projects: ProjectDoc[];
}) {
  const [topGoals, setTopGoals] = useState<TopGoal[]>(initialTopGoals);
  const [status, setStatus] = useState("");
  const [goalsDialogOpen, setGoalsDialogOpen] = useState(false);
  const [completedGoalsOpen, setCompletedGoalsOpen] = useState(false);
  const [savingGoals, setSavingGoals] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalTagsInput, setGoalTagsInput] = useState("");
  const [goalProjectId, setGoalProjectId] = useState("");
  const [goalDeadlineInput, setGoalDeadlineInput] = useState("");
  const [goalCreatedAt, setGoalCreatedAt] = useState(new Date().toISOString());
  const [goalTagFilter, setGoalTagFilter] = useState<string>("all");
  const [topGoalsExpanded, setTopGoalsExpanded] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  );

  const orderedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const aUpdated = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bUpdated = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bUpdated - aUpdated;
    });
  }, [projects]);

  const projectNameById = useMemo(() => {
    return new Map(projects.map((project) => [project.id, project.name]));
  }, [projects]);

  const selectedGoal = useMemo(() => {
    if (!editingGoalId) return null;
    return topGoals.find((goal) => goal.id === editingGoalId) ?? null;
  }, [editingGoalId, topGoals]);

  const activeGoals = useMemo(() => topGoals.filter((goal) => !goal.completed), [topGoals]);
  const completedGoals = useMemo(() => topGoals.filter((goal) => goal.completed), [topGoals]);

  const availableGoalTags = useMemo(() => {
    const tags = new Set<string>();
    activeGoals.forEach((goal) => {
      goal.tags.forEach((tag) => {
        if (tag.trim()) tags.add(tag);
      });
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [activeGoals]);

  useEffect(() => {
    if (goalTagFilter !== "all" && !availableGoalTags.includes(goalTagFilter)) {
      setGoalTagFilter("all");
    }
  }, [goalTagFilter, availableGoalTags]);

  const filteredGoals = useMemo(() => {
    if (goalTagFilter === "all") return activeGoals;
    return activeGoals.filter((goal) => goal.tags.includes(goalTagFilter));
  }, [goalTagFilter, activeGoals]);

  const canReorderGoals = goalTagFilter === "all";

  const saveTopGoals = useCallback(async (nextGoals: TopGoal[]) => {
    setSavingGoals(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/projects/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topGoals: nextGoals
        })
      });

      const data = (await response.json()) as SettingsPayload & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to update goals");

      setTopGoals(data.topGoals ?? nextGoals);
      return true;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update goals");
      return false;
    } finally {
      setSavingGoals(false);
    }
  }, []);

  function openCreateGoal() {
    setEditingGoalId(null);
    setGoalTitle("");
    setGoalDescription("");
    setGoalTagsInput("");
    setGoalProjectId("");
    setGoalDeadlineInput("");
    setGoalCreatedAt(new Date().toISOString());
    setGoalsDialogOpen(true);
  }

  function openGoal(goal: TopGoal) {
    setEditingGoalId(goal.id);
    setGoalTitle(goal.title);
    setGoalDescription(goal.description ?? "");
    setGoalTagsInput(goal.tags.join(", "));
    setGoalProjectId(goal.projectId ?? "");
    setGoalDeadlineInput(toDateInput(goal.deadline));
    setGoalCreatedAt(goal.createdAt || new Date().toISOString());
    setGoalsDialogOpen(true);
  }

  async function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = goalTitle.trim();
    if (!title) {
      setStatus("Goal title is required.");
      return;
    }

    const description = goalDescription.trim();
    const tags = normalizeTags(goalTagsInput);
    const projectId = goalProjectId.trim() || undefined;
    const deadline = fromDateInput(goalDeadlineInput);

    const nextGoals = selectedGoal
      ? topGoals.map((goal) =>
          goal.id === selectedGoal.id
            ? {
                ...goal,
                title,
                description: description || undefined,
                tags,
                projectId,
                deadline,
                createdAt: goal.createdAt || goalCreatedAt
              }
            : goal
        )
      : [
          {
            id: makeGoalId(),
            title,
            description: description || undefined,
            tags,
            projectId,
            deadline,
            completed: false,
            createdAt: new Date().toISOString()
          },
          ...topGoals
        ];

    const saved = await saveTopGoals(nextGoals);
    if (saved) {
      setGoalsDialogOpen(false);
      setEditingGoalId(null);
    }
  }

  async function removeGoal() {
    if (!selectedGoal) return;
    const nextGoals = topGoals.filter((goal) => goal.id !== selectedGoal.id);
    const saved = await saveTopGoals(nextGoals);
    if (saved) {
      setGoalsDialogOpen(false);
      setEditingGoalId(null);
    }
  }

  async function markGoalDone(goalId: string) {
    const nowIso = new Date().toISOString();
    const pending = topGoals
      .map((goal) =>
        goal.id === goalId
          ? {
              ...goal,
              completed: true,
              completedAt: nowIso
            }
          : goal
      )
      .sort((a, b) => {
        if (Boolean(a.completed) === Boolean(b.completed)) return 0;
        return a.completed ? 1 : -1;
      });

    const saved = await saveTopGoals(pending);
    if (!saved) return;
    if (editingGoalId === goalId) {
      setGoalsDialogOpen(false);
      setEditingGoalId(null);
    }
  }

  async function handleGoalDragEnd(event: DragEndEvent) {
    if (!canReorderGoals) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromIndex = activeGoals.findIndex((goal) => goal.id === String(active.id));
    const toIndex = activeGoals.findIndex((goal) => goal.id === String(over.id));
    if (fromIndex < 0 || toIndex < 0) return;

    const previous = topGoals;
    const reorderedActive = arrayMove(activeGoals, fromIndex, toIndex);
    const next = [...reorderedActive, ...completedGoals];
    setTopGoals(next);

    const saved = await saveTopGoals(next);
    if (!saved) setTopGoals(previous);
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <CardTitle>Top Goals</CardTitle>
            <CardDescription>Pin the goals that should stay visible while you execute the board below.</CardDescription>
            {status ? <p className="text-sm text-destructive">{status}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setCompletedGoalsOpen(true)}>
              <ListChecks className="h-4 w-4" />
              Full Goals
              <Badge variant="secondary">{completedGoals.length}</Badge>
            </Button>
            <Button type="button" variant="outline" onClick={openCreateGoal}>
              <Plus className="h-4 w-4" />
              Add Goal
            </Button>
            <Select
              aria-label="Filter goals by tag"
              className="h-10 min-w-[170px] sm:w-auto"
              value={goalTagFilter}
              onChange={(event) => setGoalTagFilter(event.target.value)}
            >
              <option value="all">All tags</option>
              {availableGoalTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="ghost"
              aria-expanded={topGoalsExpanded}
              onClick={() => setTopGoalsExpanded((current) => !current)}
            >
              {topGoalsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {topGoalsExpanded ? "Collapse" : "Expand"}
            </Button>
          </div>
        </CardHeader>
        {topGoalsExpanded ? (
          <CardContent className="space-y-3">
            {!canReorderGoals ? <p className="text-xs text-muted-foreground">Clear tag filter to drag and reorder all goals.</p> : null}

            {filteredGoals.length ? (
              <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={(event) => void handleGoalDragEnd(event)}>
                <SortableContext items={filteredGoals.map((goal) => goal.id)} strategy={horizontalListSortingStrategy}>
                  <div className="w-full overflow-x-auto pb-2">
                    <div className="mx-auto flex w-max min-w-full justify-center gap-3 px-4 py-2">
                      {filteredGoals.map((goal, index) => (
                        <SortableGoalCard
                          key={goal.id}
                          goal={goal}
                          index={index}
                          projectLabel={goal.projectId ? projectNameById.get(goal.projectId) ?? "Project removed" : "No project"}
                          onOpen={openGoal}
                          onDone={markGoalDone}
                          reorderEnabled={canReorderGoals}
                          doneDisabled={savingGoals}
                        />
                      ))}
                    </div>
                  </div>
                </SortableContext>
              </DndContext>
            ) : null}

            {!activeGoals.length ? (
              <p className="text-sm text-muted-foreground">No active top goals. Add one to keep the next priorities visible.</p>
            ) : null}
            {!!activeGoals.length && !filteredGoals.length ? (
              <p className="text-sm text-muted-foreground">No goals match this tag filter.</p>
            ) : null}
          </CardContent>
        ) : null}
      </Card>

      <Dialog open={goalsDialogOpen} onOpenChange={setGoalsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedGoal ? "Update Goal" : "Add Top Goal"}</DialogTitle>
            <DialogDescription>Title is shown on the card. Description, tags, and deadline are optional.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={saveGoal}>
            <div className="space-y-2">
              <Label htmlFor="goal-title">Title</Label>
              <Input id="goal-title" value={goalTitle} onChange={(event) => setGoalTitle(event.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-description">Description (optional)</Label>
              <Textarea
                id="goal-description"
                value={goalDescription}
                onChange={(event) => setGoalDescription(event.target.value)}
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-tags">Tags (comma separated)</Label>
              <Input
                id="goal-tags"
                value={goalTagsInput}
                onChange={(event) => setGoalTagsInput(event.target.value)}
                placeholder="career, finance, learning"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-project">Project (optional)</Label>
              <Select id="goal-project" value={goalProjectId} onChange={(event) => setGoalProjectId(event.target.value)}>
                <option value="">No project</option>
                {goalProjectId && !orderedProjects.some((project) => project.id === goalProjectId) ? (
                  <option value={goalProjectId}>Project removed</option>
                ) : null}
                {orderedProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Deadline (optional)</Label>
              <DateTimePicker mode="date" value={goalDeadlineInput} onChange={setGoalDeadlineInput} />
            </div>

            <p className="text-xs text-muted-foreground">Created: {formatGoalDate(selectedGoal?.createdAt ?? goalCreatedAt)}</p>

            <DialogFooter className="sm:justify-between">
              {selectedGoal ? (
                <Button type="button" variant="destructive" onClick={removeGoal} disabled={savingGoals}>
                  <Trash2 className="h-4 w-4" />
                  Remove
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" disabled={savingGoals}>
                {savingGoals ? "Saving..." : selectedGoal ? "Update Goal" : "Add Goal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={completedGoalsOpen} onOpenChange={setCompletedGoalsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Full Goals</DialogTitle>
            <DialogDescription>Completed goals moved from the top cards.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {completedGoals.map((goal) => (
              <button
                key={goal.id}
                type="button"
                onClick={() => {
                  setCompletedGoalsOpen(false);
                  openGoal(goal);
                }}
                className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-left hover:border-primary/40"
              >
                <div>
                  <p className="text-sm font-medium">{goal.title}</p>
                  <p className="text-[11px] text-muted-foreground">{goal.projectId ? projectNameById.get(goal.projectId) ?? "Project removed" : "No project"}</p>
                  <p className="text-xs text-muted-foreground">
                    Done {formatGoalDate(goal.completedAt)} • Created {formatGoalDate(goal.createdAt)}
                  </p>
                </div>
                <Badge variant="outline" className="gap-1.5">
                  <Check className="h-3 w-3" />
                  Done
                </Badge>
              </button>
            ))}
            {!completedGoals.length ? <p className="text-sm text-muted-foreground">No completed goals yet.</p> : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
