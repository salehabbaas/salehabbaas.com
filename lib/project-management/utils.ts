import { priorityRankMap, type ActivityDoc, type BoardColumn, type TaskDoc, type TaskPriority } from "@/types/project-management";

type FirestoreTimestampLike =
  | string
  | Date
  | {
      toDate?: () => Date;
    }
  | null
  | undefined;

export function toIso(value: FirestoreTimestampLike): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return undefined;
}

export function toDate(value: FirestoreTimestampLike): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && typeof value.toDate === "function") {
    const parsed = value.toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export function formatDateTime(value: FirestoreTimestampLike, timezone?: string) {
  const parsed = toDate(value);
  if (!parsed) return "";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone
  }).format(parsed);
}

export function formatDateOnly(value: FirestoreTimestampLike, timezone?: string) {
  const parsed = toDate(value);
  if (!parsed) return "";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: timezone
  }).format(parsed);
}

export function parseTagInput(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function orderColumns(columns: BoardColumn[]) {
  return [...columns].sort((a, b) => a.order - b.order);
}

export function isColumnDone(columnId: string, columns: BoardColumn[]) {
  const found = columns.find((item) => item.id === columnId);
  if (!found) return false;
  return /done|complete|closed/i.test(found.name);
}

export function isTaskOverdue(task: TaskDoc, now = new Date()) {
  const dueDate = toDate(task.dueDate);
  if (!dueDate) return false;
  return dueDate.getTime() < now.getTime();
}

export function compareImportantTasks(a: TaskDoc, b: TaskDoc) {
  const now = Date.now();
  const aDue = toDate(a.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
  const bDue = toDate(b.dueDate)?.getTime() ?? Number.POSITIVE_INFINITY;
  const aOverdue = aDue < now;
  const bOverdue = bDue < now;

  if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
  if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank;
  return aDue - bDue;
}

export function normalizeTaskPriority(priority: string | undefined): TaskPriority {
  if (priority === "P1" || priority === "P2" || priority === "P3" || priority === "P4") return priority;
  return "P3";
}

export function ensurePriorityRank(priority: TaskPriority, rank?: number) {
  if (typeof rank === "number" && Number.isFinite(rank)) return rank;
  return priorityRankMap[priority];
}

export function mapActivityDoc(id: string, data: Record<string, unknown>): ActivityDoc {
  return {
    id,
    projectId: String(data.projectId ?? ""),
    taskId: String(data.taskId ?? ""),
    actorId: String(data.actorId ?? ""),
    action: String(data.action ?? ""),
    from: typeof data.from === "string" ? data.from : undefined,
    to: typeof data.to === "string" ? data.to : undefined,
    createdAt: toIso(data.createdAt as FirestoreTimestampLike)
  };
}

export function toDatetimeLocalInput(value?: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const offsetMs = parsed.getTimezoneOffset() * 60 * 1000;
  const local = new Date(parsed.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
}

export function fromDatetimeLocalInput(value: string) {
  if (!value.trim()) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

export function formatTaskIdentifier(task: Pick<TaskDoc, "id" | "taskKey">) {
  const explicit = typeof task.taskKey === "string" ? task.taskKey.trim() : "";
  if (explicit) return explicit;
  return `task-${task.id.slice(0, 5).toUpperCase()}`;
}
