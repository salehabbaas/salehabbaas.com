import "server-only";

import { randomUUID } from "node:crypto";

import type { DecodedIdToken } from "firebase-admin/auth";
import { GoogleGenAI, type Content } from "@google/genai";
import { z } from "zod";

import { canWriteProject } from "@/lib/admin/access";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import type { AdminRequestContext } from "@/lib/admin/request-context";
import { adminDb } from "@/lib/firebase/admin";
import { wrapBrandedEmailHtml } from "@/lib/email/template-render";
import { getConfiguredEmailAdapter } from "@/lib/email/service";
import { getRuntimeAdminSettings } from "@/lib/firestore/admin-settings";
import { allocateTaskIdentifier, buildTaskPayload, getProjectBoard, getProjectDashboard, getUserProjectSettings } from "@/lib/firestore/project-management";
import { normalizeReminderSettings, normalizeUserNotificationPreferences } from "@/lib/notifications/settings";
import { countDeliverableDevices, loadEnabledPushDevices, sendBrowserPushToUser } from "@/lib/notifications/server-push";
import { isColumnDone } from "@/lib/project-management/utils";
import { parseAllowedTelegramChatIds, resolveTelegramBotToken, sendTelegramMessage } from "@/lib/agent/telegram";
import { priorityRankMap, type TopGoal } from "@/types/project-management";

export const adminAgentMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000)
});

export const adminAgentActionSchema = z.object({
  tool: z.string().trim().min(1).max(64),
  args: z.record(z.unknown()).optional().default({}),
  reason: z.string().trim().max(280).optional()
});

export type AdminAgentAction = z.infer<typeof adminAgentActionSchema>;
export type AdminAgentMessage = z.infer<typeof adminAgentMessageSchema>;

const plannerSchema = z.object({
  reply: z.string().trim().min(1).max(4000),
  actions: z.array(adminAgentActionSchema).max(6).default([])
});

const projectsOverviewArgsSchema = z
  .object({
    includeArchived: z.boolean().optional()
  })
  .default({});

const projectBoardArgsSchema = z
  .object({
    projectId: z.string().trim().min(1).optional(),
    projectName: z.string().trim().min(2).max(180).optional(),
    includeDone: z.boolean().optional(),
    limit: z.number().int().min(1).max(120).optional()
  })
  .refine((value) => Boolean(value.projectId || value.projectName), "Provide projectId or projectName")
  .default({});

const createTaskArgsSchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  projectName: z.string().trim().min(2).max(180).optional(),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(5000).optional(),
  priority: z.enum(["P1", "P2", "P3", "P4"]).optional(),
  statusColumnId: z.string().trim().min(1).optional(),
  dueDate: z.string().datetime().optional(),
  labels: z.array(z.string().trim().min(1).max(64)).max(24).optional()
}).refine((value) => Boolean(value.projectId || value.projectName), "Provide projectId or projectName");

const moveTaskArgsSchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  projectName: z.string().trim().min(2).max(180).optional(),
  taskId: z.string().trim().min(1),
  statusColumnId: z.string().trim().min(1)
}).refine((value) => Boolean(value.projectId || value.projectName), "Provide projectId or projectName");

const updateTaskArgsSchema = z
  .object({
    taskId: z.string().trim().min(1),
    projectId: z.string().trim().min(1).optional(),
    projectName: z.string().trim().min(2).max(180).optional(),
    title: z.string().trim().min(2).max(180).optional(),
    description: z.string().trim().max(5000).optional(),
    priority: z.enum(["P1", "P2", "P3", "P4"]).optional(),
    statusColumnId: z.string().trim().min(1).optional(),
    dueDate: z.string().datetime().nullable().optional(),
    labels: z.array(z.string().trim().min(1).max(64)).max(24).optional(),
    reminderConfig: z
      .object({
        email24h: z.boolean().optional(),
        email1h: z.boolean().optional(),
        dailyOverdue: z.boolean().optional()
      })
      .optional()
  })
  .refine(
    (value) =>
      [
        value.title,
        value.description,
        value.priority,
        value.statusColumnId,
        value.dueDate,
        value.labels,
        value.reminderConfig
      ].some((field) => field !== undefined),
    "Provide at least one field to update."
  );

const getTopGoalsArgsSchema = z
  .object({
    includeCompleted: z.boolean().optional(),
    limit: z.number().int().min(1).max(60).optional()
  })
  .default({});

const createTopGoalArgsSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(2000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  projectId: z.string().trim().min(1).max(160).optional(),
  projectName: z.string().trim().min(2).max(180).optional(),
  deadline: z.string().datetime().optional(),
  addToTop: z.boolean().optional()
});

const updateTopGoalArgsSchema = z
  .object({
    goalId: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(180).optional(),
    description: z.string().trim().max(2000).optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    projectId: z.string().trim().min(1).max(160).nullable().optional(),
    projectName: z.string().trim().min(2).max(180).optional(),
    deadline: z.string().datetime().nullable().optional(),
    completed: z.boolean().optional()
  })
  .refine(
    (value) =>
      [
        value.title,
        value.description,
        value.tags,
        value.projectId,
        value.projectName,
        value.deadline,
        value.completed
      ].some((field) => field !== undefined),
    "Provide at least one field to update."
  );

const telegramArgsSchema = z.object({
  chatId: z.string().trim().min(1).optional(),
  message: z.string().trim().min(1).max(3800)
});

const summarizeAuditArgsSchema = z
  .object({
    hours: z.number().int().min(1).max(168).optional(),
    limit: z.number().int().min(5).max(80).optional()
  })
  .default({});

const notificationsFeedArgsSchema = z
  .object({
    limit: z.number().int().min(1).max(80).optional(),
    state: z.enum(["unread", "read", "dismissed"]).optional()
  })
  .default({});

const createReminderNotificationArgsSchema = z.object({
  title: z.string().trim().min(2).max(180),
  body: z.string().trim().max(2000).optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  module: z.enum(["tasks", "bookings", "linkedin", "jobs", "goals", "audit", "system"]).optional(),
  ctaUrl: z.string().trim().max(200).optional(),
  sendPush: z.boolean().optional()
});

