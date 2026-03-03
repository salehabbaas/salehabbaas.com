"use client";

import { FormEvent } from "react";
import { motion } from "framer-motion";
import {
  CalendarClock,
  CirclePlus,
  Flag,
  ListTodo,
  Sparkles,
  Tags,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TaskAssigneeSelect,
  TaskPrioritySelect,
  TaskStatusSelect,
} from "@/components/task/task-option-selectors";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { type TaskPriority } from "@/types/project-management";
import type { ProjectMemberSummary } from "@/types/admin-access";

type CreateTaskModalProps = {
  open: boolean;
  canWrite: boolean;
  creating: boolean;
  title: string;
  description: string;
  priority: TaskPriority;
  statusColumnId: string;
  assigneeId: string;
  dueDateInput: string;
  labelsInput: string;
  members: ProjectMemberSummary[];
  columns: Array<{ id: string; name: string }>;
  onOpenChange: (open: boolean) => void;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPriorityChange: (value: TaskPriority) => void;
  onStatusChange: (value: string) => void;
  onAssigneeChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onLabelsChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

type FieldTone = "primary" | "accent" | "warning" | "success";

const fieldToneStyles: Record<FieldTone, { wrapper: string; icon: string }> = {
  primary: {
    wrapper: "border-primary/25 bg-primary/10",
    icon: "border-primary/35 bg-primary/20 text-primary",
  },
  accent: {
    wrapper: "border-accent/25 bg-accent/10",
    icon: "border-accent/35 bg-accent/20 text-accent",
  },
  warning: {
    wrapper: "border-warning/25 bg-warning/10",
    icon: "border-warning/35 bg-warning/20 text-warning",
  },
  success: {
    wrapper: "border-success/25 bg-success/10",
    icon: "border-success/35 bg-success/20 text-success",
  },
};

function Field({
  label,
  icon: Icon,
  tone = "primary",
  delay = 0,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: FieldTone;
  delay?: number;
  children: React.ReactNode;
}) {
  const styles = fieldToneStyles[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, delay }}
      className={cn("space-y-2 rounded-xl border p-3", styles.wrapper)}
    >
      <Label className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <span
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center rounded-md border",
            styles.icon,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        {label}
      </Label>
      {children}
    </motion.div>
  );
}

export function CreateTaskModal(props: CreateTaskModalProps) {
  return (
    <Dialog
      open={props.canWrite && props.open}
      onOpenChange={props.onOpenChange}
    >
      <DialogContent className="overflow-hidden border-border/70 bg-gradient-to-b from-card/95 via-card/90 to-muted/25 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border/65 bg-gradient-to-r from-primary/15 via-accent/10 to-warning/10 px-5 py-4">
          <DialogTitle className="inline-flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary/35 bg-primary/15 text-primary">
              <CirclePlus className="h-4 w-4" />
            </span>
            Create task
          </DialogTitle>
          <DialogDescription className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Add a task quickly with priority, assignee, and schedule.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-3 px-5 py-4" onSubmit={props.onSubmit}>
          <Field label="Title" icon={ListTodo} tone="primary" delay={0.01}>
            <Input
              value={props.title}
              onChange={(event) => props.onTitleChange(event.target.value)}
              required
              placeholder="Task title"
            />
          </Field>

          <Field label="Description" icon={Sparkles} tone="accent" delay={0.03}>
            <Textarea
              rows={3}
              value={props.description}
              onChange={(event) =>
                props.onDescriptionChange(event.target.value)
              }
              placeholder="What needs to be done?"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Priority" icon={Flag} tone="warning" delay={0.05}>
              <TaskPrioritySelect
                value={props.priority}
                onChange={props.onPriorityChange}
                disabled={props.creating}
              />
            </Field>
            <Field label="Status" icon={ListTodo} tone="primary" delay={0.06}>
              <TaskStatusSelect
                value={props.statusColumnId}
                columns={props.columns}
                onChange={props.onStatusChange}
                disabled={props.creating}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Assignee" icon={UserRound} tone="accent" delay={0.07}>
              <TaskAssigneeSelect
                value={props.assigneeId}
                members={props.members.map((member) => ({
                  uid: member.uid,
                  label: member.displayName || member.email || member.uid,
                }))}
                onChange={props.onAssigneeChange}
                disabled={props.creating}
              />
            </Field>
            <Field
              label="Due date"
              icon={CalendarClock}
              tone="success"
              delay={0.08}
            >
              <DateTimePicker
                value={props.dueDateInput}
                onChange={props.onDueDateChange}
              />
            </Field>
          </div>

          <Field label="Labels" icon={Tags} tone="warning" delay={0.09}>
            <Input
              value={props.labelsInput}
              onChange={(event) => props.onLabelsChange(event.target.value)}
              placeholder="api, urgent"
            />
          </Field>

          <DialogFooter className="border-t border-border/65 pt-3 sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Tip: set assignee and due date to trigger reminders.
            </p>
            <Button
              type="submit"
              disabled={props.creating}
              className="min-w-28"
            >
              {props.creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
