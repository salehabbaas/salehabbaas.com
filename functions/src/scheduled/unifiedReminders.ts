import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { adminDb } from "../lib/admin";
import { createNotification } from "../lib/notifications/service";
import { getPrimaryAdminUid, getReminderRuntimeSettings } from "../lib/notifications/settings";

const WINDOW_MINUTES = 15;
const RETENTION_DAYS = 30;

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

function timeLabel(minutes: number) {
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${minutes}m`;
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

function isDueInWindow(input: { date: Date; target: Date; halfWindowMs: number }) {
  const diff = Math.abs(input.date.getTime() - input.target.getTime());
  return diff <= input.halfWindowMs;
}

async function createBookingReminders(input: {
  now: Date;
  halfWindowMs: number;
  windows: number[];
  primaryAdminUid: string;
}) {
  let created = 0;

  for (const minutes of input.windows) {
    const target = new Date(input.now.getTime() + minutes * 60 * 1000);
    const snap = await adminDb
      .collection("bookings")
      .where("status", "==", "confirmed")
      .where("startAt", ">=", new Date(target.getTime() - input.halfWindowMs))
      .where("startAt", "<=", new Date(target.getTime() + input.halfWindowMs))
      .get();

    for (const doc of snap.docs) {
      const data = doc.data() as Record<string, unknown>;
      const startAt = asDate(data.startAt);
      if (!startAt || !isDueInWindow({ date: startAt, target, halfWindowMs: input.halfWindowMs })) continue;

      const name = typeof data.name === "string" ? data.name : "guest";
      const meeting = typeof data.meetingTypeLabel === "string" && data.meetingTypeLabel ? data.meetingTypeLabel : "Meeting";

      const result = await createNotification({
        recipientId: input.primaryAdminUid,
        dedupeKey: `bookings:${doc.id}:${minutes}:${startAt.toISOString().slice(0, 16)}`,
        module: "bookings",
        sourceType: "booking_start",
        sourceId: doc.id,
        title: `Booking starts in ${timeLabel(minutes)}`,
        body: `${meeting} with ${name}`,
        priority: minutes <= 60 ? "high" : "medium",
        ctaUrl: "/admin/bookings",
        scheduledFor: startAt,
        metadata: {
          bookingId: doc.id,
          minutesBefore: minutes
        }
      });

      if (result.created) created += 1;
    }
  }

  return created;
}

async function createLinkedinReminders(input: {
  now: Date;
  halfWindowMs: number;
  windows: number[];
  primaryAdminUid: string;
}) {
  let created = 0;

  for (const minutes of input.windows) {
    const target = new Date(input.now.getTime() + minutes * 60 * 1000);
    const snap = await adminDb
      .collection("linkedinStudioPosts")
      .where("scheduledFor", ">=", new Date(target.getTime() - input.halfWindowMs))
      .where("scheduledFor", "<=", new Date(target.getTime() + input.halfWindowMs))
      .get();

    for (const doc of snap.docs) {
      const data = doc.data() as Record<string, unknown>;
      if (String(data.status ?? "") !== "scheduled") continue;
      const scheduledFor = asDate(data.scheduledFor);
      if (!scheduledFor || !isDueInWindow({ date: scheduledFor, target, halfWindowMs: input.halfWindowMs })) continue;

      const title = typeof data.title === "string" && data.title ? data.title : "LinkedIn post";
      const result = await createNotification({
        recipientId: input.primaryAdminUid,
        dedupeKey: `linkedin:${doc.id}:${minutes}:${scheduledFor.toISOString().slice(0, 16)}`,
        module: "linkedin",
        sourceType: "linkedin_scheduled",
        sourceId: doc.id,
        title: `LinkedIn post due in ${timeLabel(minutes)}`,
        body: title,
        priority: minutes <= 60 ? "high" : "medium",
        ctaUrl: "/admin/linkedin-studio",
        scheduledFor,
        metadata: {
          postId: doc.id,
          minutesBefore: minutes
        }
      });

      if (result.created) created += 1;
    }
  }

  return created;
}

async function createJobReminders(input: {
  now: Date;
  halfWindowMs: number;
  windows: number[];
  overdue: { enabled: boolean; lookbackDays: number };
  timezone: string;
}) {
  let created = 0;

  for (const minutes of input.windows) {
    const target = new Date(input.now.getTime() + minutes * 60 * 1000);
    const snap = await adminDb
      .collection("jobTrackerJobs")
      .where("nextFollowUpAt", ">=", new Date(target.getTime() - input.halfWindowMs))
      .where("nextFollowUpAt", "<=", new Date(target.getTime() + input.halfWindowMs))
      .get();

    for (const doc of snap.docs) {
      const data = doc.data() as Record<string, unknown>;
      const ownerId = typeof data.ownerId === "string" ? data.ownerId : "";
      if (!ownerId) continue;

      const followUpAt = asDate(data.nextFollowUpAt);
      if (!followUpAt || !isDueInWindow({ date: followUpAt, target, halfWindowMs: input.halfWindowMs })) continue;

      const company = typeof data.company === "string" ? data.company : "Company";
      const title = typeof data.title === "string" ? data.title : "Role";

      const result = await createNotification({
        recipientId: ownerId,
        dedupeKey: `jobs:followup:${doc.id}:${minutes}:${followUpAt.toISOString().slice(0, 16)}`,
        module: "jobs",
        sourceType: "job_followup",
        sourceId: doc.id,
        title: `Job follow-up in ${timeLabel(minutes)}`,
        body: `${company} · ${title}`,
        priority: minutes <= 60 ? "high" : "medium",
        ctaUrl: `/admin/job-tracker/${doc.id}`,
        scheduledFor: followUpAt,
        metadata: {
          jobId: doc.id,
          minutesBefore: minutes
        }
      });

      if (result.created) created += 1;
    }
  }

  if (!input.overdue.enabled) return created;

  const overdueSnap = await adminDb
    .collection("jobTrackerJobs")
    .where("nextFollowUpAt", "<", input.now)
    .where("nextFollowUpAt", ">=", new Date(input.now.getTime() - input.overdue.lookbackDays * 24 * 60 * 60 * 1000))
    .get();

  const dayKey = dateKeyForTimezone(input.now, input.timezone || "UTC");

  for (const doc of overdueSnap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const ownerId = typeof data.ownerId === "string" ? data.ownerId : "";
    if (!ownerId) continue;

    const company = typeof data.company === "string" ? data.company : "Company";
    const title = typeof data.title === "string" ? data.title : "Role";

    const result = await createNotification({
      recipientId: ownerId,
      dedupeKey: `jobs:overdue:${doc.id}:${ownerId}:${dayKey}`,
      module: "jobs",
      sourceType: "job_followup_overdue",
      sourceId: doc.id,
      title: "Job follow-up overdue",
      body: `${company} · ${title}`,
      priority: "high",
      ctaUrl: `/admin/job-tracker/${doc.id}`,
      metadata: {
        jobId: doc.id,
        dayKey
      }
    });

    if (result.created) created += 1;
  }

  return created;
}

async function createGoalReminders(input: {
  now: Date;
  halfWindowMs: number;
  windows: number[];
  enabled: boolean;
  overdue: { enabled: boolean; lookbackDays: number };
  timezone: string;
}) {
  if (!input.enabled && !input.overdue.enabled) return 0;

  const settingsSnap = await adminDb.collectionGroup("settings").get();
  let created = 0;

  for (const doc of settingsSnap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const isProjectManagementDoc = doc.id === "projectManagement" || String(data.module ?? "") === "project-management";
    if (!isProjectManagementDoc) continue;
    const userId = doc.ref.parent.parent?.id;
    if (!userId) continue;

    const timezone = typeof data.timezone === "string" ? data.timezone : input.timezone;
    const goals = Array.isArray(data.topGoals) ? data.topGoals : [];

    for (const [index, entry] of goals.entries()) {
      const goal = (entry ?? {}) as Record<string, unknown>;
      if (goal.completed === true) continue;

      const deadline = asDate(goal.deadline);
      if (!deadline) continue;

      const goalId = typeof goal.id === "string" && goal.id.trim() ? goal.id.trim() : `goal-${index + 1}`;
      const goalTitle = typeof goal.title === "string" && goal.title.trim() ? goal.title.trim() : "Top goal";

      if (input.enabled) {
        for (const minutes of input.windows) {
          const target = new Date(input.now.getTime() + minutes * 60 * 1000);
          if (!isDueInWindow({ date: deadline, target, halfWindowMs: input.halfWindowMs })) continue;

          const result = await createNotification({
            recipientId: userId,
            dedupeKey: `goals:due:${userId}:${goalId}:${minutes}:${deadline.toISOString().slice(0, 16)}`,
            module: "goals",
            sourceType: "goal_deadline",
            sourceId: `${userId}:${goalId}`,
            title: `Goal due in ${timeLabel(minutes)}`,
            body: goalTitle,
            priority: minutes <= 1440 ? "high" : "medium",
            ctaUrl: "/admin/projects",
            scheduledFor: deadline,
            metadata: {
              goalId,
              minutesBefore: minutes
            }
          });

          if (result.created) created += 1;
        }
      }

      if (input.overdue.enabled) {
        const lookbackDate = new Date(input.now.getTime() - input.overdue.lookbackDays * 24 * 60 * 60 * 1000);
        if (deadline >= input.now || deadline < lookbackDate) continue;

        const dayKey = dateKeyForTimezone(input.now, timezone || "UTC");
        const result = await createNotification({
          recipientId: userId,
          dedupeKey: `goals:overdue:${userId}:${goalId}:${dayKey}`,
          module: "goals",
          sourceType: "goal_deadline_overdue",
          sourceId: `${userId}:${goalId}`,
          title: "Goal deadline overdue",
          body: goalTitle,
          priority: "high",
          ctaUrl: "/admin/projects",
          metadata: {
            goalId,
            dayKey
          }
        });

        if (result.created) created += 1;
      }
    }
  }

  return created;
}

async function cleanupOldNotifications(now: Date) {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const snap = await adminDb
    .collectionGroup("notifications")
    .where("state", "in", ["read", "dismissed"])
    .where("updatedAt", "<", cutoff)
    .limit(300)
    .get();

  if (snap.empty) return 0;

  const batch = adminDb.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  return snap.size;
}

export const unifiedReminderSweep = onSchedule(
  {
    schedule: "every 15 minutes",
    region: "us-central1"
  },
  async () => {
    const now = new Date();
    const halfWindowMs = Math.floor((WINDOW_MINUTES * 60 * 1000) / 2);

    const [settings, primaryAdminUid] = await Promise.all([getReminderRuntimeSettings(), getPrimaryAdminUid()]);

    const bookingCount =
      settings.bookings.enabled && primaryAdminUid
        ? await createBookingReminders({
            now,
            halfWindowMs,
            windows: settings.bookings.windowsMinutes,
            primaryAdminUid
          })
        : 0;

    const linkedinCount =
      settings.linkedin.enabled && primaryAdminUid
        ? await createLinkedinReminders({
            now,
            halfWindowMs,
            windows: settings.linkedin.windowsMinutes,
            primaryAdminUid
          })
        : 0;

    const jobsCount = settings.jobs.enabled
      ? await createJobReminders({
          now,
          halfWindowMs,
          windows: settings.jobs.windowsMinutes,
          overdue: {
            enabled: settings.jobs.overdue.enabled,
            lookbackDays: settings.jobs.overdue.lookbackDays
          },
          timezone: settings.channels.timezone
        })
      : 0;

    const goalsCount = await createGoalReminders({
      now,
      halfWindowMs,
      windows: settings.goals.windowsMinutes,
      enabled: settings.goals.enabled,
      overdue: {
        enabled: settings.goals.overdue.enabled,
        lookbackDays: settings.goals.overdue.lookbackDays
      },
      timezone: settings.channels.timezone
    });

    const cleanupCount = await cleanupOldNotifications(now);

    logger.info("Unified reminder sweep complete", {
      bookingCount,
      linkedinCount,
      jobsCount,
      goalsCount,
      cleanupCount
    });
  }
);