const sendEmailMessageArgsSchema = z
  .object({
    to: z.string().trim().email(),
    subject: z.string().trim().min(2).max(220),
    text: z.string().trim().max(12000).optional(),
    html: z.string().trim().max(20000).optional(),
    module: z.string().trim().max(80).optional(),
    trigger: z.string().trim().max(120).optional()
  })
  .refine((value) => Boolean(value.text || value.html), "Provide text or html.");

const toolCatalog: Array<{ tool: string; description: string; requiresConfirmation: boolean }> = [
  {
    tool: "get_projects_overview",
    description: "Read-only. Returns projects and high-level KPIs for the owner.",
    requiresConfirmation: false
  },
  {
    tool: "get_project_board",
    description: "Read-only. Returns board columns and task snapshot for one project (projectId or projectName).",
    requiresConfirmation: false
  },
  {
    tool: "get_top_goals",
    description: "Read-only. Returns top goals from project settings.",
    requiresConfirmation: false
  },
  {
    tool: "get_notifications_feed",
    description: "Read-only. Returns recent notification feed for this admin user.",
    requiresConfirmation: false
  },
  {
    tool: "get_reminder_diagnostics",
    description: "Read-only. Returns reminder blockers and push readiness diagnostics.",
    requiresConfirmation: false
  },
  {
    tool: "create_project_task",
    description: "Write. Creates a task in project management (projectId or projectName).",
    requiresConfirmation: true
  },
  {
    tool: "update_project_task",
    description: "Write. Updates an existing project task fields.",
    requiresConfirmation: true
  },
  {
    tool: "move_project_task",
    description: "Write. Moves a task to another board column (projectId or projectName).",
    requiresConfirmation: true
  },
  {
    tool: "create_top_goal",
    description: "Write. Creates a top goal in project settings.",
    requiresConfirmation: true
  },
  {
    tool: "update_top_goal",
    description: "Write. Updates a top goal in project settings.",
    requiresConfirmation: true
  },
  {
    tool: "create_reminder_notification",
    description: "Write. Creates a reminder notification and can optionally send push.",
    requiresConfirmation: true
  },
  {
    tool: "send_email_message",
    description: "Write. Sends an email using configured admin email provider.",
    requiresConfirmation: true
  },
  {
    tool: "send_telegram_message",
    description: "Write. Sends a Telegram message using configured bot token.",
    requiresConfirmation: true
  },
  {
    tool: "summarize_recent_audit",
    description: "Read-only. Summarizes recent admin audit activity.",
    requiresConfirmation: false
  }
];

type RuntimeSettings = Awaited<ReturnType<typeof getRuntimeAdminSettings>>;

type PlannerOutput = {
  reply: string;
  actions: AdminAgentAction[];
  model: string;
};

type AgentExecutionContext = {
  actorUid: string;
  actorToken: DecodedIdToken | null;
  requestContext?: Partial<AdminRequestContext>;
  runtime: RuntimeSettings;
  source: "panel" | "telegram";
};

type ToolResult = {
  tool: string;
  ok: boolean;
  message: string;
  data?: unknown;
};

type AgentProjectOption = {
  id: string;
  name: string;
  status: string;
  openTaskCount: number;
  overdueCount: number;
  p1Count: number;
};

export type AdminAgentRunResult = {
  reply: string;
  model: string;
  actions: Array<AdminAgentAction & { requiresConfirmation: boolean; knownTool: boolean }>;
  executed: boolean;
  results: ToolResult[];
  projectSelectionRequired?: boolean;
  projectOptions?: AgentProjectOption[];
};

function toContents(messages: AdminAgentMessage[]): Content[] {
  return messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }]
  }));
}

function requiresConfirmation(tool: string) {
  const entry = toolCatalog.find((item) => item.tool === tool);
  return entry?.requiresConfirmation ?? true;
}

function isKnownTool(tool: string) {
  return toolCatalog.some((item) => item.tool === tool);
}

function isWriteTool(tool: string) {
  return requiresConfirmation(tool);
}

function toolCatalogText() {
  return toolCatalog
    .map((item) => `- ${item.tool}: ${item.description} (requiresConfirmation=${item.requiresConfirmation})`)
    .join("\n");
}

function buildSystemInstruction(input: { source: "panel" | "telegram" }) {
  return [
    "You are Saleh's internal SA Panel agent.",
    "You help with project operations, goals, reminders, notifications, and email actions.",
    "Return JSON only. No markdown. No code fences.",
    "Output schema:",
    '{"reply":"string","actions":[{"tool":"string","args":{},"reason":"optional string"}]}',
    "Rules:",
    "- Keep reply concise and action-oriented.",
    "- Use actions when user asks to create/update/retrieve/send and enough data exists.",
    "- Prefer direct write tools for explicit write requests; do not default to get_projects_overview unless needed to resolve project identifiers.",
    "- Never invent IDs (projectId/taskId/statusColumnId/chatId/goalId).",
    "- projectName is accepted for project tools when projectId is not provided.",
    "- For write actions, only propose when the user explicitly asks to change data or send messages.",
    `- Channel source is ${input.source}.`,
    "Available tools:",
    toolCatalogText()
  ].join("\n");
}

