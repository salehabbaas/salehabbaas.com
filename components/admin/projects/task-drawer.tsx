"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, fromDatetimeLocalInput, parseTagInput, toDatetimeLocalInput } from "@/lib/project-management/utils";
import { priorityToneMap, type ActivityDoc, type BoardColumn, type TaskDoc } from "@/types/project-management";

type TaskDrawerProps = {
  projectId: string;
  task: TaskDoc | null;
  columns: BoardColumn[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
};

function inferDrawerSide() {
  if (typeof window === "undefined") return "right" as const;
  return window.innerWidth < 768 ? "bottom" : "right";
}

export function TaskDrawer({ projectId, task, columns, open, onOpenChange, onSaved }: TaskDrawerProps) {
  const [side, setSide] = useState<"right" | "bottom">("right");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState("");
  const [activity, setActivity] = useState<ActivityDoc[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskDoc["priority"]>("P3");
  const [statusColumnId, setStatusColumnId] = useState("");
  const [dueDateInput, setDueDateInput] = useState("");
  const [labelsInput, setLabelsInput] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [watchersInput, setWatchersInput] = useState("");
  const [email24h, setEmail24h] = useState(true);
  const [email1h, setEmail1h] = useState(true);
  const [dailyOverdue, setDailyOverdue] = useState(true);

  useEffect(() => {
    const apply = () => setSide(inferDrawerSide());
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  useEffect(() => {
    if (!task) return;

    setTitle(task.title);
    setDescription(task.description);
    setPriority(task.priority);
    setStatusColumnId(task.statusColumnId);
    setDueDateInput(toDatetimeLocalInput(task.dueDate));
    setLabelsInput(task.labels.join(", "));
    setAssigneeId(task.assigneeId ?? "");
    setWatchersInput(task.watchers.join(", "));
    setEmail24h(task.reminderConfig.email24h);
    setEmail1h(task.reminderConfig.email1h);
    setDailyOverdue(task.reminderConfig.dailyOverdue);
    setStatus("");
  }, [task]);

  useEffect(() => {
    if (!open || !task) return;
    const taskId = task.id;

    let mounted = true;

    async function loadActivity() {
      try {
        const response = await fetch(`/api/admin/projects/${projectId}/activity?taskId=${taskId}`, { cache: "no-store" });
        const data = (await response.json()) as { activity?: ActivityDoc[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Unable to load activity");
        if (!mounted) return;
        setActivity(data.activity ?? []);
      } catch {
        if (!mounted) return;
        setActivity([]);
      }
    }

    loadActivity();

    return () => {
      mounted = false;
    };
  }, [open, projectId, task]);

  const columnOptions = useMemo(() => [...columns].sort((a, b) => a.order - b.order), [columns]);

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!task) return;

    setSaving(true);
    setStatus("");

    try {
      const response = await fetch(`/api/admin/projects/${projectId}/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          priority,
          statusColumnId,
          dueDate: fromDatetimeLocalInput(dueDateInput) ?? null,
          labels: parseTagInput(labelsInput),
          assigneeId: assigneeId.trim() || null,
          watchers: parseTagInput(watchersInput),
          reminderConfig: {
            email24h,
            email1h,
            dailyOverdue
          }
        })
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to save task");

      await onSaved();
      setStatus("Task saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save task");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTask() {
    if (!task) return;
    if (!window.confirm("Delete this task?")) return;

    setDeleting(true);
    setStatus("");

    try {
      const response = await fetch(`/api/admin/projects/${projectId}/tasks/${task.id}`, {
        method: "DELETE"
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to delete task");

      await onSaved();
      onOpenChange(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to delete task");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={
          side === "bottom"
            ? "h-[100dvh] w-full max-w-none rounded-none"
            : "w-[calc(100%-1rem)] max-w-2xl overflow-y-auto"
        }
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {task?.title ?? "Task"}
            {task ? <Badge className={priorityToneMap[task.priority]}>{task.priority}</Badge> : null}
          </SheetTitle>
          <SheetDescription>Full edit form with timeline.</SheetDescription>
          {status ? <p className="text-sm text-primary">{status}</p> : null}
        </SheetHeader>

        {task ? (
          <div className="flex h-full flex-col gap-6 overflow-y-auto px-6 pb-6">
            <form className="space-y-4" onSubmit={saveTask}>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea rows={6} value={description} onChange={(event) => setDescription(event.target.value)} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onChange={(event) => setPriority(event.target.value as TaskDoc["priority"])}>
                    <option value="P1">P1</option>
                    <option value="P2">P2</option>
                    <option value="P3">P3</option>
                    <option value="P4">P4</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status column</Label>
                  <Select value={statusColumnId} onChange={(event) => setStatusColumnId(event.target.value)}>
                    {columnOptions.map((column) => (
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
                  <Label>Assignee UID</Label>
                  <Input value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} placeholder="admin uid" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Labels (comma separated)</Label>
                <Input value={labelsInput} onChange={(event) => setLabelsInput(event.target.value)} placeholder="frontend, urgent" />
              </div>

              <div className="space-y-2">
                <Label>Watchers (comma separated UIDs)</Label>
                <Input value={watchersInput} onChange={(event) => setWatchersInput(event.target.value)} placeholder="uid1, uid2" />
              </div>

              <div className="rounded-2xl border border-border/70 p-3">
                <p className="text-sm font-medium">Reminder config</p>
                <div className="mt-2 grid gap-2 text-sm">
                  <label className="flex items-center gap-2">
                    <Checkbox checked={email24h} onChange={(event) => setEmail24h(event.target.checked)} />
                    Email 24h before due
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox checked={email1h} onChange={(event) => setEmail1h(event.target.checked)} />
                    Email 1h before due
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox checked={dailyOverdue} onChange={(event) => setDailyOverdue(event.target.checked)} />
                    Daily overdue digest
                  </label>
                </div>
              </div>

              <SheetFooter className="px-0 pb-0">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Task"}
                </Button>
                <Button type="button" variant="outline" onClick={deleteTask} disabled={deleting}>
                  <Trash2 className="h-4 w-4" />
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </SheetFooter>
            </form>

            <div className="space-y-3">
              <p className="text-sm font-medium">Activity timeline</p>
              <div className="space-y-2">
                {activity.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border/70 bg-card/80 p-3 text-sm">
                    <p className="font-medium">{item.action.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">From: {item.from || "-"} To: {item.to || "-"}</p>
                    <p className="text-xs text-muted-foreground">{item.createdAt ? formatDateTime(item.createdAt) : ""}</p>
                  </div>
                ))}
                {!activity.length ? <p className="text-xs text-muted-foreground">No activity yet.</p> : null}
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
