import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import {
  compareImportantTasks,
  ensurePriorityRank,
  isColumnDone,
  isTaskOverdue,
  mapActivityDoc,
  normalizeTaskPriority,
  toIso
} from "@/lib/project-management/utils";
import {
  defaultBoardColumns,
  defaultReminderConfig,
  priorityRankMap,
  type ActivityDoc,
  type BoardDoc,
  type DashboardKpis,
  type ImportantTaskRow,
  type ProjectDoc,
  type ProjectMetrics,
  type TaskDoc,
  type UserProjectSettings
} from "@/types/project-management";

function mapProject(id: string, data: Record<string, unknown>): ProjectDoc {
  return {
    id,
    name: String(data.name ?? ""),
    description: String(data.description ?? ""),
    status: data.status === "archived" ? "archived" : "active",
    ownerId: String(data.ownerId ?? ""),
    createdAt: toIso(data.createdAt as Parameters<typeof toIso>[0]),
    updatedAt: toIso(data.updatedAt as Parameters<typeof toIso>[0])
  };
}

function mapBoard(id: string, data: Record<string, unknown>): BoardDoc {
  const columns = Array.isArray(data.columns)
    ? data.columns
        .map((item) => ({
          id: String((item as Record<string, unknown>).id ?? ""),
          name: String((item as Record<string, unknown>).name ?? ""),
          order: Number((item as Record<string, unknown>).order ?? 0),
          wipLimit:
            typeof (item as Record<string, unknown>).wipLimit === "number"
              ? Number((item as Record<string, unknown>).wipLimit)
              : undefined
        }))
        .filter((item) => item.id && item.name)
        .sort((a, b) => a.order - b.order)
    : defaultBoardColumns;

  return {
    id,
    projectId: String(data.projectId ?? ""),
    name: String(data.name ?? "Board"),
    columns: columns.length ? columns : defaultBoardColumns,
    createdAt: toIso(data.createdAt as Parameters<typeof toIso>[0]),
    updatedAt: toIso(data.updatedAt as Parameters<typeof toIso>[0])
  };
}

function mapTask(id: string, data: Record<string, unknown>): TaskDoc {
  const priority = normalizeTaskPriority(typeof data.priority === "string" ? data.priority : undefined);
  return {
    id,
    projectId: String(data.projectId ?? ""),
    boardId: String(data.boardId ?? ""),
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    priority,
    priorityRank: ensurePriorityRank(priority, typeof data.priorityRank === "number" ? data.priorityRank : undefined),
    statusColumnId: String(data.statusColumnId ?? ""),
    dueDate: toIso(data.dueDate as Parameters<typeof toIso>[0]),
    labels: Array.isArray(data.labels) ? data.labels.filter((item): item is string => typeof item === "string") : [],
    assigneeId: typeof data.assigneeId === "string" ? data.assigneeId : undefined,
    watchers: Array.isArray(data.watchers) ? data.watchers.filter((item): item is string => typeof item === "string") : [],
    orderInColumn: typeof data.orderInColumn === "number" ? data.orderInColumn : 0,
    reminderConfig: {
      email24h: Boolean((data.reminderConfig as Record<string, unknown> | undefined)?.email24h ?? defaultReminderConfig.email24h),
      email1h: Boolean((data.reminderConfig as Record<string, unknown> | undefined)?.email1h ?? defaultReminderConfig.email1h),
      dailyOverdue: Boolean((data.reminderConfig as Record<string, unknown> | undefined)?.dailyOverdue ?? defaultReminderConfig.dailyOverdue)
    },
    createdAt: toIso(data.createdAt as Parameters<typeof toIso>[0]),
    updatedAt: toIso(data.updatedAt as Parameters<typeof toIso>[0]),
    lastMovedAt: toIso(data.lastMovedAt as Parameters<typeof toIso>[0])
  };
}