function tryParsePlannerJson(text: string) {
  const trimmed = text.trim();

  const direct = plannerSchema.safeParse(parseJsonSafe(trimmed));
  if (direct.success) return direct.data;

  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/```\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    const fenced = plannerSchema.safeParse(parseJsonSafe(fencedMatch[1].trim()));
    if (fenced.success) return fenced.data;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const sliced = plannerSchema.safeParse(parseJsonSafe(trimmed.slice(firstBrace, lastBrace + 1)));
    if (sliced.success) return sliced.data;
  }

  return null;
}

function parseJsonSafe(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function toDate(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    const parsed = value.toDate();
    return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
  }
  return null;
}

async function assertOwnedProject(projectId: string, ownerUid: string) {
  const projectSnap = await adminDb.collection("projects").doc(projectId).get();
  if (!projectSnap.exists) {
    throw new Error("Project not found");
  }

  const data = projectSnap.data() ?? {};
  const ownerId = String(data.ownerId ?? "");
  if (!ownerId || ownerId !== ownerUid) {
    throw new Error("Forbidden: project ownership mismatch");
  }

  return {
    id: projectSnap.id,
    name: String(data.name ?? "Untitled project")
  };
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

async function resolveProjectForArgs(input: {
  ownerUid: string;
  projectId?: string;
  projectName?: string;
}) {
  if (input.projectId?.trim()) {
    return assertOwnedProject(input.projectId.trim(), input.ownerUid);
  }

  const name = input.projectName?.trim();
  if (!name) {
    throw new Error("Provide projectId or projectName.");
  }

  const dashboard = await getProjectDashboard(input.ownerUid);
  const target = dashboard.projects.find((project) => normalizeKey(project.name) === normalizeKey(name));
  if (!target) {
    throw new Error(`Project not found for name: ${name}`);
  }

  return { id: target.id, name: target.name };
}

function sanitizeGoalTags(tags?: string[]) {
  return [...new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))];
}

async function loadReminderContextForUser(uid: string) {
  const [settingsSnap, userSettingsSnap, enabledDevices] = await Promise.all([
    adminDb.collection("adminSettings").doc("reminders").get(),
    adminDb.collection("users").doc(uid).collection("settings").doc("projectManagement").get(),
    loadEnabledPushDevices(uid)
  ]);

  const settingsRaw = settingsSnap.data() ?? {};
  const userSettingsRaw = (userSettingsSnap.data() ?? {}) as Record<string, unknown>;
  const settings = normalizeReminderSettings(settingsRaw, process.env.NOTIFICATION_PRIMARY_ADMIN_UID || uid);
  const timezone = typeof userSettingsRaw.timezone === "string" ? userSettingsRaw.timezone : settings.channels.timezone;
  const userPreferences = normalizeUserNotificationPreferences(userSettingsRaw.notificationPreferences, timezone);
  return { settings, userPreferences, enabledDevices };
}

function datePartsInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit"
  }).formatToParts(date);

  const map = new Map<string, string>();
  for (const part of parts) {
    if (part.type !== "literal") map.set(part.type, part.value);
  }

  return {
    hour: Number(map.get("hour") ?? 0),
    minute: Number(map.get("minute") ?? 0)
  };
}

function parseHm(value: string) {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function isQuietHoursNow(input: { timezone: string; startHm: string; endHm: string; now: Date }) {
  const start = parseHm(input.startHm);
  const end = parseHm(input.endHm);
  if (start === null || end === null) return false;

  const local = datePartsInTimezone(input.now, input.timezone || "UTC");
  const current = local.hour * 60 + local.minute;

  if (start === end) return false;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

function toStoredGoal(goal: TopGoal) {
  return {
    id: goal.id,
    title: goal.title,
    description: goal.description?.trim() || "",
    tags: sanitizeGoalTags(goal.tags),
    projectId: goal.projectId?.trim() || null,
    deadline: goal.deadline ? new Date(goal.deadline) : null,
    completed: goal.completed === true,
    completedAt: goal.completedAt ? new Date(goal.completedAt) : null,
    createdAt: goal.createdAt ? new Date(goal.createdAt) : new Date()
  };
}

async function persistTopGoals(input: { uid: string; baseSettings: Awaited<ReturnType<typeof getUserProjectSettings>>; goals: TopGoal[] }) {
  const settingsRef = adminDb.collection("users").doc(input.uid).collection("settings").doc("projectManagement");
  await settingsRef.set(
    {
      emailRemindersEnabled: input.baseSettings.emailRemindersEnabled,
      timezone: input.baseSettings.timezone,
      calendarIcsToken: input.baseSettings.calendarIcsToken,
      module: "project-management",
      topGoals: input.goals.map(toStoredGoal),
      updatedAt: new Date()
    },
    { merge: true }
  );
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function planWithModel(input: {
  runtime: RuntimeSettings;
  messages: AdminAgentMessage[];
  source: "panel" | "telegram";
}): Promise<PlannerOutput> {
  const apiKey =
    input.runtime.secrets.geminiApiKey ||
    input.runtime.secrets.googleApiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("Agent is not configured. Missing GEMINI_API_KEY (or GOOGLE_API_KEY).");
  }

  const model = input.runtime.integrations.geminiTextModel || input.runtime.integrations.geminiModel || process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: toContents(input.messages),
    config: {
      systemInstruction: buildSystemInstruction({ source: input.source }),
      temperature: 0.15,
      maxOutputTokens: 900
    }
  });

  const text = response.text?.trim() || "";
  if (!text) {
    throw new Error("Model returned an empty response.");
  }

  const parsed = tryParsePlannerJson(text);
  if (!parsed) {
    return {
      reply: text,
      actions: [],
      model: response.modelVersion || model
    };
  }

  return {
    reply: parsed.reply,
    actions: parsed.actions,
    model: response.modelVersion || model
  };
}

async function executeToolCall(call: AdminAgentAction, context: AgentExecutionContext): Promise<ToolResult> {
  if (!isKnownTool(call.tool)) {
    return {
      tool: call.tool,
      ok: false,
      message: `Unknown tool: ${call.tool}`
    };
  }

  try {
    if (call.tool === "get_projects_overview") {
      const args = projectsOverviewArgsSchema.parse(call.args);
      const dashboard = await getProjectDashboard(context.actorUid);
      const projects = args.includeArchived
        ? dashboard.projects
        : dashboard.projects.filter((project) => project.status !== "archived");

      return {
        tool: call.tool,
        ok: true,
        message: `Loaded ${projects.length} project(s).`,
        data: {
          kpis: dashboard.kpis,
          projects: projects.map((project) => ({
            id: project.id,
            name: project.name,
            status: project.status,
            metrics: dashboard.metricsByProject[project.id] ?? null
          }))
        }
      };
    }

    if (call.tool === "get_project_board") {
      const args = projectBoardArgsSchema.parse(call.args);
      const project = await resolveProjectForArgs({
        ownerUid: context.actorUid,
        projectId: args.projectId,
        projectName: args.projectName
      });
      const boardState = await getProjectBoard(project.id, context.actorUid);

      if (!boardState.project || !boardState.board) {
        throw new Error("Project board not found or not accessible.");
      }

      const limit = args.limit ?? 40;
      const tasks = boardState.tasks
        .filter((task) => (args.includeDone ? true : !isColumnDone(task.statusColumnId, boardState.board?.columns ?? [])))
        .slice(0, limit)
        .map((task) => ({
          id: task.id,
          title: task.title,
          priority: task.priority,
          statusColumnId: task.statusColumnId,
          dueDate: task.dueDate || "",
          labels: task.labels
        }));

      return {
        tool: call.tool,
        ok: true,
        message: `Loaded board snapshot for ${boardState.project.name}.`,
        data: {
          project: {
            id: boardState.project.id,
            name: boardState.project.name,
            status: boardState.project.status
          },
          board: {
            id: boardState.board.id,
            name: boardState.board.name,
            columns: boardState.board.columns
          },
          tasks
        }
      };
    }

    if (call.tool === "create_project_task") {
      const args = createTaskArgsSchema.parse(call.args);
      const project = await resolveProjectForArgs({
        ownerUid: context.actorUid,
        projectId: args.projectId,
        projectName: args.projectName
      });

      const boardSnap = await adminDb.collection("boards").where("projectId", "==", project.id).limit(1).get();
      if (boardSnap.empty) {
        throw new Error("Project board is missing.");
      }

      const boardDoc = boardSnap.docs[0];
      const boardData = boardDoc.data() as Record<string, unknown>;
      const columns = Array.isArray(boardData.columns) ? boardData.columns : [];
      const columnIds = columns
        .map((item) => String((item as Record<string, unknown>).id ?? ""))
        .filter(Boolean);

      const statusColumnId = args.statusColumnId || columnIds[0] || "todo";
      if (!columnIds.includes(statusColumnId)) {
        throw new Error(`Invalid statusColumnId: ${statusColumnId}`);
      }

      const existing = await adminDb
        .collection("tasks")
        .where("projectId", "==", project.id)
        .where("statusColumnId", "==", statusColumnId)
        .orderBy("orderInColumn", "desc")
        .limit(1)
        .get();

      const nextOrder = existing.empty ? 0 : Number(existing.docs[0].data().orderInColumn ?? 0) + 1;
      const now = new Date();
      const taskIdentity = await allocateTaskIdentifier({
        projectId: project.id,
        projectName: project.name
      });
      const taskRef = adminDb.collection("tasks").doc(taskIdentity.taskId);

      await taskRef.set({
        ...buildTaskPayload({
          projectId: project.id,
          boardId: boardDoc.id,
          taskKey: taskIdentity.taskKey,
          taskSequence: taskIdentity.taskSequence,
          title: args.title,
          description: args.description,
          priority: args.priority,
          statusColumnId,
          dueDate: args.dueDate,
          labels: args.labels,
          orderInColumn: nextOrder
        }),
        createdAt: now,
        updatedAt: now,
        lastMovedAt: now
      });

      await adminDb.collection("activity").add({
        projectId: project.id,
        taskId: taskRef.id,
        actorId: context.actorUid,
        action: "task_created",
        from: "",
        to: statusColumnId,
        createdAt: now
      });

      await writeAdminAuditLog(
        {
          module: "agent",
          action: "create_project_task",
          targetType: "task",
          targetId: taskRef.id,
          summary: `Agent created task ${args.title}`,
          metadata: {
            projectId: project.id,
            projectName: project.name,
            statusColumnId,
            taskKey: taskIdentity.taskKey,
            source: context.source
          }
        },
        context.actorToken,
        context.requestContext
      );

      return {
        tool: call.tool,
        ok: true,
        message: `Created task \"${args.title}\" in ${project.name}.`,
        data: {
          projectId: project.id,
          taskId: taskRef.id,
          taskKey: taskIdentity.taskKey,
          statusColumnId
        }
      };
    }

    if (call.tool === "move_project_task") {
      const args = moveTaskArgsSchema.parse(call.args);
      const project = await resolveProjectForArgs({
        ownerUid: context.actorUid,
        projectId: args.projectId,
        projectName: args.projectName
      });

      const boardSnap = await adminDb.collection("boards").where("projectId", "==", project.id).limit(1).get();
      if (boardSnap.empty) {
        throw new Error("Project board is missing.");
      }

      const boardData = boardSnap.docs[0].data() as Record<string, unknown>;
      const columns = Array.isArray(boardData.columns) ? boardData.columns : [];
      const validColumnIds = columns
        .map((item) => String((item as Record<string, unknown>).id ?? ""))
        .filter(Boolean);

      if (!validColumnIds.includes(args.statusColumnId)) {
        throw new Error(`Invalid status column: ${args.statusColumnId}`);
      }

      const taskRef = adminDb.collection("tasks").doc(args.taskId);
      const taskSnap = await taskRef.get();
      if (!taskSnap.exists) {
        throw new Error("Task not found.");
      }

      const taskData = taskSnap.data() ?? {};
      if (String(taskData.projectId ?? "") !== project.id) {
        throw new Error("Task does not belong to this project.");
      }

      const nextOrderSnap = await adminDb
        .collection("tasks")
        .where("projectId", "==", project.id)
        .where("statusColumnId", "==", args.statusColumnId)
        .orderBy("orderInColumn", "desc")
        .limit(1)
        .get();

      const nextOrder = nextOrderSnap.empty ? 0 : Number(nextOrderSnap.docs[0].data().orderInColumn ?? 0) + 1;
      const previousColumn = String(taskData.statusColumnId ?? "");
      const now = new Date();

      await taskRef.set(
        {
          statusColumnId: args.statusColumnId,
          orderInColumn: nextOrder,
          updatedAt: now,
          lastMovedAt: now
        },
        { merge: true }
      );

      await adminDb.collection("activity").add({
        projectId: project.id,
        taskId: args.taskId,
        actorId: context.actorUid,
        action: "task_moved",
        from: previousColumn,
        to: args.statusColumnId,
        createdAt: now
      });

      await writeAdminAuditLog(
        {
          module: "agent",
          action: "move_project_task",
          targetType: "task",
          targetId: args.taskId,
          summary: "Agent moved task",
          metadata: {
            projectId: project.id,
            projectName: project.name,
            fromColumn: previousColumn,
            toColumn: args.statusColumnId,
            source: context.source
          }
        },
        context.actorToken,
        context.requestContext
      );

      return {
        tool: call.tool,
        ok: true,
        message: `Moved task to ${args.statusColumnId} in ${project.name}.`,
        data: {
          taskId: args.taskId,
          projectId: project.id,
          fromColumnId: previousColumn,
          toColumnId: args.statusColumnId
        }
      };
    }

    if (call.tool === "update_project_task") {
      const args = updateTaskArgsSchema.parse(call.args);
      const taskRef = adminDb.collection("tasks").doc(args.taskId);
      const taskSnap = await taskRef.get();
      if (!taskSnap.exists) throw new Error("Task not found.");

      const taskData = taskSnap.data() ?? {};
      const resolvedProject = await resolveProjectForArgs({
        ownerUid: context.actorUid,
        projectId: args.projectId ?? String(taskData.projectId ?? ""),
        projectName: args.projectName
      });

      if (String(taskData.projectId ?? "") !== resolvedProject.id) {
        throw new Error("Task does not belong to this project.");
      }

      const canWrite = await canWriteProject(context.actorUid, resolvedProject.id);
      if (!canWrite) throw new Error("Forbidden: write access denied for project.");

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      const changedFields: string[] = [];

      if (typeof args.title === "string") {
        updates.title = args.title;
        changedFields.push("title");
      }
      if (typeof args.description === "string") {
        updates.description = args.description;
        changedFields.push("description");
      }
      if (args.priority) {
        updates.priority = args.priority;
        updates.priorityRank = priorityRankMap[args.priority];
        changedFields.push("priority", "priorityRank");
      }
      if (typeof args.statusColumnId === "string") {
        updates.statusColumnId = args.statusColumnId;
        updates.lastMovedAt = new Date();
        changedFields.push("statusColumnId", "lastMovedAt");
      }
      if (args.dueDate !== undefined) {
        updates.dueDate = args.dueDate ? new Date(args.dueDate) : null;
        changedFields.push("dueDate");
      }
      if (args.labels) {
        updates.labels = args.labels;
        changedFields.push("labels");
      }
      if (args.reminderConfig) {
        updates.reminderConfig = {
          ...(taskData.reminderConfig as Record<string, unknown> | undefined),
          ...args.reminderConfig
        };
        changedFields.push("reminderConfig");
      }

      await taskRef.set(updates, { merge: true });
      await adminDb.collection("activity").add({
        projectId: resolvedProject.id,
        taskId: args.taskId,
        actorId: context.actorUid,
        action: args.statusColumnId ? "task_moved" : "task_updated",
        from: args.statusColumnId ? String(taskData.statusColumnId ?? "") : "",
        to: args.statusColumnId ?? "",
        createdAt: new Date()
      });

      await writeAdminAuditLog(
        {
          module: "agent",
          action: "update_project_task",
          targetType: "task",
          targetId: args.taskId,
          summary: "Agent updated task",
          metadata: {
            projectId: resolvedProject.id,
            projectName: resolvedProject.name,
            changedFields,
            source: context.source
          }
        },
        context.actorToken,
        context.requestContext
      );

      return {
        tool: call.tool,
        ok: true,
        message: `Updated task ${args.taskId} in ${resolvedProject.name}.`,
        data: {
          taskId: args.taskId,
          projectId: resolvedProject.id,
          changedFields
        }
      };
    }

    if (call.tool === "get_top_goals") {
      const args = getTopGoalsArgsSchema.parse(call.args);
      const settings = await getUserProjectSettings(context.actorUid);
      const limit = args.limit ?? 30;
      const goals = (args.includeCompleted ? settings.topGoals : settings.topGoals.filter((goal) => !goal.completed)).slice(0, limit);
      return {
        tool: call.tool,
        ok: true,
        message: `Loaded ${goals.length} top goal(s).`,
        data: {
          timezone: settings.timezone,
          total: settings.topGoals.length,
          goals
        }
      };
    }

    if (call.tool === "create_top_goal") {
      const args = createTopGoalArgsSchema.parse(call.args);
      const current = await getUserProjectSettings(context.actorUid);
      const linkedProject = args.projectId || args.projectName
        ? await resolveProjectForArgs({
            ownerUid: context.actorUid,
            projectId: args.projectId,
            projectName: args.projectName
          })
        : null;

      const nowIso = new Date().toISOString();
      const nextGoal: TopGoal = {
        id: `goal-${randomUUID()}`,
        title: args.title,
        description: args.description?.trim() || undefined,
        tags: sanitizeGoalTags(args.tags),
        projectId: linkedProject?.id,
        deadline: args.deadline,
        completed: false,
        completedAt: undefined,
        createdAt: nowIso
      };

      const nextGoals = args.addToTop === false ? [...current.topGoals, nextGoal] : [nextGoal, ...current.topGoals];
      await persistTopGoals({ uid: context.actorUid, baseSettings: current, goals: nextGoals.slice(0, 40) });

      await writeAdminAuditLog(
        {
          module: "agent",
          action: "create_top_goal",
          targetType: "goal",
          targetId: nextGoal.id,
          summary: `Agent created top goal ${nextGoal.title}`,
          metadata: {
            projectId: linkedProject?.id ?? "",
            projectName: linkedProject?.name ?? "",
            source: context.source
          }
        },
        context.actorToken,
        context.requestContext
      );

      return {
        tool: call.tool,
        ok: true,
        message: `Created top goal "${nextGoal.title}".`,
        data: nextGoal
      };
    }

    if (call.tool === "update_top_goal") {
      const args = updateTopGoalArgsSchema.parse(call.args);
      const current = await getUserProjectSettings(context.actorUid);
      const goal = current.topGoals.find((item) => item.id === args.goalId);
      if (!goal) throw new Error("Goal not found.");

      const linkedProject = args.projectName
        ? await resolveProjectForArgs({
            ownerUid: context.actorUid,
            projectName: args.projectName
          })
        : null;

      const nowIso = new Date().toISOString();
      const completed = args.completed === undefined ? goal.completed === true : args.completed;
      const nextGoal: TopGoal = {
        ...goal,
        title: args.title ?? goal.title,
        description: args.description !== undefined ? args.description || undefined : goal.description,
        tags: args.tags ? sanitizeGoalTags(args.tags) : goal.tags,
        projectId:
          linkedProject?.id ??
          (args.projectId === undefined ? goal.projectId : args.projectId === null ? undefined : args.projectId),
        deadline:
          args.deadline === undefined ? goal.deadline : args.deadline === null ? undefined : args.deadline,
        completed,
        completedAt: completed ? goal.completedAt || nowIso : undefined
      };

      const nextGoals = current.topGoals.map((item) => (item.id === args.goalId ? nextGoal : item));
      await persistTopGoals({ uid: context.actorUid, baseSettings: current, goals: nextGoals.slice(0, 40) });

      await writeAdminAuditLog(
        {
          module: "agent",
          action: "update_top_goal",
          targetType: "goal",
          targetId: args.goalId,
          summary: "Agent updated top goal",
          metadata: {
            completed: nextGoal.completed === true,
            source: context.source
          }
        },
        context.actorToken,
        context.requestContext
      );

      return {
        tool: call.tool,
        ok: true,
        message: `Updated top goal "${nextGoal.title}".`,
        data: nextGoal
      };
    }

    if (call.tool === "get_notifications_feed") {
      const args = notificationsFeedArgsSchema.parse(call.args);
      const limit = args.limit ?? 30;
      const snap = await adminDb.collection("users").doc(context.actorUid).collection("notifications").orderBy("createdAt", "desc").limit(limit).get();
      const rows = snap.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            module: String(data.module ?? "system"),
            title: String(data.title ?? ""),
            body: String(data.body ?? ""),
            priority: String(data.priority ?? "medium"),
            state: String(data.state ?? "unread"),
            ctaUrl: String(data.ctaUrl ?? ""),
            createdAt: toDate(data.createdAt)?.toISOString() ?? ""
          };
        })
        .filter((row) => (args.state ? row.state === args.state : true));

      return {
        tool: call.tool,
        ok: true,
        message: `Loaded ${rows.length} notification(s).`,
        data: { notifications: rows }
      };
    }

    if (call.tool === "get_reminder_diagnostics") {
      const now = new Date();
      const contextData = await loadReminderContextForUser(context.actorUid);
      const enabledDeviceCount = countDeliverableDevices(contextData.enabledDevices);
      const quietHoursActive = isQuietHoursNow({
        timezone: contextData.userPreferences.timezone,
        startHm: contextData.settings.channels.quietHoursStart,
        endHm: contextData.settings.channels.quietHoursEnd,
        now
      });
      const blockers: string[] = [];
      if (!contextData.settings.channels.inAppEnabled) blockers.push("Global in-app channel is disabled.");
      if (!contextData.userPreferences.inAppEnabled) blockers.push("Personal in-app preference is disabled.");
      if (!contextData.settings.channels.bannerEnabled) blockers.push("Global banner channel is disabled.");
      if (!contextData.userPreferences.bannerEnabled) blockers.push("Personal banner preference is disabled.");
      if (!contextData.settings.channels.pushEnabled) blockers.push("Global push channel is disabled.");
      if (!contextData.userPreferences.pushEnabled) blockers.push("Personal push preference is disabled.");
      if (!enabledDeviceCount) blockers.push("No enabled push device is registered.");
      if (quietHoursActive) blockers.push("Current time is within quiet hours.");

      return {
        tool: call.tool,
        ok: true,
        message: "Loaded reminder diagnostics.",
        data: {
          timezone: contextData.userPreferences.timezone,
          quietHours: {
            start: contextData.settings.channels.quietHoursStart,
            end: contextData.settings.channels.quietHoursEnd,
            activeNow: quietHoursActive
          },
          channels: {
            globalInAppEnabled: contextData.settings.channels.inAppEnabled,
            globalBannerEnabled: contextData.settings.channels.bannerEnabled,
            globalPushEnabled: contextData.settings.channels.pushEnabled,
            userInAppEnabled: contextData.userPreferences.inAppEnabled,
            userBannerEnabled: contextData.userPreferences.bannerEnabled,
            userPushEnabled: contextData.userPreferences.pushEnabled,
            enabledDeviceCount
          },
          blockers
        }
      };
    }

    if (call.tool === "create_reminder_notification") {
      const args = createReminderNotificationArgsSchema.parse(call.args);
      const now = new Date();
      const contextData = await loadReminderContextForUser(context.actorUid);
      const enabledDeviceCount = countDeliverableDevices(contextData.enabledDevices);
      const quietHoursActive = isQuietHoursNow({
        timezone: contextData.userPreferences.timezone,
        startHm: contextData.settings.channels.quietHoursStart,
        endHm: contextData.settings.channels.quietHoursEnd,
        now
      });

      const canPush =
        args.sendPush === true &&
        contextData.settings.channels.pushEnabled &&
        contextData.userPreferences.pushEnabled &&
        enabledDeviceCount > 0 &&
        !quietHoursActive;

      const notificationRef = adminDb.collection("users").doc(context.actorUid).collection("notifications").doc();
      await notificationRef.set({
        module: args.module ?? "system",
        sourceType: "agent_manual",
        sourceId: notificationRef.id,
        title: args.title,
        body: args.body?.trim() || "Reminder from SA Agent.",
        priority: args.priority ?? "medium",
        state: "unread",
        channels: {
          inApp: contextData.settings.channels.inAppEnabled && contextData.userPreferences.inAppEnabled,
          banner: contextData.settings.channels.bannerEnabled && contextData.userPreferences.bannerEnabled,
          push: canPush
        },
        ctaUrl: args.ctaUrl?.trim() || "/admin/settings/reminders",
        metadata: {
          generatedBy: "admin-agent",
          quietHoursActive
        },
        createdAt: now,
        updatedAt: now,
        readAt: null,
        dismissedAt: null
      });

      let pushSent = 0;
      let pushFailed = 0;
      if (canPush) {
        const response = await sendBrowserPushToUser({
          uid: context.actorUid,
          title: args.title,
          body: args.body?.trim() || "Reminder from SA Agent.",
          link: args.ctaUrl?.trim() || "/admin/settings/reminders",
          data: {
            notificationId: notificationRef.id,
            ctaUrl: args.ctaUrl?.trim() || "/admin/settings/reminders",
            module: args.module ?? "system",
            sourceType: "agent_manual",
            sourceId: notificationRef.id
          }
        });
        pushSent = response.sent;
        pushFailed = response.failed;
      }

      await writeAdminAuditLog(
        {
          module: "agent",
          action: "create_reminder_notification",
          targetType: "notification",
          targetId: notificationRef.id,
          summary: "Agent created reminder notification",
          metadata: {
            module: args.module ?? "system",
            pushAttempted: canPush,
            pushSent,
            pushFailed,
            source: context.source
          }
        },
        context.actorToken,
        context.requestContext
      );

      return {
        tool: call.tool,
        ok: true,
        message: `Created reminder notification "${args.title}".`,
        data: {
          notificationId: notificationRef.id,
          pushAttempted: canPush,
          pushSent,
          pushFailed
        }
      };
    }

    if (call.tool === "send_email_message") {
      const args = sendEmailMessageArgsSchema.parse(call.args);
      const adapter = await getConfiguredEmailAdapter();
      const rawHtmlBody = args.html || `<pre style="margin:0;font-family:inherit;white-space:pre-wrap;">${escapeHtml(args.text ?? "")}</pre>`;
      const textBody = args.text || (args.html ? args.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "");
      const shouldWrap = !args.html || !/<html[\s>]/i.test(args.html);
      const htmlBody = shouldWrap
        ? wrapBrandedEmailHtml(rawHtmlBody, {
            moduleName: args.module || "Agent",
            primaryActionLabel: "Open Admin Panel",
            primaryActionUrl: "/admin"
          })
        : rawHtmlBody;

      await adapter.send({
        to: args.to,
        subject: args.subject,
        html: htmlBody,
        text: textBody,
        activity: {
          module: args.module || "Agent",
          trigger: args.trigger || "agent_send_email",
          source: "admin-agent",
          metadata: {
            source: context.source
          }
        }
      });

      await writeAdminAuditLog(
        {
          module: "agent",
          action: "send_email_message",
          targetType: "email",
          targetId: args.to,
          summary: `Agent sent email to ${args.to}`,
          metadata: {
            subject: args.subject,
            source: context.source
          }
        },
        context.actorToken,
        context.requestContext
      );

      return {
        tool: call.tool,
        ok: true,
        message: `Sent email to ${args.to}.`,
        data: {
          to: args.to,
          subject: args.subject
        }
      };
    }

    if (call.tool === "send_telegram_message") {
      const args = telegramArgsSchema.parse(call.args);
      const botToken = resolveTelegramBotToken(context.runtime.secrets.telegramBotToken);
      const defaultChatId = context.runtime.integrations.telegramDefaultChatId || "";
      const chatId = (args.chatId || defaultChatId).trim();

      if (!chatId) {
        throw new Error("No Telegram chat ID configured. Provide chatId or set telegramDefaultChatId.");
      }

      const allowedChatIds = parseAllowedTelegramChatIds(context.runtime.integrations.telegramAllowedChatIds, defaultChatId);
      if (allowedChatIds.length > 0 && !allowedChatIds.includes(chatId)) {
        throw new Error("Telegram chat is not in allowlist.");
      }

      const sent = await sendTelegramMessage({
        botToken,
        chatId,
        text: args.message
      });

      await writeAdminAuditLog(
        {
          module: "agent",
          action: "send_telegram_message",
          targetType: "telegram",
          targetId: sent.chatId,
          summary: "Agent sent Telegram message",
          metadata: {
            chatId: sent.chatId,
            messageId: sent.messageId ?? null,
            source: context.source
          }
        },
        context.actorToken,
        context.requestContext
      );

      return {
        tool: call.tool,
        ok: true,
        message: `Sent Telegram message to ${sent.chatId}.`,
        data: sent
      };
    }

    if (call.tool === "summarize_recent_audit") {
      const args = summarizeAuditArgsSchema.parse(call.args);
      const hours = args.hours ?? 24;
      const limit = args.limit ?? 30;
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

      const snap = await adminDb.collection("auditLogs").orderBy("createdAt", "desc").limit(limit).get();
      const rows = snap.docs
        .map((doc) => {
          const data = doc.data();
          const createdAt = toDate(data.createdAt);
          return {
            id: doc.id,
            module: String(data.module ?? "unknown"),
            action: String(data.action ?? ""),
            summary: String(data.summary ?? ""),
            actorEmail: String(data.actorEmail ?? ""),
            createdAt
          };
        })
        .filter((row) => Boolean(row.createdAt) && (row.createdAt as Date).getTime() >= cutoff.getTime());

      const byModule = rows.reduce<Record<string, number>>((acc, row) => {
        acc[row.module] = (acc[row.module] ?? 0) + 1;
        return acc;
      }, {});

      return {
        tool: call.tool,
        ok: true,
        message: `Built audit summary for last ${hours} hour(s).`,
        data: {
          hours,
          count: rows.length,
          byModule,
          recent: rows.slice(0, 12).map((row) => ({
            module: row.module,
            action: row.action,
            summary: row.summary,
            actorEmail: row.actorEmail,
            createdAt: row.createdAt?.toISOString() ?? ""
          }))
        }
      };
    }

    return {
      tool: call.tool,
      ok: false,
      message: `Tool execution is not implemented for ${call.tool}`
    };
  } catch (error) {
    return {
      tool: call.tool,
      ok: false,
      message: error instanceof Error ? error.message : "Tool execution failed"
    };
  }
}

