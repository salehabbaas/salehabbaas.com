import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { adminAuth, adminDb } from "../lib/admin";
import { getEmailAdapter } from "../lib/email/service";

type ReminderTask = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  dueDate: Date;
  assigneeId?: string;
  watchers: string[];
  reminderConfig: {
    email24h: boolean;
    email1h: boolean;
    dailyOverdue: boolean;
  };
};

type RecipientProfile = {
  uid: string;
  email: string;
  timezone: string;
  emailRemindersEnabled: boolean;
};

const WINDOW_MINUTES = 15;
const OVERDUE_LOOKBACK_DAYS = 30;

function siteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.DEFAULT_SITE_URL || "https://salehabbaas.com";
  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(normalized).toString();
  } catch {
    return "https://salehabbaas.com";
  }
}

function taskUrl(projectId: string, taskId: string) {
  return new URL(`/admin/projects/${projectId}?taskId=${taskId}`, siteUrl()).toString();
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    const parsed = value.toDate();
    return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function mapTask(docId: string, data: Record<string, unknown>): ReminderTask | null {
  const dueDate = asDate(data.dueDate);
  if (!dueDate) return null;

  return {
    id: docId,
    projectId: String(data.projectId ?? ""),
    title: String(data.title ?? "Untitled task"),
    description: String(data.description ?? ""),
    dueDate,
    assigneeId: typeof data.assigneeId === "string" ? data.assigneeId : undefined,
    watchers: Array.isArray(data.watchers) ? data.watchers.filter((value): value is string => typeof value === "string") : [],
    reminderConfig: {
      email24h: Boolean((data.reminderConfig as Record<string, unknown> | undefined)?.email24h ?? true),
      email1h: Boolean((data.reminderConfig as Record<string, unknown> | undefined)?.email1h ?? true),
      dailyOverdue: Boolean((data.reminderConfig as Record<string, unknown> | undefined)?.dailyOverdue ?? true)
    }
  };
}

function dateKeyForTimezone(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(date);
}

function dueLabel(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

async function getRecipientProfile(uid: string, cache: Map<string, RecipientProfile | null>): Promise<RecipientProfile | null> {
  if (cache.has(uid)) return cache.get(uid) ?? null;

  const [settingsSnap, userRecord] = await Promise.all([
    adminDb.collection("users").doc(uid).collection("settings").doc("projectManagement").get(),
    adminAuth.getUser(uid).catch(() => null)
  ]);

  const settings = settingsSnap.data() ?? {};
  const profile: RecipientProfile | null = userRecord?.email
    ? {
        uid,
        email: userRecord.email,
        timezone: String(settings.timezone ?? "UTC"),
        emailRemindersEnabled: settings.emailRemindersEnabled !== false
      }
    : null;

  cache.set(uid, profile);
  return profile;
}

function dedupeDoc(taskId: string, key: string) {
  return adminDb.collection("tasks").doc(taskId).collection("notificationsSent").doc(key);
}

async function sendTaskReminderEmail(input: {
  recipientEmail: string;
  timezone: string;
  task: ReminderTask;
  subjectPrefix: string;
  kind: "email24h" | "email1h";
}) {
  const adapter = await getEmailAdapter();
  const due = dueLabel(input.task.dueDate, input.timezone);
  const url = taskUrl(input.task.projectId, input.task.id);

  await adapter.send({
    to: input.recipientEmail,
    subject: `${input.subjectPrefix} ${input.task.title}`,
    html: `<p><strong>${input.task.title}</strong></p><p>Due: ${due}</p><p>${input.task.description || ""}</p><p><a href="${url}">Open task</a></p>`,
    text: `${input.task.title}\nDue: ${due}\n${url}`
  });

  return {
    kind: input.kind,
    due
  };
}

async function processWindowReminders(options: {
  tasks: ReminderTask[];
  kind: "email24h" | "email1h";
  subjectPrefix: string;
  recipientCache: Map<string, RecipientProfile | null>;
  now: Date;
}) {
  let sentCount = 0;

  for (const task of options.tasks) {
    if (!task.projectId) continue;
    if (options.kind === "email24h" && !task.reminderConfig.email24h) continue;
    if (options.kind === "email1h" && !task.reminderConfig.email1h) continue;

    const recipientIds = new Set<string>();
    if (task.assigneeId) recipientIds.add(task.assigneeId);
    task.watchers.forEach((uid) => recipientIds.add(uid));

    for (const uid of recipientIds) {
      const profile = await getRecipientProfile(uid, options.recipientCache);
      if (!profile || !profile.emailRemindersEnabled) continue;

      const dueKey = task.dueDate.toISOString().slice(0, 16);
      const dedupeKey = `${options.kind}:${uid}:${dueKey}`;
      const dedupeRef = dedupeDoc(task.id, dedupeKey);
      const dedupeSnap = await dedupeRef.get();
      if (dedupeSnap.exists) continue;

      try {
        await sendTaskReminderEmail({
          recipientEmail: profile.email,
          timezone: profile.timezone,
          task,
          subjectPrefix: options.subjectPrefix,
          kind: options.kind
        });

        await dedupeRef.set({
          kind: options.kind,
          recipientId: uid,
          sentAt: options.now,
          dueDate: task.dueDate
        });

        sentCount += 1;
      } catch (error) {
        logger.error("Task reminder send failed", {
          kind: options.kind,
          taskId: task.id,
          recipientId: uid,
          message: error instanceof Error ? error.message : "unknown"
        });
      }
    }
  }

  return sentCount;
}

async function processDailyOverdueDigest(options: {
  tasks: ReminderTask[];
  now: Date;
  recipientCache: Map<string, RecipientProfile | null>;
}) {
  const recipientBuckets = new Map<
    string,
    {
      profile: RecipientProfile;
      tasks: ReminderTask[];
      dedupeRefs: Array<ReturnType<typeof dedupeDoc>>;
    }
  >();

  for (const task of options.tasks) {
    if (!task.projectId || !task.reminderConfig.dailyOverdue) continue;

    const recipientIds = new Set<string>();
    if (task.assigneeId) recipientIds.add(task.assigneeId);
    task.watchers.forEach((uid) => recipientIds.add(uid));

    for (const uid of recipientIds) {
      const profile = await getRecipientProfile(uid, options.recipientCache);
      if (!profile || !profile.emailRemindersEnabled) continue;

      const dayKey = dateKeyForTimezone(options.now, profile.timezone);
      const dedupeKey = `dailyOverdue:${uid}:${dayKey}`;
      const dedupeRef = dedupeDoc(task.id, dedupeKey);
      const dedupeSnap = await dedupeRef.get();
      if (dedupeSnap.exists) continue;

      const bucket = recipientBuckets.get(uid) ?? {
        profile,
        tasks: [],
        dedupeRefs: []
      };
      bucket.tasks.push(task);
      bucket.dedupeRefs.push(dedupeRef);
      recipientBuckets.set(uid, bucket);
    }
  }

  if (!recipientBuckets.size) return 0;

  const adapter = await getEmailAdapter();
  let sentCount = 0;

  for (const [uid, bucket] of recipientBuckets.entries()) {
    if (!bucket.tasks.length) continue;

    try {
      const items = bucket.tasks
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
        .map((task) => {
          const due = dueLabel(task.dueDate, bucket.profile.timezone);
          const url = taskUrl(task.projectId, task.id);
          return `<li><strong>${task.title}</strong> — overdue since ${due} (<a href="${url}">Open</a>)</li>`;
        })
        .join("");

      await adapter.send({
        to: bucket.profile.email,
        subject: `Daily overdue tasks (${bucket.tasks.length})`,
        html: `<p>You have ${bucket.tasks.length} overdue task(s).</p><ul>${items}</ul>`,
        text: `Overdue tasks: ${bucket.tasks.length}`
      });

      const batch = adminDb.batch();
      bucket.dedupeRefs.forEach((ref) => {
        batch.set(ref, {
          kind: "dailyOverdue",
          recipientId: uid,
          sentAt: options.now
        });
      });
      await batch.commit();

      sentCount += 1;
    } catch (error) {
      logger.error("Overdue digest send failed", {
        recipientId: uid,
        message: error instanceof Error ? error.message : "unknown"
      });
    }
  }

  return sentCount;
}

export const taskReminderSweep = onSchedule(
  {
    schedule: "every 15 minutes",
    region: "us-central1"
  },
  async () => {
    const now = new Date();
    const windowHalfMs = Math.floor((WINDOW_MINUTES * 60 * 1000) / 2);

    const due24Target = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const due1Target = new Date(now.getTime() + 60 * 60 * 1000);

    const [due24Snap, due1Snap, overdueSnap] = await Promise.all([
      adminDb
        .collection("tasks")
        .where("dueDate", ">=", new Date(due24Target.getTime() - windowHalfMs))
        .where("dueDate", "<=", new Date(due24Target.getTime() + windowHalfMs))
        .get(),
      adminDb
        .collection("tasks")
        .where("dueDate", ">=", new Date(due1Target.getTime() - windowHalfMs))
        .where("dueDate", "<=", new Date(due1Target.getTime() + windowHalfMs))
        .get(),
      adminDb
        .collection("tasks")
        .where("dueDate", "<", now)
        .where("dueDate", ">=", new Date(now.getTime() - OVERDUE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000))
        .get()
    ]);

    const due24Tasks = due24Snap.docs
      .map((doc) => mapTask(doc.id, doc.data() as Record<string, unknown>))
      .filter((task): task is ReminderTask => Boolean(task));
    const due1Tasks = due1Snap.docs
      .map((doc) => mapTask(doc.id, doc.data() as Record<string, unknown>))
      .filter((task): task is ReminderTask => Boolean(task));
    const overdueTasks = overdueSnap.docs
      .map((doc) => mapTask(doc.id, doc.data() as Record<string, unknown>))
      .filter((task): task is ReminderTask => Boolean(task));

    const recipientCache = new Map<string, RecipientProfile | null>();

    const [sent24h, sent1h, overdueDigestCount] = await Promise.all([
      processWindowReminders({
        tasks: due24Tasks,
        kind: "email24h",
        subjectPrefix: "Task due in 24h:",
        recipientCache,
        now
      }),
      processWindowReminders({
        tasks: due1Tasks,
        kind: "email1h",
        subjectPrefix: "Task due in 1h:",
        recipientCache,
        now
      }),
      processDailyOverdueDigest({
        tasks: overdueTasks,
        now,
        recipientCache
      })
    ]);

    logger.info("Task reminder sweep complete", {
      scanned24h: due24Tasks.length,
      scanned1h: due1Tasks.length,
      scannedOverdue: overdueTasks.length,
      sent24h,
      sent1h,
      overdueDigestCount
    });
  }
);
