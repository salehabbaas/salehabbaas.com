import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { getProjectAccessRole, listAccessibleProjectIds } from "@/lib/admin/access";
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
  type TaskComment,
  type TaskDoc,
  type TaskLinkRelationType,
  type TaskSubtask,
  type TopGoal,
  type UserProjectSettings
} from "@/types/project-management";

const PROJECT_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeKeyToken(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function firstTwoChars(value: string) {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return cleaned.slice(0, 2);
}

export function buildProjectKeyBase(name: string) {
  const words = String(name)
    .trim()
    .split(/[\s_-]+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (!words.length) return "pr";
  if (words.length === 1) {
    const one = firstTwoChars(words[0]);
    return one.length >= 2 ? one : "pr";
  }

  const first = firstTwoChars(words[0]) || "pr";
  const remainder = words
    .slice(1)
    .map((word) => firstTwoChars(word).charAt(0))
    .filter(Boolean)
    .join("");
  const merged = remainder ? `${first}-${remainder}` : first;
  const normalized = normalizeKeyToken(merged).slice(0, 24);
  return normalized || "pr";
}

export function resolveProjectKey(input: {
  projectId: string;
  projectName?: string;
  projectKey?: string;
  slug?: string;
}) {
  const explicit = normalizeKeyToken(String(input.projectKey ?? input.slug ?? ""));
  if (explicit && PROJECT_KEY_PATTERN.test(explicit)) return explicit;

  const fromName = buildProjectKeyBase(String(input.projectName ?? ""));
  if (fromName && PROJECT_KEY_PATTERN.test(fromName)) return fromName;

  const idBased = normalizeKeyToken(String(input.projectId ?? ""));
  if (idBased && PROJECT_KEY_PATTERN.test(idBased) && idBased.length <= 32) return idBased;

  return "pr";
}

export async function allocateTaskIdentifier(input: {
  projectId: string;
  projectName?: string;
  projectKey?: string;
  slug?: string;
}): Promise<{
  taskId: string;
  taskKey: string;
  taskSequence: number;
  projectKey: string;
}> {
  const projectKey = resolveProjectKey(input);
  const counterRef = adminDb.collection("projectCounters").doc(input.projectId);
  const now = new Date();

  return adminDb.runTransaction(async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const counterData = (counterSnap.data() ?? {}) as Record<string, unknown>;
    let sequence =
      typeof counterData.taskSequence === "number" && Number.isFinite(counterData.taskSequence) ? Number(counterData.taskSequence) : 0;

    let taskId = "";
    const tasksCollection = adminDb.collection("tasks");
    for (let attempt = 0; attempt < 200; attempt += 1) {
      sequence += 1;
      const candidateId = `${projectKey}-${sequence}`;
      const candidateSnap = await tx.get(tasksCollection.doc(candidateId));
      if (candidateSnap.exists) continue;
      taskId = candidateId;
      break;
    }

    if (!taskId) {
      throw new Error("Unable to allocate a task identifier.");
    }

    tx.set(
      counterRef,
      {
        projectId: input.projectId,
        projectKey,
        taskSequence: sequence,
        updatedAt: now,
        ...(counterSnap.exists ? {} : { createdAt: now })
      },
      { merge: true }
    );

    return {
      taskId,
      taskKey: `${projectKey}#${sequence}`,
      taskSequence: sequence,
      projectKey
    };
  });
}

function mapProject(id: string, data: Record<string, unknown>): ProjectDoc {
  const projectKey = resolveProjectKey({
    projectId: id,
    projectName: String(data.name ?? ""),
    projectKey: typeof data.projectKey === "string" ? data.projectKey : undefined,
    slug: typeof data.slug === "string" ? data.slug : undefined
  });
  return {
    id,
    projectKey,
    slug: typeof data.slug === "string" && data.slug.trim() ? data.slug.trim() : projectKey,
    name: String(data.name ?? ""),
    description: String(data.description ?? ""),
    status: data.status === "archived" ? "archived" : "active",
    ownerId: String(data.ownerId ?? ""),
    createdAt: toIso(data.createdAt as Parameters<typeof toIso>[0]),
    updatedAt: toIso(data.updatedAt as Parameters<typeof toIso>[0])
  };
}

function isPmProjectData(data: Record<string, unknown>) {
  return String(data.module ?? "") === "project-management";
}

function mapBoard(id: string, data: Record<string, unknown>): BoardDoc {
  const columns = Array.isArray(data.columns)
    ? data.columns
        .map((item) => ({
          id: String((item as Record<string, unknown>).id ?? ""),
          name: String((item as Record<string, unknown>).name ?? ""),
          order: Number((item as Record<string, unknown>).order ?? 0)
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
  const taskSequence =
    typeof data.taskSequence === "number" && Number.isFinite(data.taskSequence) ? Number(data.taskSequence) : undefined;
  const taskKey =
    typeof data.taskKey === "string" && data.taskKey.trim()
      ? data.taskKey
      : taskSequence && PROJECT_KEY_PATTERN.test(String(data.projectId ?? ""))
        ? `${String(data.projectId)}#${taskSequence}`
        : undefined;
  const normalizeLinkRelation = (value: string): TaskLinkRelationType => {
    if (value === "blocked_by") return "blockedBy";
    if (value === "related_to") return "related";
    if (value === "duplicated_by") return "duplicatedBy";
    if (value === "blocks" || value === "blockedBy" || value === "related" || value === "duplicate" || value === "duplicatedBy") {
      return value;
    }
    return "related";
  };
  const subtasks: TaskSubtask[] = [];
  if (Array.isArray(data.subtasks)) {
    data.subtasks.forEach((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      const subtaskId = typeof item.id === "string" ? item.id.trim() : "";
      const title = typeof item.title === "string" ? item.title.trim() : "";
      if (!subtaskId || !title) return;
      const createdAt = toIso(item.createdAt as Parameters<typeof toIso>[0]);
      const completedAt = toIso(item.completedAt as Parameters<typeof toIso>[0]);
      const statusRaw = typeof item.status === "string" ? item.status : "";
      const status = statusRaw === "done" || statusRaw === "in_progress" || statusRaw === "todo" ? statusRaw : undefined;
      const priorityRaw = typeof item.priority === "string" ? item.priority : "";
      const subtaskPriority =
        priorityRaw === "P1" || priorityRaw === "P2" || priorityRaw === "P3" || priorityRaw === "P4" ? priorityRaw : undefined;
      subtasks.push({
        id: subtaskId,
        title,
        completed: item.completed === true,
        ...(typeof item.assigneeId === "string" && item.assigneeId ? { assigneeId: item.assigneeId } : {}),
        ...(status ? { status } : {}),
        ...(subtaskPriority ? { priority: subtaskPriority } : {}),
        ...(createdAt ? { createdAt } : {}),
        ...(completedAt ? { completedAt } : {})
      });
    });
  }

  const comments: TaskComment[] = [];
  if (Array.isArray(data.comments)) {
    data.comments.forEach((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      const commentId = typeof item.id === "string" ? item.id.trim() : "";
      const body = typeof item.body === "string" ? item.body.trim() : "";
      if (!commentId || !body) return;
      const createdAt = toIso(item.createdAt as Parameters<typeof toIso>[0]);
      const updatedAt = toIso(item.updatedAt as Parameters<typeof toIso>[0]);
      const mentionUids = Array.isArray(item.mentionUids)
        ? item.mentionUids.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
        : [];
      comments.push({
        id: commentId,
        authorId: typeof item.authorId === "string" ? item.authorId : "",
        authorName: typeof item.authorName === "string" ? item.authorName : "Admin User",
        body,
        ...(mentionUids.length ? { mentionUids } : {}),
        ...(createdAt ? { createdAt } : {}),
        ...(updatedAt ? { updatedAt } : {})
      });
    });
  }

  const links = Array.isArray(data.links)
    ? data.links
        .map((row) => {
          const item = (row ?? {}) as Record<string, unknown>;
          const linkId = typeof item.id === "string" ? item.id.trim() : "";
          const relationType = typeof item.relationType === "string" ? item.relationType.trim() : "";
          const targetTaskId = typeof item.targetTaskId === "string" ? item.targetTaskId.trim() : "";
          if (!linkId || !relationType || !targetTaskId) return null;
          const createdAt = toIso(item.createdAt as Parameters<typeof toIso>[0]);
          return {
            id: linkId,
            relationType: normalizeLinkRelation(relationType),
            targetTaskId,
            createdBy: typeof item.createdBy === "string" ? item.createdBy : "",
            ...(createdAt ? { createdAt } : {})
          };
        })
        .filter((item): item is NonNullable<TaskDoc["links"]>[number] => Boolean(item))
    : [];

  return {
    id,
    taskKey,
    taskSequence,
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
    subtasks,
    comments,
    links,
    startDate: toIso(data.startDate as Parameters<typeof toIso>[0]),
    completedAt: toIso(data.completedAt as Parameters<typeof toIso>[0]),
    category: typeof data.category === "string" ? data.category : undefined,
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
  const accessibleProjectIds = await listAccessibleProjectIds(ownerId);
  if (!accessibleProjectIds.size) {
    return {
      kpis: {
        totalProjects: 0,
        totalTasks: 0,
        overdueTasks: 0,
        dueThisWeek: 0,
        p1Tasks: 0
      },
      projects: [],
      metricsByProject: {},
      importantTasks: []
    };
  }

  const [projectSnaps, tasksSnap, boardsSnap] = await Promise.all([
    Promise.all([...accessibleProjectIds].map((projectId) => adminDb.collection("projects").doc(projectId).get())),
    adminDb.collection("tasks").get(),
    adminDb.collection("boards").get()
  ]);

  const projects = projectSnaps
    .filter((snap) => snap.exists)
    .map((snap) => ({ id: snap.id, data: (snap.data() ?? {}) as Record<string, unknown> }))
    .filter((row) => isPmProjectData(row.data))
    .map((row) => mapProject(row.id, row.data));
  const boards = boardsSnap.docs.map((doc) => mapBoard(doc.id, doc.data() as Record<string, unknown>));

  const tasks = tasksSnap.docs
    .map((doc) => mapTask(doc.id, doc.data() as Record<string, unknown>))
    .filter((task) => projects.some((project) => project.id === task.projectId));

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
  accessRole: "owner" | "viewer" | "editor" | null;
}> {
  const [projectSnap, boardSnap, taskSnap] = await Promise.all([
    adminDb.collection("projects").doc(projectId).get(),
    adminDb.collection("boards").where("projectId", "==", projectId).limit(1).get(),
    adminDb.collection("tasks").where("projectId", "==", projectId).get()
  ]);

  if (!projectSnap.exists) {
    return { project: null, board: null, tasks: [], accessRole: null };
  }

  const raw = (projectSnap.data() ?? {}) as Record<string, unknown>;
  if (!isPmProjectData(raw)) {
    return { project: null, board: null, tasks: [], accessRole: null };
  }

  const project = mapProject(projectSnap.id, raw);
  const accessRole = await getProjectAccessRole(ownerId, projectId);
  if (!accessRole) {
    return { project: null, board: null, tasks: [], accessRole: null };
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
    tasks,
    accessRole
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

function mapTopGoals(value: unknown): TopGoal[] {
  if (!Array.isArray(value)) return [];
  const goals: TopGoal[] = [];
  value.forEach((item, index) => {
    const record = (item ?? {}) as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    if (!title) return;

    const description = typeof record.description === "string" ? record.description.trim() : "";
    const tags = Array.isArray(record.tags)
      ? record.tags
          .filter((tag): tag is string => typeof tag === "string")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];

    goals.push({
      id: typeof record.id === "string" && record.id.trim() ? record.id.trim() : `goal-${index + 1}`,
      title,
      description: description || undefined,
      tags,
      projectId: typeof record.projectId === "string" && record.projectId.trim() ? record.projectId.trim() : undefined,
      deadline: toIso(record.deadline as Parameters<typeof toIso>[0]),
      completed: record.completed === true,
      completedAt: toIso(record.completedAt as Parameters<typeof toIso>[0]),
      createdAt: toIso(record.createdAt as Parameters<typeof toIso>[0]) ?? new Date().toISOString()
    });
  });
  return goals;
}

export async function getUserProjectSettings(userId: string): Promise<UserProjectSettings> {
  const snap = await adminDb.collection("users").doc(userId).collection("settings").doc("projectManagement").get();
  if (!snap.exists) {
    return {
      emailRemindersEnabled: true,
      calendarIcsToken: "",
      timezone: fallbackTimezone(),
      topGoals: [],
      module: "project-management"
    };
  }

  const data = snap.data() ?? {};
  return {
    emailRemindersEnabled: data.emailRemindersEnabled !== false,
    calendarIcsToken: String(data.calendarIcsToken ?? ""),
    timezone: String(data.timezone ?? fallbackTimezone()),
    topGoals: mapTopGoals(data.topGoals),
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
  taskKey?: string;
  taskSequence?: number;
  orderInColumn: number;
}) {
  const priority = input.priority ?? "P3";
  return {
    projectId: input.projectId,
    boardId: input.boardId,
    taskKey: typeof input.taskKey === "string" && input.taskKey.trim() ? input.taskKey.trim() : null,
    taskSequence: typeof input.taskSequence === "number" ? input.taskSequence : null,
    title: input.title.trim(),
    description: (input.description ?? "").trim(),
    priority,
    priorityRank: priorityRankMap[priority],
    statusColumnId: input.statusColumnId,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    labels: (input.labels ?? []).map((item) => item.trim()).filter(Boolean),
    assigneeId: input.assigneeId?.trim() || null,
    watchers: (input.watchers ?? []).map((item) => item.trim()).filter(Boolean),
    subtasks: [],
    comments: [],
    links: [],
    startDate: null,
    completedAt: null,
    category: null,
    orderInColumn: input.orderInColumn,
    reminderConfig: defaultReminderConfig
  };
}