function buildUserFacingResultSummary(results: ToolResult[]) {
  if (!results.length) return "";

  const summaryLines: string[] = [];

  for (const result of results) {
    if (!result.ok) continue;

    if (result.tool === "get_projects_overview") {
      const data = (result.data ?? {}) as {
        kpis?: { totalProjects?: number; totalTasks?: number; overdueTasks?: number; dueThisWeek?: number; p1Tasks?: number };
        projects?: Array<{ id: string; name: string; status: string; metrics?: { openTaskCount?: number; overdueCount?: number; p1Count?: number } | null }>;
      };
      const kpis = data.kpis ?? {};
      const projects = data.projects ?? [];
      summaryLines.push(
        `Projects: ${kpis.totalProjects ?? projects.length}, tasks: ${kpis.totalTasks ?? 0}, overdue: ${kpis.overdueTasks ?? 0}, due this week: ${kpis.dueThisWeek ?? 0}, P1: ${kpis.p1Tasks ?? 0}.`
      );
      if (projects.length) {
        const top = projects.slice(0, 5).map((project) => {
          const open = project.metrics?.openTaskCount ?? 0;
          const overdue = project.metrics?.overdueCount ?? 0;
          return `${project.name} (${project.status}) - open ${open}, overdue ${overdue}`;
        });
        summaryLines.push(`Top projects: ${top.join(" | ")}`);
      }
      continue;
    }

    summaryLines.push(result.message);
  }

  return summaryLines.join("\n");
}

