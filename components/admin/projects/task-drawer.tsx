"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { ActivityTabs } from "@/components/task/ActivityTabs";
import { DetailsPanel } from "@/components/task/DetailsPanel";
import { RelatedWork } from "@/components/task/RelatedWork";
import { TaskDescription } from "@/components/task/TaskDescription";
import { TaskHeader } from "@/components/task/TaskHeader";
import { todayDateId } from "@/lib/goals/date";
import { extractCommentMentionUids } from "@/lib/project-management/comment-mentions";
import { fromDatetimeLocalInput, parseTagInput, toDatetimeLocalInput } from "@/lib/project-management/utils";
import { type ActivityDoc, type BoardColumn, type TaskDoc, type TaskLinkRelationType, type TaskSubtask } from "@/types/project-management";
import type { ProjectMemberSummary } from "@/types/admin-access";

type TaskDrawerProps = {
  projectId: string;
  task: TaskDoc | null;
  tasks: TaskDoc[];
  columns: BoardColumn[];
  members: ProjectMemberSummary[];
  canWrite: boolean;
  open: boolean;
  mode?: "dialog" | "page";
  actorUid?: string;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => Promise<void>;
  onTaskUpdated?: (task: TaskDoc) => void;
  onTaskDeleted?: (taskId: string) => void;
  onOpenTask?: (taskId: string) => void;
  onOpenFullPage?: (taskId: string) => void;
};

