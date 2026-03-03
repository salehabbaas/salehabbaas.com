"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatTaskIdentifier } from "@/lib/project-management/utils";
import type { TaskDoc, TaskLinkRelationType } from "@/types/project-management";

type LinkedTasksTableProps = {
  task: TaskDoc;
  taskOptions: TaskDoc[];
  canWrite: boolean;
  addRelation: TaskLinkRelationType;
  addTarget: string;
  onRelationChange: (value: TaskLinkRelationType) => void;
  onTargetChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onOpenTask: (taskId: string) => void;
};

function relationLabel(value: TaskLinkRelationType) {
  if (value === "blockedBy" || value === "blocked_by") return "Blocked by";
  if (value === "related" || value === "related_to") return "Related";
  if (value === "duplicatedBy" || value === "duplicated_by") return "Duplicated by";
  if (value === "duplicate") return "Duplicate";
  return "Blocks";
}

export function LinkedTasksTable({ task, taskOptions, canWrite, addRelation, addTarget, onRelationChange, onTargetChange, onAdd, onRemove, onOpenTask }: LinkedTasksTableProps) {
  const [query, setQuery] = useState("");
  const selectedTargetTitle = useMemo(() => {
    if (!addTarget) return "";
    return taskOptions.find((row) => row.id === addTarget)?.title || "";
  }, [addTarget, taskOptions]);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = taskOptions.filter((row) => row.id !== task.id);
    if (!q) return rows.slice(0, 8);
    return rows
      .filter((row) => {
        const key = formatTaskIdentifier(row);
        return key.toLowerCase().includes(q) || row.title.toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [query, task.id, taskOptions]);

  return (
    <div className="space-y-2 rounded-xl border border-border/70 p-3">
      <p className="text-sm font-medium">Linked tasks</p>
      {(task.links ?? []).map((link) => {
        const target = taskOptions.find((row) => row.id === link.targetTaskId);
        return (
          <div key={link.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 p-2 text-sm">
            <button type="button" className="text-left" onClick={() => onOpenTask(link.targetTaskId)}>
              <span className="text-muted-foreground">{relationLabel(link.relationType)}</span>{" "}
              <span className="font-medium">{target?.title || "Linked task"}</span>
            </button>
            {canWrite ? (
              <Button type="button" variant="outline" size="sm" onClick={() => onRemove(link.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        );
      })}
      {canWrite ? (
        <div className="space-y-2 rounded-lg border border-border/60 p-2">
          <div className="flex gap-2">
            <Select value={addRelation} onChange={(event) => onRelationChange(event.target.value as TaskLinkRelationType)} className="h-8">
              <option value="blocks">Blocks</option>
              <option value="blockedBy">Blocked by</option>
              <option value="related">Related</option>
              <option value="duplicate">Duplicate</option>
              <option value="duplicatedBy">Duplicated by</option>
            </Select>
            <Input value={selectedTargetTitle} readOnly placeholder="Select task name" className="h-8" />
            <Button type="button" variant="outline" onClick={onAdd} className="h-8"><Plus className="h-3.5 w-3.5" />Link</Button>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Search className="h-3.5 w-3.5" />
              Search tasks
            </div>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find by task name" className="h-8" />
            <div className="max-h-36 space-y-1 overflow-y-auto">
              {options.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="flex w-full items-center rounded-md border border-border/50 px-2 py-1 text-left text-xs hover:bg-card/80"
                  onClick={() => {
                    onTargetChange(row.id);
                    setQuery("");
                  }}
                >
                  <span className="truncate font-medium">{row.title}</span>
                </button>
              ))}
              {!options.length ? <p className="text-xs text-muted-foreground">No tasks found.</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