function buildUserFacingErrorSummary(results: ToolResult[]) {
  const failed = results.filter((result) => !result.ok);
  if (!failed.length) return "";
  return failed.map((result) => result.message).join("\n");
}

function normalizeTextForMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLastUserMessage(messages: AdminAgentMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "user") {
      return messages[index].content.trim();
    }
  }
  return "";
}

function toProjectOptionsFromDashboard(dashboard: Awaited<ReturnType<typeof getProjectDashboard>>): AgentProjectOption[] {
  return dashboard.projects.map((project) => {
    const metrics = dashboard.metricsByProject[project.id];
    return {
      id: project.id,
      name: project.name,
      status: project.status,
      openTaskCount: metrics?.openTaskCount ?? 0,
      overdueCount: metrics?.overdueCount ?? 0,
      p1Count: metrics?.p1Count ?? 0
    };
  });
}

function userMessageMentionsProjectName(message: string, options: AgentProjectOption[]) {
  const normalizedMessage = normalizeTextForMatch(message);
  if (!normalizedMessage) return false;
  return options.some((option) => {
    const normalizedName = normalizeTextForMatch(option.name);
    return normalizedName.length > 2 && normalizedMessage.includes(normalizedName);
  });
}

function hasProjectScopedSuccess(results: ToolResult[]) {
  return results.some((result) =>
    result.ok &&
    (result.tool === "get_project_board" ||
      result.tool === "create_project_task" ||
      result.tool === "update_project_task" ||
      result.tool === "move_project_task")
  );
}