export async function getProjectDashboard(ownerId: string): Promise<{
  kpis: DashboardKpis;
  projects: ProjectDoc[];
  metricsByProject: Record<string, ProjectMetrics>;
  importantTasks: ImportantTaskRow[];
}> {
  const [projectsSnap, tasksSnap, boardsSnap] = await Promise.all([
    adminDb.collection("projects").where("ownerId", "==", ownerId).where("status", "in", ["active", "archived"]).get(),
    adminDb.collection("tasks").get(),
    adminDb.collection("boards").get()
  ]);

  const projects = projectsSnap.docs.map((doc) => mapProject(doc.id, doc.data() as Record<string, unknown>));
  const boards = boardsSnap.docs.map((doc) => mapBoard(doc.id, doc.data() as Record<string, unknown>));

  const tasks = tasksSnap.docs
    .map((doc) => mapTask(doc.id, doc.data() as Record<string, unknown>))
    .filter((task) => projects.some((project) => project.id === task.projectId));

  const boardMap = new Map(boards.map((board) => [board.id, board]));
  const projectNameMap = new Map(projects.map((project) => [project.id, project.name]));

  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const metricsByProject: Record<string, ProjectMetrics> = {};

  projects.forEach((project) => {
    const board = boards.find((entry) => entry.projectId === project.id);
    const relatedTasks = tasks.filter((task) => task.projectId === project.id);
    const nextDue = relatedTasks
      .map((task) => task.dueDate)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

    const openTaskCount = board
      ? relatedTasks.filter((task) => !isColumnDone(task.statusColumnId, board.columns)).length
      : relatedTasks.length;

    metricsByProject[project.id] = {
      projectId: project.id,
      openTaskCount,
      overdueCount: relatedTasks.filter((task) => isTaskOverdue(task, now)).length,
      p1Count: relatedTasks.filter((task) => task.priority === "P1").length,
      nextDeadline: nextDue
    };
  });

  const importantTasks = tasks
    .filter((task) => Boolean(task.dueDate))
    .sort(compareImportantTasks)
    .slice(0, 8)
    .map((task) => ({
      task,
      projectName: projectNameMap.get(task.projectId) ?? "Project",
      isOverdue: isTaskOverdue(task, now)
    }));

  const dueTasks = tasks.filter((task) => task.dueDate).map((task) => ({ task, due: new Date(task.dueDate as string) }));
  const nextClosestDeadline = dueTasks
    .map((entry) => entry.due)
    .filter((due) => due.getTime() >= now.getTime())
    .sort((a, b) => a.getTime() - b.getTime())[0]
    ?.toISOString();

  const kpis: DashboardKpis = {
    totalProjects: projects.length,
    totalTasks: tasks.length,
    overdueTasks: tasks.filter((task) => isTaskOverdue(task, now)).length,
    dueThisWeek: dueTasks.filter((entry) => entry.due >= now && entry.due <= weekEnd).length,
    p1Tasks: tasks.filter((task) => task.priority === "P1").length,
    nextClosestDeadline
  };

  return {
    projects,
    metricsByProject,
    kpis,
    importantTasks
  };
}

export async function getProjectBoard(projectId: string, ownerId: string): Promise<{
  project: ProjectDoc | null;
  board: BoardDoc | null;
  tasks: TaskDoc[];
}> {
  const [projectSnap, boardSnap, taskSnap] = await Promise.all([
    adminDb.collection("projects").doc(projectId).get(),
    adminDb.collection("boards").where("projectId", "==", projectId).limit(1).get(),
    adminDb.collection("tasks").where("projectId", "==", projectId).get()
  ]);

  if (!projectSnap.exists) {
    return { project: null, board: null, tasks: [] };
  }

  const project = mapProject(projectSnap.id, projectSnap.data() as Record<string, unknown>);
  if (project.ownerId !== ownerId) {
    return { project: null, board: null, tasks: [] };
  }

  const board = boardSnap.empty ? null : mapBoard(boardSnap.docs[0].id, boardSnap.docs[0].data() as Record<string, unknown>);
  const tasks = taskSnap.docs.map((doc) => mapTask(doc.id, doc.data() as Record<string, unknown>)).sort((a, b) => {
    if (a.statusColumnId !== b.statusColumnId) return a.statusColumnId.localeCompare(b.statusColumnId);
    if (a.orderInColumn !== b.orderInColumn) return a.orderInColumn - b.orderInColumn;
    if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank;
    return a.title.localeCompare(b.title);
  });

  return {
    project,
    board,
    tasks
  };
}

export async function getTaskActivity(projectId: string, taskId: string): Promise<ActivityDoc[]> {
  const snap = await adminDb
    .collection("activity")
    .where("projectId", "==", projectId)
    .where("taskId", "==", taskId)
    .orderBy("createdAt", "desc")
    .limit(120)
    .get();

  return snap.docs.map((doc) => mapActivityDoc(doc.id, doc.data() as Record<string, unknown>));
}

function fallbackTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export async function getUserProjectSettings(userId: string): Promise<UserProjectSettings> {
  const snap = await adminDb.collection("users").doc(userId).collection("settings").doc("projectManagement").get();
  if (!snap.exists) {
    return {
      emailRemindersEnabled: true,
      calendarIcsToken: "",
      timezone: fallbackTimezone(),
      module: "project-management"
    };
  }

  const data = snap.data() ?? {};
  return {
    emailRemindersEnabled: data.emailRemindersEnabled !== false,
    calendarIcsToken: String(data.calendarIcsToken ?? ""),
    timezone: String(data.timezone ?? fallbackTimezone()),
    module: "project-management",
    updatedAt: toIso(data.updatedAt as Parameters<typeof toIso>[0])
  };
}

export function buildTaskPayload(input: {
  projectId: string;
  boardId: string;
  title: string;
  description?: string;
  priority?: TaskDoc["priority"];
  statusColumnId: string;
  dueDate?: string;
  labels?: string[];
  assigneeId?: string;
  watchers?: string[];
  orderInColumn: number;
}) {
  const priority = input.priority ?? "P3";
  return {
    projectId: input.projectId,
    boardId: input.boardId,
    title: input.title.trim(),
    description: (input.description ?? "").trim(),
    priority,
    priorityRank: priorityRankMap[priority],
    statusColumnId: input.statusColumnId,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    labels: (input.labels ?? []).map((item) => item.trim()).filter(Boolean),
    assigneeId: input.assigneeId?.trim() || null,
    watchers: (input.watchers ?? []).map((item) => item.trim()).filter(Boolean),
    orderInColumn: input.orderInColumn,
    reminderConfig: defaultReminderConfig
  };
}
