"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { CalendarClock, Link2, ListChecks, RotateCcw, Shapes, Tag, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TaskFilters } from "@/hooks/useFilters";
import { priorityIconMap } from "@/lib/project-management/priority-ui";
import { priorityLabelMap, type BoardColumn, type TaskDoc } from "@/types/project-management";
import type { ProjectMemberSummary } from "@/types/admin-access";

type FilterPopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: TaskFilters;
  onChange: (next: TaskFilters) => void;
  columns: BoardColumn[];
  members: ProjectMemberSummary[];
  tasks: TaskDoc[];
};

export function FilterPopover({ open, onOpenChange, filters, onChange, columns, members, tasks }: FilterPopoverProps) {
  const [labelsInput, setLabelsInput] = useState(filters.labels.join(", "));
  const uniqueLabels = useMemo(() => Array.from(new Set(tasks.flatMap((task) => task.labels))).sort((a, b) => a.localeCompare(b)), [tasks]);
  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => (a.displayName || a.email || a.uid).localeCompare(b.displayName || b.email || b.uid)),
    [members]
  );

  useEffect(() => {
    setLabelsInput(filters.labels.join(", "));
  }, [filters.labels]);

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {};
    tasks.forEach((task) => {
      map[task.statusColumnId] = (map[task.statusColumnId] ?? 0) + 1;
    });
    return map;
  }, [tasks]);

  const assigneeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    tasks.forEach((task) => {
      const key = task.assigneeId || "__unassigned__";
      map[key] = (map[key] ?? 0) + 1;
    });
    return map;
  }, [tasks]);

  const activeFilterCount =
    filters.statuses.length +
    filters.assignees.length +
    filters.priorities.length +
    filters.labels.length +
    (filters.dueMode !== "any" ? 1 : 0) +
    (filters.hasSubtasks ? 1 : 0) +
    (filters.hasLinks ? 1 : 0);

  function toggleValue(list: string[], value: string) {
    if (list.includes(value)) return list.filter((item) => item !== value);
    return Array.from(new Set([...list, value]));
  }

  function applyLabelInput(raw: string) {
    const labels = raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    onChange({ ...filters, labels });
    setLabelsInput(labels.join(", "));
  }

  function resetFilters() {
    onChange({
      ...filters,
      statuses: [],
      assignees: [],
      priorities: [],
      labels: [],
      dueMode: "any",
      hasSubtasks: false,
      hasLinks: false
    });
    setLabelsInput("");
  }

  function chipClass(active: boolean) {
    if (active) return "border-cyan-400/45 bg-cyan-500/15 text-cyan-100";
    return "border-border/70 bg-card/60 text-muted-foreground hover:bg-card/80";
  }

  function labelChipClass(active: boolean) {
    if (active) return "border-emerald-400/45 bg-emerald-500/15 text-emerald-100";
    return "border-border/70 bg-card/60 text-muted-foreground hover:bg-card/80";
  }

  function priorityChipClass(active: boolean) {
    if (active) return "border-orange-400/45 bg-orange-500/15 text-orange-100";
    return "border-border/70 bg-card/60 text-muted-foreground hover:bg-card/80";
  }

  function dueChipClass(active: boolean) {
    if (active) return "border-violet-400/45 bg-violet-500/15 text-violet-100";
    return "border-border/70 bg-card/60 text-muted-foreground hover:bg-card/80";
  }

  function countBadge(count: number) {
    return (
      <span className="rounded-full border border-border/70 bg-card/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
        {count}
      </span>
    );
  }

  function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="space-y-2 rounded-xl border border-border/70 bg-card/50 p-3"
      >
        <Label className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
          <span className="text-muted-foreground/80">{icon}</span>
          {title}
        </Label>
        {children}
      </motion.section>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle>Filters</DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{activeFilterCount} active</Badge>
              <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <Panel title="Quick Filters" icon={<ListChecks className="h-3.5 w-3.5" />}>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${dueChipClass(filters.dueMode === "overdue")}`}
                onClick={() => onChange({ ...filters, dueMode: filters.dueMode === "overdue" ? "any" : "overdue" })}
              >
                <CalendarClock className="h-3.5 w-3.5" />
                Overdue
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${dueChipClass(filters.dueMode === "dueSoon")}`}
                onClick={() => onChange({ ...filters, dueMode: filters.dueMode === "dueSoon" ? "any" : "dueSoon" })}
              >
                <CalendarClock className="h-3.5 w-3.5" />
                Due soon
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${chipClass(filters.hasSubtasks)}`}
                onClick={() => onChange({ ...filters, hasSubtasks: !filters.hasSubtasks })}
              >
                <ListChecks className="h-3.5 w-3.5" />
                Has subtasks
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${chipClass(filters.hasLinks)}`}
                onClick={() => onChange({ ...filters, hasLinks: !filters.hasLinks })}
              >
                <Link2 className="h-3.5 w-3.5" />
                Has linked tasks
              </button>
            </div>
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Status" icon={<Shapes className="h-3.5 w-3.5" />}>
              <div className="flex flex-wrap gap-2">
                {columns.map((column) => (
                  <button
                    key={column.id}
                    type="button"
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${chipClass(filters.statuses.includes(column.id))}`}
                    onClick={() => onChange({ ...filters, statuses: toggleValue(filters.statuses, column.id) })}
                  >
                    <Shapes className="h-3 w-3" />
                    <span>{column.name}</span>
                    {countBadge(statusCounts[column.id] ?? 0)}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Assignee" icon={<UserRound className="h-3.5 w-3.5" />}>
              <div className="max-h-40 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${chipClass(filters.assignees.includes("__unassigned__"))}`}
                    onClick={() => onChange({ ...filters, assignees: toggleValue(filters.assignees, "__unassigned__") })}
                  >
                    <UserRound className="h-3 w-3" />
                    <span>Unassigned</span>
                    {countBadge(assigneeCounts.__unassigned__ ?? 0)}
                  </button>
                  {sortedMembers.map((member) => {
                    const name = member.displayName || member.email || member.uid;
                    return (
                      <button
                        key={member.uid}
                        type="button"
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${chipClass(filters.assignees.includes(member.uid))}`}
                        onClick={() => onChange({ ...filters, assignees: toggleValue(filters.assignees, member.uid) })}
                      >
                        <UserRound className="h-3 w-3" />
                        <span>{name}</span>
                        {countBadge(assigneeCounts[member.uid] ?? 0)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Priority" icon={<ListChecks className="h-3.5 w-3.5" />}>
              <div className="flex flex-wrap gap-2">
                {(["P1", "P2", "P3", "P4"] as const).map((priority) => {
                  const PriorityIcon = priorityIconMap[priority];
                  return (
                    <button
                      key={priority}
                      type="button"
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${priorityChipClass(filters.priorities.includes(priority))}`}
                      onClick={() =>
                        onChange({
                          ...filters,
                          priorities: toggleValue(filters.priorities, priority) as Array<"P1" | "P2" | "P3" | "P4">
                        })
                      }
                    >
                      <PriorityIcon className="h-3.5 w-3.5" />
                      {priorityLabelMap[priority]}
                    </button>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Labels" icon={<Tag className="h-3.5 w-3.5" />}>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={labelsInput}
                    onChange={(event) => setLabelsInput(event.target.value)}
                    onBlur={() => applyLabelInput(labelsInput)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        applyLabelInput(labelsInput);
                      }
                    }}
                    placeholder={uniqueLabels.slice(0, 4).join(", ") || "api, urgent"}
                    className="h-9"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => applyLabelInput(labelsInput)}>
                    Apply
                  </Button>
                </div>
                {uniqueLabels.length ? (
                  <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
                    {uniqueLabels.slice(0, 30).map((label) => (
                      <button
                        key={label}
                        type="button"
                        className={`rounded-full border px-2.5 py-1 text-xs transition ${labelChipClass(filters.labels.includes(label))}`}
                        onClick={() => onChange({ ...filters, labels: toggleValue(filters.labels, label) })}
                      >
                        <Tag className="mr-1 inline-flex h-3 w-3" />
                        {label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </Panel>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
