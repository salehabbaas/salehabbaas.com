"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { formatDateTime } from "@/lib/project-management/utils";
import { priorityLabelMap, type ActivityDoc, type TaskPriority } from "@/types/project-management";

type HistoryPanelProps = {
  activity: ActivityDoc[];
  defaultCollapsed?: boolean;
};

function prettyAction(action: string) {
  if (action === "due_date_changed") return "Due date changed";
  if (action === "start_date_changed") return "Start date changed";
  if (action === "task_moved") return "Status changed";
  if (action === "priority_changed") return "Priority changed";
  if (action === "labels_changed") return "Labels changed";
  if (action === "assignee_changed") return "Assignee changed";
  if (action === "task_link_added") return "Linked task added";
  if (action === "task_link_removed") return "Linked task removed";
  if (action === "comment_added") return "Comment added";
  if (action === "comment_deleted") return "Comment removed";
  if (action === "subtasks_updated") return "Subtasks updated";
  return action.replace(/_/g, " ");
}

export function HistoryPanel({ activity, defaultCollapsed = false }: HistoryPanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  useEffect(() => {
    setCollapsed(defaultCollapsed);
  }, [defaultCollapsed]);

  function readableValue(action: string, value?: string) {
    if (!value) return "";
    if (action === "priority_changed" && (value === "P1" || value === "P2" || value === "P3" || value === "P4")) {
      return priorityLabelMap[value as TaskPriority];
    }
    return value;
  }

  return (
    <div className="space-y-2 rounded-xl border border-border/70 p-3">
      <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setCollapsed((prev) => !prev)}>
        <span className="text-sm font-medium">History</span>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          {activity.length}
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>
      {collapsed ? null : (
        <>
          {activity.map((item) => (
            <div key={item.id} className="rounded-lg border border-border/60 p-2 text-sm">
              <p className="font-medium">{prettyAction(item.action)}</p>
              {(item.from || item.to) ? (
                <p className="text-xs text-muted-foreground">
                  {item.from ? readableValue(item.action, item.from) : "—"} {"→"} {item.to ? readableValue(item.action, item.to) : "—"}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">{item.createdAt ? formatDateTime(item.createdAt) : ""}</p>
            </div>
          ))}
          {!activity.length ? <p className="text-xs text-muted-foreground">No history yet.</p> : null}
        </>
      )}
    </div>
  );
}