export function TaskDrawer({
  projectId,
  task,
  tasks,
  columns,
  members,
  canWrite,
  open,
  mode = "dialog",
  actorUid,
  onOpenChange,
  onSaved,
  onTaskUpdated,
  onTaskDeleted,
  onOpenTask,
  onOpenFullPage
}: TaskDrawerProps) {
  const [savingField, setSavingField] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [watchersDialogOpen, setWatchersDialogOpen] = useState(false);
  const [addToPlanDialogOpen, setAddToPlanDialogOpen] = useState(false);
  const [addToPlanDate, setAddToPlanDate] = useState(todayDateId("America/Montreal"));
  const [addToPlanStatus, setAddToPlanStatus] = useState<"today" | "this_week" | "inbox">("today");
  const [addingToPlan, setAddingToPlan] = useState(false);
  const [status, setStatus] = useState("");
  const [activity, setActivity] = useState<ActivityDoc[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskDoc["priority"]>("P3");
  const [statusColumnId, setStatusColumnId] = useState("");
  const [dueDateInput, setDueDateInput] = useState("");
  const [startDateInput, setStartDateInput] = useState("");
  const [labelsInput, setLabelsInput] = useState("");
  const [category, setCategory] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [selectedWatchers, setSelectedWatchers] = useState<string[]>([]);
  const [email24h, setEmail24h] = useState(true);
  const [email1h, setEmail1h] = useState(true);
  const [dailyOverdue, setDailyOverdue] = useState(true);
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>([]);
  const [subtaskInput, setSubtaskInput] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [addRelation, setAddRelation] = useState<TaskLinkRelationType>("related");
  const [addTargetTaskId, setAddTargetTaskId] = useState("");

  function areStringArraysEqual(a: string[], b: string[]) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => item === b[index]);
  }

  function areStringSetsEqual(a: string[], b: string[]) {
    if (a.length !== b.length) return false;
    const aSorted = [...a].sort();
    const bSorted = [...b].sort();
    return aSorted.every((item, index) => item === bSorted[index]);
  }

  useEffect(() => {
    if (!task) return;

    setTitle(task.title);
    setDescription(task.description);
    setPriority(task.priority);
    setStatusColumnId(task.statusColumnId);
    setDueDateInput(toDatetimeLocalInput(task.dueDate));
    setStartDateInput(toDatetimeLocalInput(task.startDate));
    setLabelsInput(task.labels.join(", "));
    setCategory(task.category ?? "");
    setAssigneeId(task.assigneeId ?? "");
    setSelectedWatchers(task.watchers);
    setEmail24h(task.reminderConfig.email24h);
    setEmail1h(task.reminderConfig.email1h);
    setDailyOverdue(task.reminderConfig.dailyOverdue);
    setSubtasks(task.subtasks ?? []);
    setCommentInput("");
    setSubtaskInput("");
    setWatchersDialogOpen(false);
    setAddToPlanDialogOpen(false);
    setAddToPlanDate(todayDateId("America/Montreal"));
    setAddToPlanStatus("today");
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
  const memberOptions = useMemo(
    () => [...members].sort((a, b) => (a.displayName || a.email || a.uid).localeCompare(b.displayName || b.email || b.uid)),
    [members]
  );
  const watcherDetails = useMemo(() => {
    const memberById = new Map(memberOptions.map((member) => [member.uid, member] as const));
    return selectedWatchers.map((uid) => {
      const member = memberById.get(uid);
      return {
        uid,
        displayName: member?.displayName || "",
        email: member?.email || ""
      };
    });
  }, [memberOptions, selectedWatchers]);

  function mapSubtasksForPayload(items: TaskSubtask[]) {
    return items.map((item) => ({
      id: item.id,
      title: item.title.trim(),
      completed: item.completed,
      assigneeId: item.assigneeId || "",
      status: item.status || (item.completed ? "done" : "todo"),
      priority: item.priority || "P3"
    }));
  }

  async function patchTask(payload: Record<string, unknown>, fieldLabel: string, statusLabel = "Task saved.") {
    if (!task || !canWrite) return;
    setSavingField(fieldLabel);
    setStatus("");
    try {
      const response = await fetch(`/api/admin/projects/${projectId}/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = (await response.json()) as { error?: string; task?: TaskDoc };
      if (!response.ok) throw new Error(data.error ?? "Unable to save task");

      if (data.task) {
        onTaskUpdated?.(data.task);
      } else {
        await onSaved?.();
      }
      setStatus(statusLabel);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save task");
    } finally {
      setSavingField("");
    }
  }

  async function commitField(field: string, override?: unknown) {
    if (!task || !canWrite) return;

    if (field === "title") {
      const nextTitle = typeof override === "string" ? override : title;
      if (nextTitle.trim() === task.title.trim()) return;
      await patchTask({ title: nextTitle }, "title");
      return;
    }
    if (field === "description") {
      const nextDescription = typeof override === "string" ? override : description;
      if (nextDescription === task.description) return;
      await patchTask({ description: nextDescription }, "description");
      return;
    }
    if (field === "status") {
      const nextStatusColumnId = typeof override === "string" ? override : statusColumnId;
      if (nextStatusColumnId === task.statusColumnId) return;
      await patchTask({ statusColumnId: nextStatusColumnId }, "status");
      return;
    }
    if (field === "assignee") {
      const nextAssigneeId = typeof override === "string" ? override : assigneeId;
      if ((nextAssigneeId || "") === (task.assigneeId || "")) return;
      await patchTask({ assigneeId: nextAssigneeId || null }, "assignee");
      return;
    }
    if (field === "priority") {
      const nextPriority = (typeof override === "string" ? override : priority) as TaskDoc["priority"];
      if (nextPriority === task.priority) return;
      await patchTask({ priority: nextPriority }, "priority");
      return;
    }
    if (field === "labels") {
      const nextLabelsInput = typeof override === "string" ? override : labelsInput;
      const nextLabels = parseTagInput(nextLabelsInput);
      if (areStringArraysEqual(nextLabels, task.labels)) return;
      await patchTask({ labels: nextLabels }, "labels");
      return;
    }
    if (field === "dueDate") {
      const nextDueDateInput = typeof override === "string" ? override : dueDateInput;
      if (nextDueDateInput === toDatetimeLocalInput(task.dueDate)) return;
      await patchTask({ dueDate: fromDatetimeLocalInput(nextDueDateInput) ?? null }, "due date");
      return;
    }
    if (field === "startDate") {
      const nextStartDateInput = typeof override === "string" ? override : startDateInput;
      if (nextStartDateInput === toDatetimeLocalInput(task.startDate)) return;
      await patchTask({ startDate: fromDatetimeLocalInput(nextStartDateInput) ?? null }, "start date");
      return;
    }
    if (field === "category") {
      const nextCategory = typeof override === "string" ? override : category;
      const normalizedNext = nextCategory.trim();
      const normalizedCurrent = (task.category || "").trim();
      if (normalizedNext === normalizedCurrent) return;
      await patchTask({ category: normalizedNext || null }, "category");
      return;
    }
    if (field === "watchers") {
      const nextWatchers = Array.isArray(override) ? (override as string[]) : selectedWatchers;
      if (areStringSetsEqual(nextWatchers, task.watchers)) return;
      await patchTask({ watchers: nextWatchers }, "watchers");
      return;
    }
    if (field === "reminders") {
      const reminderOverride = override as { email24h: boolean; email1h: boolean; dailyOverdue: boolean } | undefined;
      const reminderConfig = reminderOverride ?? { email24h, email1h, dailyOverdue };
      if (
        reminderConfig.email24h === task.reminderConfig.email24h &&
        reminderConfig.email1h === task.reminderConfig.email1h &&
        reminderConfig.dailyOverdue === task.reminderConfig.dailyOverdue
      ) {
        return;
      }
      await patchTask(
        {
          reminderConfig
        },
        "reminders"
      );
      return;
    }
    if (field === "subtasks") {
      const nextSubtasks = Array.isArray(override) ? (override as TaskSubtask[]) : subtasks;
      const normalizedNext = mapSubtasksForPayload(nextSubtasks);
      const normalizedCurrent = mapSubtasksForPayload(task.subtasks ?? []);
      if (JSON.stringify(normalizedNext) === JSON.stringify(normalizedCurrent)) return;
      await patchTask(
        {
          subtasks: normalizedNext
        },
        "subtasks"
      );
    }
  }

  function updateSubtasks(updater: (prev: TaskSubtask[]) => TaskSubtask[]) {
    setSubtasks((prev) => {
      const next = updater(prev);
      void commitField("subtasks", next);
      return next;
    });
  }

  async function addComment() {
    if (!task || !canWrite) return;
    const body = commentInput.trim();
    if (!body) return;
    const mentionUids = extractCommentMentionUids(body);

    setCommentBusy(true);
    await patchTask(
      {
        addComment: {
          body,
          mentionUids
        }
      },
      "comment",
      "Comment added."
    );
    setCommentInput("");
    setCommentBusy(false);
  }

  async function deleteComment(commentId: string) {
    if (!task || !canWrite) return;
    setCommentBusy(true);
    await patchTask({ deleteCommentId: commentId }, "comment", "Comment removed.");
    setCommentBusy(false);
  }

  async function addLink() {
    if (!task || !canWrite) return;
    const targetTaskId = addTargetTaskId.trim();
    if (!targetTaskId) return;
    setCommentBusy(true);
    await patchTask(
      {
        addLink: {
          relationType: addRelation,
          targetTaskId
        }
      },
      "link",
      "Link added."
    );
    setAddTargetTaskId("");
    setCommentBusy(false);
  }

  async function removeLink(linkId: string) {
    if (!task || !canWrite) return;
    setCommentBusy(true);
    await patchTask({ removeLinkId: linkId }, "link", "Link removed.");
    setCommentBusy(false);
  }

  async function deleteTask() {
    if (!task || !canWrite) return;

    setDeleting(true);
    setStatus("");

    try {
      const response = await fetch(`/api/admin/projects/${projectId}/tasks/${task.id}`, {
        method: "DELETE"
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to delete task");

      setConfirmDeleteOpen(false);
      onTaskDeleted?.(task.id);
      await onSaved?.();
      onOpenChange(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to delete task");
    } finally {
      setDeleting(false);
    }
  }

  async function addTaskToGoalsPlan() {
    if (!task) return;

    setAddingToPlan(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/goals/project-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          taskId: task.id,
          dateId: addToPlanDate || undefined,
          status: addToPlanStatus
        })
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Unable to add task to day plan");

      setAddToPlanDialogOpen(false);
      setStatus("Task added to Goals plan.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to add task to day plan");
    } finally {
      setAddingToPlan(false);
    }
  }

  const taskContent = task ? (
    <motion.div
      className="flex h-full flex-col gap-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <TaskHeader
        task={task}
        title={title}
        statusMessage={status}
        savingTitle={savingField === "title"}
        onSaveTitle={(nextTitle) => {
          setTitle(nextTitle);
          void commitField("title", nextTitle);
        }}
        onOpenWatchers={() => setWatchersDialogOpen(true)}
        onAddToPlan={() => setAddToPlanDialogOpen(true)}
        onOpenFullPage={mode === "dialog" && onOpenFullPage ? () => onOpenFullPage(task.id) : undefined}
        onDelete={canWrite ? () => setConfirmDeleteOpen(true) : undefined}
        deleting={deleting}
        onClose={() => onOpenChange(false)}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_384px]">
        <motion.div className="space-y-4" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
          <TaskDescription
            value={description}
            canWrite={canWrite}
            saving={savingField === "description"}
            onSave={(value) => {
              setDescription(value);
              void commitField("description", value);
            }}
          />
          <RelatedWork
            task={task}
            taskOptions={tasks}
            canWrite={canWrite}
            subtasks={subtasks}
            members={memberOptions}
            subtaskInput={subtaskInput}
            onSubtaskInputChange={setSubtaskInput}
            onAddSubtask={() => {
              const nextTitle = subtaskInput.trim();
              if (!nextTitle) return;
              setSubtaskInput("");
              updateSubtasks((prev) => [
                ...prev,
                {
                  id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
                  title: nextTitle,
                  completed: false,
                  status: "todo",
                  priority: "P3"
                }
              ]);
            }}
            onToggleSubtask={(id, checked) => {
              updateSubtasks((prev) =>
                prev.map((item) =>
                  item.id === id
                    ? {
                        ...item,
                        completed: checked,
                        status: checked ? "done" : item.status === "done" ? "todo" : item.status || "todo"
                      }
                    : item
                )
              );
            }}
            onRenameSubtask={(id, value) => {
              setSubtasks((prev) => prev.map((item) => (item.id === id ? { ...item, title: value } : item)));
            }}
            onCommitSubtaskRename={(id, value) => {
              const nextTitle = value.trim();
              updateSubtasks((prev) => prev.map((item) => (item.id === id ? { ...item, title: nextTitle || item.title } : item)));
            }}
            onRemoveSubtask={(id) => {
              updateSubtasks((prev) => prev.filter((item) => item.id !== id));
            }}
            onSubtaskAssigneeChange={(id, value) => {
              updateSubtasks((prev) => prev.map((item) => (item.id === id ? { ...item, assigneeId: value || undefined } : item)));
            }}
            onSubtaskStatusChange={(id, value) => {
              updateSubtasks((prev) => prev.map((item) => (item.id === id ? { ...item, status: value, completed: value === "done" } : item)));
            }}
            onSubtaskPriorityChange={(id, value) => {
              updateSubtasks((prev) => prev.map((item) => (item.id === id ? { ...item, priority: value } : item)));
            }}
            addRelation={addRelation}
            addTarget={addTargetTaskId}
            onRelationChange={setAddRelation}
            onTargetChange={setAddTargetTaskId}
            onAddLink={() => void addLink()}
            onRemoveLink={(id) => void removeLink(id)}
            onOpenTask={(taskId) => onOpenTask?.(taskId)}
          />
          <ActivityTabs
            task={task}
            members={memberOptions}
            activity={activity}
            canWrite={canWrite}
            commentInput={commentInput}
            commentBusy={commentBusy}
            onCommentInput={setCommentInput}
            onAddComment={() => void addComment()}
            onDeleteComment={(id) => void deleteComment(id)}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
          <DetailsPanel
            task={task}
            canWrite={canWrite}
            columns={columnOptions}
            members={memberOptions}
            statusColumnId={statusColumnId}
            assigneeId={assigneeId}
            priority={priority}
            labelsInput={labelsInput}
            dueDateInput={dueDateInput}
            startDateInput={startDateInput}
            category={category}
            selectedWatchers={selectedWatchers}
            onStatusChange={setStatusColumnId}
            onAssigneeChange={setAssigneeId}
            onPriorityChange={setPriority}
            onLabelsChange={setLabelsInput}
            onDueDateChange={setDueDateInput}
            onStartDateChange={setStartDateInput}
            onCategoryChange={setCategory}
            onToggleWatcher={(uid, checked) => {
              setSelectedWatchers((prev) => {
                const nextWatchers = checked ? (prev.includes(uid) ? prev : [...prev, uid]) : prev.filter((item) => item !== uid);
                void commitField("watchers", nextWatchers);
                return nextWatchers;
              });
            }}
            onAssignToMe={() => {
              if (!actorUid) return;
              setAssigneeId(actorUid);
              void commitField("assignee", actorUid);
            }}
            email24h={email24h}
            email1h={email1h}
            dailyOverdue={dailyOverdue}
            onReminderChange={(key, value) => {
              if (key === "email24h") setEmail24h(value);
              if (key === "email1h") setEmail1h(value);
              if (key === "dailyOverdue") setDailyOverdue(value);
            }}
            savingField={savingField}
            onCommitField={(field, value) => void commitField(field, value)}
          />
        </motion.div>
      </div>
    </motion.div>
  ) : null;

  return (
    <>
      {mode === "dialog" ? (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-h-[92dvh] w-[calc(100%-1rem)] max-w-6xl overflow-y-auto p-4 sm:p-6 [&>button:last-child]:hidden">
            <DialogTitle className="sr-only">Task details</DialogTitle>
            {taskContent}
          </DialogContent>
        </Dialog>
      ) : (
        <div className="admin-workspace">
          <div className="rounded-2xl border border-border/70 bg-card/60 p-4 shadow-elev2 sm:p-6">
            {taskContent ?? <p className="text-sm text-muted-foreground">Task not found.</p>}
          </div>
        </div>
      )}

      <Dialog open={watchersDialogOpen} onOpenChange={setWatchersDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Watchers</DialogTitle>
          <DialogDescription>Users currently watching this task.</DialogDescription>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {watcherDetails.length ? (
              watcherDetails.map((watcher) => (
                <div key={watcher.uid} className="rounded-lg border border-border/60 bg-card/40 px-3 py-2">
                  <p className="text-sm font-medium">{watcher.displayName || watcher.email || watcher.uid}</p>
                  <p className="text-xs text-muted-foreground">{watcher.email || watcher.uid}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No watchers on this task.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Delete task?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete this task and all of its subtasks, links, and comments.
          </DialogDescription>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => void deleteTask()} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addToPlanDialogOpen} onOpenChange={setAddToPlanDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Add to Day Plan</DialogTitle>
          <DialogDescription>
            Create a linked sticker in Goals from this project task.
          </DialogDescription>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="add-to-plan-date" className="text-sm font-medium">
                Date
              </label>
              <input
                id="add-to-plan-date"
                type="date"
                value={addToPlanDate}
                onChange={(event) => setAddToPlanDate(event.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="add-to-plan-status" className="text-sm font-medium">
                Initial status
              </label>
              <select
                id="add-to-plan-status"
                value={addToPlanStatus}
                onChange={(event) => setAddToPlanStatus(event.target.value as "today" | "this_week" | "inbox")}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="inbox">Inbox</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddToPlanDialogOpen(false)} disabled={addingToPlan}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void addTaskToGoalsPlan()} disabled={addingToPlan}>
              {addingToPlan ? "Adding..." : "Add to Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
