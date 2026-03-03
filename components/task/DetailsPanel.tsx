"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Check,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  Eye,
  Flag,
  FolderKanban,
  ListTodo,
  RefreshCcw,
  Sparkles,
  Tags,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatDateTime, toDate } from "@/lib/project-management/utils";
import { cn } from "@/lib/utils";
import {
  priorityLabelMap,
  type BoardColumn,
  type TaskDoc,
} from "@/types/project-management";
import type { ProjectMemberSummary } from "@/types/admin-access";

type DetailsPanelProps = {
  task: TaskDoc;
  canWrite: boolean;
  columns: BoardColumn[];
  members: ProjectMemberSummary[];
  statusColumnId: string;
  assigneeId: string;
  priority: TaskDoc["priority"];
  labelsInput: string;
  dueDateInput: string;
  startDateInput: string;
  category: string;
  selectedWatchers: string[];
  onStatusChange: (value: string) => void;
  onAssigneeChange: (value: string) => void;
  onPriorityChange: (value: TaskDoc["priority"]) => void;
  onLabelsChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onToggleWatcher: (uid: string, checked: boolean) => void;
  onAssignToMe: () => void;
  email24h: boolean;
  email1h: boolean;
  dailyOverdue: boolean;
  onReminderChange: (
    key: "email24h" | "email1h" | "dailyOverdue",
    value: boolean,
  ) => void;
  savingField?: string;
  onCommitField: (field: string, value?: unknown) => void;
};

type RowTone = "primary" | "accent" | "warning" | "success";

const rowToneStyles: Record<
  RowTone,
  { container: string; iconWrap: string; label: string }
> = {
  primary: {
    container: "border-primary/25 bg-primary/10 hover:border-primary/40",
    iconWrap: "border-primary/35 bg-primary/20 text-primary",
    label: "text-primary/90",
  },
  accent: {
    container: "border-accent/25 bg-accent/10 hover:border-accent/40",
    iconWrap: "border-accent/35 bg-accent/20 text-accent",
    label: "text-accent/90",
  },
  warning: {
    container: "border-warning/25 bg-warning/10 hover:border-warning/40",
    iconWrap: "border-warning/35 bg-warning/20 text-warning",
    label: "text-warning/90",
  },
  success: {
    container: "border-success/25 bg-success/10 hover:border-success/40",
    iconWrap: "border-success/35 bg-success/20 text-success",
    label: "text-success/90",
  },
};

function Row({
  label,
  icon: Icon,
  tone = "primary",
  delay = 0,
  children,
}: {
  label: string;
  icon: LucideIcon;
  tone?: RowTone;
  delay?: number;
  children: React.ReactNode;
}) {
  const styles = rowToneStyles[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay }}
      whileHover={{ y: -1 }}
      className={cn(
        "relative z-0 grid gap-2 rounded-xl border px-2.5 py-2 transition-colors focus-within:z-40 sm:grid-cols-[124px_1fr] sm:items-center",
        styles.container,
      )}
    >
      <p
        className={cn(
          "inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.01em]",
          styles.label,
        )}
      >
        <span
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center rounded-md border",
            styles.iconWrap,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        {label}
      </p>
      <div>{children}</div>
    </motion.div>
  );
}

function formatRelativeTime(value?: string) {
  if (!value) return "Unknown";
  const parsed = toDate(value);
  if (!parsed) return "Unknown";

  const deltaMs = parsed.getTime() - Date.now();
  const past = deltaMs < 0;
  const absMinutes = Math.round(Math.abs(deltaMs) / 60000);

  if (absMinutes < 1) return "Just now";
  if (absMinutes < 60)
    return past ? `${absMinutes} min ago` : `In ${absMinutes} min`;

  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) return past ? `${absHours}h ago` : `In ${absHours}h`;

  const absDays = Math.round(absHours / 24);
  if (absDays < 7) return past ? `${absDays}d ago` : `In ${absDays}d`;

  return formatDateTime(value) || "Unknown";
}

function formatTimestamp(value?: string) {
  return formatDateTime(value) || "Not available";
}

function FancyCheckbox({
  checked,
  onChange,
  disabled = false,
  tone = "accent",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  tone?: "accent" | "warning";
}) {
  const checkedTone =
    tone === "warning"
      ? "border-warning/55 bg-warning/20 text-warning"
      : "border-accent/55 bg-accent/20 text-accent";

  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      whileTap={disabled ? undefined : { scale: 0.92 }}
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded-md border transition",
        checked
          ? checkedTone
          : "border-border/65 bg-background/80 text-transparent",
        disabled ? "cursor-not-allowed opacity-50" : "hover:brightness-110",
      )}
    >
      <motion.span
        initial={false}
        animate={{
          scale: checked ? 1 : 0.4,
          opacity: checked ? 1 : 0,
        }}
        transition={{ duration: 0.14, ease: "easeOut" }}
      >
        <Check className="h-3.5 w-3.5" />
      </motion.span>
    </motion.button>
  );
}