function shouldRequireProjectSelection(input: {
  source: "panel" | "telegram";
  lastUserMessage: string;
  projectOptions: AgentProjectOption[];
  results: ToolResult[];
}) {
  if (input.source !== "panel") return false;
  if (input.projectOptions.length === 0) return false;
  if (hasProjectScopedSuccess(input.results)) return false;
  if (userMessageMentionsProjectName(input.lastUserMessage, input.projectOptions)) return false;

  const message = normalizeTextForMatch(input.lastUserMessage);
  if (!message) return false;
  if (message.includes("all projects") || message.includes("across projects") || message.includes("overview")) {
    return false;
  }

  return (
    message.includes("task") ||
    message.includes("due this week") ||
    message.includes("highest priority") ||
    message.includes("top priority") ||
    message.includes("project")
  );
}

export async function runAdminAgent(input: {
  actorUid: string;
  actorToken: DecodedIdToken | null;
  requestContext?: Partial<AdminRequestContext>;
  messages: AdminAgentMessage[];
  execute: boolean;
  source: "panel" | "telegram";
  maxActions?: number;
  providedActions?: AdminAgentAction[];
  allowWriteActions?: boolean;
}): Promise<AdminAgentRunResult> {
  const runtime = await getRuntimeAdminSettings();
  const maxActions = Math.max(1, Math.min(6, input.maxActions ?? 5));

  const planned = input.providedActions?.length
    ? {
        reply: "Executing requested actions.",
        actions: input.providedActions.slice(0, maxActions),
        model: "manual-actions"
      }
    : await planWithModel({
        runtime,
        messages: input.messages,
        source: input.source
      });

  const plannedActions = planned.actions.slice(0, maxActions);
  const actions = plannedActions.map((item) => ({
    ...item,
    knownTool: isKnownTool(item.tool),
    requiresConfirmation: requiresConfirmation(item.tool)
  }));
  const lastUserMessage = extractLastUserMessage(input.messages);

  if (!input.execute) {
    return {
      reply: planned.reply,
      model: planned.model,
      actions,
      executed: false,
      results: []
    };
  }

  const results: ToolResult[] = [];
  for (const action of plannedActions) {
    if (isWriteTool(action.tool) && input.allowWriteActions !== true) {
      results.push({
        tool: action.tool,
        ok: false,
        message: "Write actions are disabled for this channel."
      });
      continue;
    }

    const result = await executeToolCall(action, {
      actorUid: input.actorUid,
      actorToken: input.actorToken,
      requestContext: input.requestContext,
      runtime,
      source: input.source
    });

    results.push(result);
  }

  const successSummary = buildUserFacingResultSummary(results);
  const errorSummary = buildUserFacingErrorSummary(results);
  const baseReply = [planned.reply, successSummary, errorSummary].filter((part) => part.trim().length > 0).join("\n\n");

  let projectSelectionRequired = false;
  let projectOptions: AgentProjectOption[] = [];
  try {
    const dashboard = await getProjectDashboard(input.actorUid);
    projectOptions = toProjectOptionsFromDashboard(dashboard);
    projectSelectionRequired = shouldRequireProjectSelection({
      source: input.source,
      lastUserMessage,
      projectOptions,
      results
    });
  } catch {
    projectSelectionRequired = false;
    projectOptions = [];
  }

  const reply = projectSelectionRequired
    ? `${baseReply}\n\nSelect a project below and I will continue automatically.`
    : baseReply;

  return {
    reply,
    model: planned.model,
    actions,
    executed: true,
    results,
    projectSelectionRequired,
    projectOptions: projectSelectionRequired ? projectOptions : []
  };
}