export function DetailsPanel(props: DetailsPanelProps) {
  const [watchersCollapsed, setWatchersCollapsed] = useState(true);
  const [remindersCollapsed, setRemindersCollapsed] = useState(true);

  useEffect(() => {
    setWatchersCollapsed(true);
    setRemindersCollapsed(true);
  }, [props.task.id]);

  const activeReminderCount =
    Number(props.email24h) + Number(props.email1h) + Number(props.dailyOverdue);

  return (
    <motion.aside
      className="space-y-2.5 rounded-2xl border border-border/70 bg-gradient-to-b from-card/80 via-card/60 to-muted/20 p-2.5 shadow-elev1"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      <motion.div
        className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-2.5 py-2"
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.14 }}
      >
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Details
        </p>
        {props.savingField ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Saving {props.savingField}...
          </span>
        ) : null}
      </motion.div>

      <Row label="Status" icon={ListTodo} tone="primary" delay={0.01}>
        <Select
          value={props.statusColumnId}
          onChange={(event) => {
            const next = event.target.value;
            props.onStatusChange(next);
            props.onCommitField("status", next);
          }}
          disabled={!props.canWrite}
          className="h-8"
        >
          {props.columns.map((column) => (
            <option key={column.id} value={column.id}>
              {column.name}
            </option>
          ))}
        </Select>
      </Row>

      <Row label="Assignee" icon={UserRound} tone="accent" delay={0.03}>
        <div className="flex items-center gap-2">
          <Select
            value={props.assigneeId}
            onChange={(event) => {
              const next = event.target.value;
              props.onAssigneeChange(next);
              props.onCommitField("assignee", next);
            }}
            disabled={!props.canWrite}
            className="h-8"
          >
            <option value="">Unassigned</option>
            {props.members.map((member) => (
              <option key={member.uid} value={member.uid}>
                {member.displayName || member.email || member.uid}
              </option>
            ))}
          </Select>
          {props.canWrite ? (
            <button
              type="button"
              className="h-8 shrink-0 rounded-lg border border-accent/35 bg-accent/10 px-2.5 text-[11px] font-medium text-accent transition hover:border-accent/50"
              onClick={props.onAssignToMe}
            >
              Me
            </button>
          ) : null}
        </div>
      </Row>

      <Row label="Priority" icon={Flag} tone="warning" delay={0.05}>
        <Select
          value={props.priority}
          onChange={(event) => {
            const next = event.target.value as TaskDoc["priority"];
            props.onPriorityChange(next);
            props.onCommitField("priority", next);
          }}
          disabled={!props.canWrite}
          className="h-8"
        >
          <option value="P1">{priorityLabelMap.P1}</option>
          <option value="P2">{priorityLabelMap.P2}</option>
          <option value="P3">{priorityLabelMap.P3}</option>
          <option value="P4">{priorityLabelMap.P4}</option>
        </Select>
      </Row>

      <Row label="Labels" icon={Tags} tone="accent" delay={0.07}>
        <Input
          value={props.labelsInput}
          onChange={(event) => props.onLabelsChange(event.target.value)}
          onBlur={() => props.onCommitField("labels", props.labelsInput)}
          disabled={!props.canWrite}
          className="h-8"
        />
      </Row>

      <Row label="Start date" icon={CalendarDays} tone="success" delay={0.09}>
        <DateTimePicker
          value={props.startDateInput}
          onChange={props.onStartDateChange}
          onApply={(value) => props.onCommitField("startDate", value)}
          disabled={!props.canWrite}
          className="h-8 rounded-lg px-2.5 text-xs"
        />
      </Row>

      <Row label="Due date" icon={CalendarClock} tone="warning" delay={0.11}>
        <DateTimePicker
          value={props.dueDateInput}
          onChange={props.onDueDateChange}
          onApply={(value) => props.onCommitField("dueDate", value)}
          disabled={!props.canWrite}
          className="h-8 rounded-lg px-2.5 text-xs"
        />
      </Row>

      <Row label="Category" icon={FolderKanban} tone="primary" delay={0.13}>
        <Input
          value={props.category}
          onChange={(event) => props.onCategoryChange(event.target.value)}
          onBlur={() => props.onCommitField("category", props.category)}
          disabled={!props.canWrite}
          className="h-8"
        />
      </Row>

      <motion.div
        className="rounded-xl border border-accent/25 bg-accent/10 px-2.5 py-2"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, delay: 0.15 }}
      >
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setWatchersCollapsed((prev) => !prev)}
        >
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent">
            <Eye className="h-3.5 w-3.5" />
            Watchers
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <span className="rounded-full border border-accent/35 bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
              {props.selectedWatchers.length}
            </span>
            <motion.span
              animate={{ rotate: watchersCollapsed ? 0 : 90 }}
              transition={{ duration: 0.14 }}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </motion.span>
          </span>
        </button>
        <AnimatePresence initial={false}>
          {watchersCollapsed ? null : (
            <motion.div
              key="watchers-content"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                {props.members.map((member) => (
                  <div
                    key={member.uid}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/55 px-2 py-1.5 text-xs transition hover:bg-background/70"
                  >
                    <span className="truncate">
                      {member.displayName || member.email || member.uid}
                    </span>
                    <FancyCheckbox
                      checked={props.selectedWatchers.includes(member.uid)}
                      onChange={(next) =>
                        props.onToggleWatcher(member.uid, next)
                      }
                      disabled={!props.canWrite}
                      tone="accent"
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        className="rounded-xl border border-warning/25 bg-warning/10 px-2.5 py-2"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, delay: 0.17 }}
      >
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setRemindersCollapsed((prev) => !prev)}
        >
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-warning">
            <Bell className="h-3.5 w-3.5" />
            Reminders
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <span className="rounded-full border border-warning/35 bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
              {activeReminderCount}
            </span>
            <motion.span
              animate={{ rotate: remindersCollapsed ? 0 : 90 }}
              transition={{ duration: 0.14 }}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </motion.span>
          </span>
        </button>
        <AnimatePresence initial={false}>
          {remindersCollapsed ? null : (
            <motion.div
              key="reminders-content"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-2 grid gap-1.5 text-xs">
                <div className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/55 px-2 py-1.5">
                  <span>24h before due</span>
                  <FancyCheckbox
                    checked={props.email24h}
                    onChange={(nextChecked) => {
                      const next = {
                        email24h: nextChecked,
                        email1h: props.email1h,
                        dailyOverdue: props.dailyOverdue,
                      };
                      props.onReminderChange("email24h", nextChecked);
                      props.onCommitField("reminders", next);
                    }}
                    disabled={!props.canWrite}
                    tone="warning"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/55 px-2 py-1.5">
                  <span>1h before due</span>
                  <FancyCheckbox
                    checked={props.email1h}
                    onChange={(nextChecked) => {
                      const next = {
                        email24h: props.email24h,
                        email1h: nextChecked,
                        dailyOverdue: props.dailyOverdue,
                      };
                      props.onReminderChange("email1h", nextChecked);
                      props.onCommitField("reminders", next);
                    }}
                    disabled={!props.canWrite}
                    tone="warning"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/55 px-2 py-1.5">
                  <span>Daily overdue</span>
                  <FancyCheckbox
                    checked={props.dailyOverdue}
                    onChange={(nextChecked) => {
                      const next = {
                        email24h: props.email24h,
                        email1h: props.email1h,
                        dailyOverdue: nextChecked,
                      };
                      props.onReminderChange("dailyOverdue", nextChecked);
                      props.onCommitField("reminders", next);
                    }}
                    disabled={!props.canWrite}
                    tone="warning"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        className="rounded-xl border border-border/60 bg-gradient-to-br from-card/80 via-success/5 to-warning/5 px-2.5 py-2.5"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, delay: 0.19 }}
      >
        <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          <RefreshCcw className="h-3.5 w-3.5" />
          Timeline
        </p>
        <div className="mt-2 space-y-1.5">
          <div className="flex items-start gap-2 rounded-lg border border-success/25 bg-success/10 px-2 py-1.5">
            <CalendarDays className="mt-0.5 h-3.5 w-3.5 text-success" />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Created</p>
              <p className="truncate text-xs font-medium">
                {formatTimestamp(props.task.createdAt)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {formatRelativeTime(props.task.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/10 px-2 py-1.5">
            <RefreshCcw className="mt-0.5 h-3.5 w-3.5 text-warning" />
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Last updated</p>
              <p className="truncate text-xs font-medium">
                {formatTimestamp(props.task.updatedAt)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {formatRelativeTime(props.task.updatedAt)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.aside>
  );
}
