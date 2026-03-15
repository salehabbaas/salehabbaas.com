import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { adminDb } from "../lib/admin";
import { getEmailAdapter } from "../lib/email/service";
import { createNotification } from "../lib/notifications/service";
import {
  getReminderRuntimeSettings,
  getUserReminderPreferences,
} from "../lib/notifications/settings";

type GoalsReminderSettings = {
  enableDailyBrief: boolean;
  enableWrapUp: boolean;
  enableWeeklyPlanning: boolean;
  dailyBriefTime: string;
  wrapUpTime: string;
  weeklyPlanningTime: string;
  timezone: string;
};

type GoalUser = {
  uid: string;
  email: string;
  displayName: string;
  settings: GoalsReminderSettings;
};

const DEFAULT_SETTINGS: GoalsReminderSettings = {
  enableDailyBrief: true,
  enableWrapUp: true,
  enableWeeklyPlanning: true,
  dailyBriefTime: "08:00",
  wrapUpTime: "19:30",
  weeklyPlanningTime: "08:00",
  timezone: "America/Montreal",
};

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function normalizeHm(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(trimmed)) return fallback;
  return trimmed;
}

function dateIdInTimezone(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function timeInTimezone(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function weekdayInTimezone(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  }).format(date);
}

function weekIdFromDateId(dateId: string) {
  const matched = dateId.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matched) return "";

  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);

  const current = new Date(Date.UTC(year, month - 1, day));
  const dayNum = current.getUTCDay() || 7;
  current.setUTCDate(current.getUTCDate() + 4 - dayNum);
  const isoYear = current.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((current.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

function nextDateId(dateId: string, deltaDays: number) {
  const matched = dateId.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matched) return dateId;

  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + deltaDays);

  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.DEFAULT_SITE_URL ||
    "https://salehabbaas.com";
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    return new URL(withProtocol).toString();
  } catch {
    return "https://salehabbaas.com";
  }
}

function absoluteLink(path: string) {
  try {
    return new URL(path, normalizeSiteUrl()).toString();
  } catch {
    return `${normalizeSiteUrl().replace(/\/$/, "")}${path}`;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function getGoalsReminderSettings(uid: string): Promise<GoalsReminderSettings> {
  const snap = await adminDb
    .collection("users")
    .doc(uid)
    .collection("reminderRules")
    .doc("settings")
    .get();

  if (!snap.exists) {
    return { ...DEFAULT_SETTINGS };
  }

  const data = (snap.data() ?? {}) as Record<string, unknown>;

  return {
    enableDailyBrief:
      typeof data.enableDailyBrief === "boolean"
        ? data.enableDailyBrief
        : DEFAULT_SETTINGS.enableDailyBrief,
    enableWrapUp:
      typeof data.enableWrapUp === "boolean"
        ? data.enableWrapUp
        : DEFAULT_SETTINGS.enableWrapUp,
    enableWeeklyPlanning:
      typeof data.enableWeeklyPlanning === "boolean"
        ? data.enableWeeklyPlanning
        : DEFAULT_SETTINGS.enableWeeklyPlanning,
    dailyBriefTime: normalizeHm(data.dailyBriefTime, DEFAULT_SETTINGS.dailyBriefTime),
    wrapUpTime: normalizeHm(data.wrapUpTime, DEFAULT_SETTINGS.wrapUpTime),
    weeklyPlanningTime: normalizeHm(
      data.weeklyPlanningTime,
      DEFAULT_SETTINGS.weeklyPlanningTime,
    ),
    timezone:
      typeof data.timezone === "string" && data.timezone.trim()
        ? data.timezone
        : DEFAULT_SETTINGS.timezone,
  };
}

async function listGoalUsers() {
  const adminsSnap = await adminDb
    .collection("adminUsers")
    .where("status", "==", "active")
    .get();

  if (adminsSnap.empty) return [] as GoalUser[];

  const rows: GoalUser[] = [];

  for (const adminDoc of adminsSnap.docs) {
    const adminData = (adminDoc.data() ?? {}) as Record<string, unknown>;
    const uid = adminDoc.id;
    const settings = await getGoalsReminderSettings(uid);

    rows.push({
      uid,
      email:
        typeof adminData.email === "string" && adminData.email.trim()
          ? adminData.email.trim()
          : "",
      displayName:
        typeof adminData.displayName === "string" && adminData.displayName.trim()
          ? adminData.displayName.trim()
          : uid,
      settings,
    });
  }

  return rows;
}

async function claimDispatch(input: {
  uid: string;
  fieldName: "dailyBriefByDate" | "weeklyReminderByWeek" | "wrapUpByDate";
  key: string;
}) {
  const ref = adminDb
    .collection("users")
    .doc(input.uid)
    .collection("reminderRules")
    .doc("dispatchState");

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = (snap.data() ?? {}) as Record<string, unknown>;
    const sourceMap = asRecord(data[input.fieldName]);
    if (sourceMap[input.key]) {
      return false;
    }

    const nextMap: Record<string, unknown> = {
      ...sourceMap,
      [input.key]: new Date(),
    };

    const sortedKeys = Object.keys(nextMap).sort((a, b) => a.localeCompare(b));
    const keepKeys = sortedKeys.slice(Math.max(0, sortedKeys.length - 180));
    const compacted: Record<string, unknown> = {};
    keepKeys.forEach((key) => {
      compacted[key] = nextMap[key];
    });

    tx.set(
      ref,
      {
        workspaceId: "main",
        userId: input.uid,
        [input.fieldName]: compacted,
        updatedAt: new Date(),
      },
      { merge: true },
    );

    return true;
  });
}

async function sendEmailIfAllowed(input: {
  uid: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  trigger: string;
  metadata: Record<string, unknown>;
}) {
  if (!input.to) return false;

  const [runtimeSettings, userPreferences] = await Promise.all([
    getReminderRuntimeSettings(),
    getUserReminderPreferences(input.uid),
  ]);

  if (!runtimeSettings.channels.emailEnabled || !userPreferences.emailRemindersEnabled) {
    return false;
  }

  const adapter = await getEmailAdapter();
  await adapter.send({
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    activity: {
      module: "Goals",
      templateId: input.trigger,
      trigger: input.trigger,
      source: "functions",
      metadata: input.metadata,
    },
  });

  return true;
}

function buildDailyBriefEmail(input: {
  displayName: string;
  dateId: string;
  yesterdayDoneCount: number;
  yesterdayXp: number;
  plannedTitles: string[];
  yesterdaySummary?: string;
  addLink: string;
}) {
  const titleRows = input.plannedTitles.length
    ? input.plannedTitles
        .slice(0, 10)
        .map((title) => `<li style="margin:0 0 8px;">${escapeHtml(title)}</li>`)
        .join("")
    : "<li style=\"margin:0 0 8px;\">No stickers planned yet. Add a few to guide your day.</li>";

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f5f8ff;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:20px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid #dbe7ff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:18px 20px;background:linear-gradient(120deg,#0ea5e9,#2563eb,#14b8a6);color:#ffffff;">
                <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.9;">Goals Daily Brief</p>
                <h2 style="margin:8px 0 0;font-size:22px;line-height:1.2;">${escapeHtml(input.dateId)}</h2>
              </td>
            </tr>
            <tr>
              <td style="padding:20px;">
                <p style="margin:0 0 12px;font-size:14px;">Hi ${escapeHtml(input.displayName)}, here is your planning snapshot.</p>
                <p style="margin:0 0 8px;font-size:14px;"><strong>Yesterday:</strong> ${input.yesterdayDoneCount} sticker(s) done, ${input.yesterdayXp} XP earned.</p>
                ${
                  input.yesterdaySummary
                    ? `<p style=\"margin:0 0 8px;font-size:14px;\"><strong>Yesterday summary:</strong> ${escapeHtml(input.yesterdaySummary)}</p>`
                    : ""
                }
                <p style="margin:16px 0 8px;font-size:14px;"><strong>Today\'s planned stickers:</strong></p>
                <ul style="margin:0 0 16px;padding-left:18px;font-size:14px;line-height:1.45;">${titleRows}</ul>
                <a href="${escapeHtml(input.addLink)}" style="display:inline-block;padding:11px 15px;border-radius:10px;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">Open Goals Planner</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textLines = [
    `Goals Daily Brief (${input.dateId})`,
    `Hi ${input.displayName},`,
    "",
    `Yesterday: ${input.yesterdayDoneCount} sticker(s) done, ${input.yesterdayXp} XP earned.`,
    ...(input.yesterdaySummary ? [`Yesterday summary: ${input.yesterdaySummary}`] : []),
    "",
    "Today's planned stickers:",
    ...(input.plannedTitles.length
      ? input.plannedTitles.map((title, index) => `${index + 1}. ${title}`)
      : ["- No stickers planned yet."]),
    "",
    `Open planner: ${input.addLink}`,
  ];

  return {
    html,
    text: textLines.join("\n"),
  };
}

async function buildDailyBriefContext(input: {
  uid: string;
  dateId: string;
  timezone: string;
}) {
  const yesterdayId = nextDateId(input.dateId, -1);

  const [dayPlanSnap, yesterdayDayPlanSnap, yesterdayLedgerSnap] = await Promise.all([
    adminDb
      .collection("users")
      .doc(input.uid)
      .collection("dayPlans")
      .doc(input.dateId)
      .get(),
    adminDb
      .collection("users")
      .doc(input.uid)
      .collection("dayPlans")
      .doc(yesterdayId)
      .get(),
    adminDb
      .collection("users")
      .doc(input.uid)
      .collection("pointsLedger")
      .where("dateId", "==", yesterdayId)
      .orderBy("createdAt", "desc")
      .limit(300)
      .get(),
  ]);

  const dayPlanData = (dayPlanSnap.data() ?? {}) as Record<string, unknown>;
  const yesterdayPlanData = (yesterdayDayPlanSnap.data() ?? {}) as Record<string, unknown>;
  const stickerIds = Array.isArray(dayPlanData.stickerIds)
    ? dayPlanData.stickerIds.filter((value): value is string => typeof value === "string")
    : [];

  const stickerRefs = stickerIds.map((id) =>
    adminDb.collection("users").doc(input.uid).collection("stickers").doc(id),
  );
  const stickerSnaps = stickerRefs.length ? await adminDb.getAll(...stickerRefs) : [];

  const plannedTitles = stickerSnaps
    .filter((snap) => snap.exists)
    .map((snap) => String(snap.data()?.title ?? "Sticker"));

  let yesterdayDoneCount = 0;
  let yesterdayXp = 0;

  yesterdayLedgerSnap.docs.forEach((doc) => {
    const row = (doc.data() ?? {}) as Record<string, unknown>;
    const xp = typeof row.xp === "number" && Number.isFinite(row.xp) ? Number(row.xp) : 0;
    const reason = typeof row.reason === "string" ? row.reason : "";
    yesterdayXp += xp;
    if (reason === "sticker_completed") {
      yesterdayDoneCount += 1;
    }
  });

  return {
    yesterdayId,
    plannedTitles,
    yesterdayDoneCount,
    yesterdayXp,
    yesterdaySummary: typeof yesterdayPlanData.aiSummary === "string" ? yesterdayPlanData.aiSummary : "",
  };
}

async function sendDailyBriefForUser(user: GoalUser, now: Date) {
  if (!user.settings.enableDailyBrief) return { sent: false, skipped: "disabled" };

  const currentHm = timeInTimezone(now, user.settings.timezone);
  if (currentHm !== user.settings.dailyBriefTime) {
    return { sent: false, skipped: "time-mismatch" };
  }

  const dateId = dateIdInTimezone(now, user.settings.timezone);
  const canDispatch = await claimDispatch({
    uid: user.uid,
    fieldName: "dailyBriefByDate",
    key: dateId,
  });

  if (!canDispatch) {
    return { sent: false, skipped: "already-sent" };
  }

  const context = await buildDailyBriefContext({
    uid: user.uid,
    dateId,
    timezone: user.settings.timezone,
  });

  const addLink = absoluteLink(`/sa/goals/add?date=${encodeURIComponent(dateId)}&from=daily-email`);
  const email = buildDailyBriefEmail({
    displayName: user.displayName,
    dateId,
    yesterdayDoneCount: context.yesterdayDoneCount,
    yesterdayXp: context.yesterdayXp,
    plannedTitles: context.plannedTitles,
    yesterdaySummary: context.yesterdaySummary,
    addLink,
  });

  const sentEmail = await sendEmailIfAllowed({
    uid: user.uid,
    to: user.email,
    subject: `Daily Brief · ${dateId}`,
    html: email.html,
    text: email.text,
    trigger: "goals_daily_brief",
    metadata: {
      dateId,
      plannedCount: context.plannedTitles.length,
      yesterdayDoneCount: context.yesterdayDoneCount,
      yesterdayXp: context.yesterdayXp,
    },
  }).catch((error) => {
    logger.error("Daily brief email failed", {
      uid: user.uid,
      dateId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return false;
  });

  await createNotification({
    recipientId: user.uid,
    dedupeKey: `goals:daily-brief:${user.uid}:${dateId}`,
    module: "goals",
    sourceType: "goals_daily_brief",
    sourceId: dateId,
    title: "Daily brief is ready",
    body: `Yesterday: ${context.yesterdayDoneCount} done · ${context.yesterdayXp} XP.`,
    priority: "medium",
    ctaUrl: `/sa/goals/add?date=${encodeURIComponent(dateId)}&from=daily-email`,
    metadata: {
      dateId,
      plannedCount: context.plannedTitles.length,
    },
  });

  return {
    sent: true,
    sentEmail,
    dateId,
  };
}

async function sendWeeklyReminderForUser(user: GoalUser, now: Date) {
  if (!user.settings.enableWeeklyPlanning) return { sent: false, skipped: "disabled" };

  const weekday = weekdayInTimezone(now, user.settings.timezone);
  if (weekday !== "Monday") return { sent: false, skipped: "not-monday" };

  const currentHm = timeInTimezone(now, user.settings.timezone);
  if (currentHm !== user.settings.weeklyPlanningTime) {
    return { sent: false, skipped: "time-mismatch" };
  }

  const dateId = dateIdInTimezone(now, user.settings.timezone);
  const weekId = weekIdFromDateId(dateId);
  if (!weekId) return { sent: false, skipped: "week-id-invalid" };

  const canDispatch = await claimDispatch({
    uid: user.uid,
    fieldName: "weeklyReminderByWeek",
    key: weekId,
  });
  if (!canDispatch) {
    return { sent: false, skipped: "already-sent" };
  }

  const weekPlanSnap = await adminDb
    .collection("users")
    .doc(user.uid)
    .collection("weekPlans")
    .doc(weekId)
    .get();

  const hasWeekPlan = weekPlanSnap.exists &&
    Array.isArray(weekPlanSnap.data()?.stickerIds) &&
    (weekPlanSnap.data()?.stickerIds as unknown[]).length > 0;

  if (hasWeekPlan) {
    return { sent: false, skipped: "already-planned" };
  }

  await createNotification({
    recipientId: user.uid,
    dedupeKey: `goals:weekly-plan:${user.uid}:${weekId}`,
    module: "goals",
    sourceType: "goals_weekly_planning",
    sourceId: weekId,
    title: "Weekly planning reminder",
    body: `No week plan detected for ${weekId}. Build one now.`,
    priority: "medium",
    ctaUrl: "/sa/goals/week",
    metadata: { weekId },
  });

  const html = `<p>Weekly planning reminder for ${escapeHtml(weekId)}.</p><p>Your week plan is still empty. Open <a href="${escapeHtml(absoluteLink("/sa/goals/week"))}">Goals Week</a> and set your focus.</p>`;
  const text = `Weekly planning reminder for ${weekId}. Your week plan is still empty. Open ${absoluteLink("/sa/goals/week")}.`;

  const sentEmail = await sendEmailIfAllowed({
    uid: user.uid,
    to: user.email,
    subject: `Weekly planning reminder · ${weekId}`,
    html,
    text,
    trigger: "goals_weekly_planning",
    metadata: { weekId },
  }).catch((error) => {
    logger.error("Weekly reminder email failed", {
      uid: user.uid,
      weekId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return false;
  });

  return {
    sent: true,
    sentEmail,
    weekId,
  };
}

async function sendWrapUpReminderForUser(user: GoalUser, now: Date) {
  if (!user.settings.enableWrapUp) return { sent: false, skipped: "disabled" };

  const currentHm = timeInTimezone(now, user.settings.timezone);
  if (currentHm !== user.settings.wrapUpTime) {
    return { sent: false, skipped: "time-mismatch" };
  }

  const dateId = dateIdInTimezone(now, user.settings.timezone);

  const canDispatch = await claimDispatch({
    uid: user.uid,
    fieldName: "wrapUpByDate",
    key: dateId,
  });

  if (!canDispatch) {
    return { sent: false, skipped: "already-sent" };
  }

  const dayPlanSnap = await adminDb
    .collection("users")
    .doc(user.uid)
    .collection("dayPlans")
    .doc(dateId)
    .get();

  const dayPlanData = (dayPlanSnap.data() ?? {}) as Record<string, unknown>;
  const reviewedAt = dayPlanData.reviewedAt;
  if (reviewedAt) {
    return { sent: false, skipped: "already-reviewed" };
  }

  await createNotification({
    recipientId: user.uid,
    dedupeKey: `goals:wrap-up:${user.uid}:${dateId}`,
    module: "goals",
    sourceType: "goals_wrap_up",
    sourceId: dateId,
    title: "Wrap-up reminder",
    body: "Your day is still open. Run a quick end-of-day review.",
    priority: "medium",
    ctaUrl: "/sa/goals/today",
    metadata: { dateId },
  });

  const html = `<p>Wrap-up reminder for ${escapeHtml(dateId)}.</p><p>Open <a href="${escapeHtml(absoluteLink("/sa/goals/today"))}">Goals Today</a> and complete your end-of-day review.</p>`;
  const text = `Wrap-up reminder for ${dateId}. Open ${absoluteLink("/sa/goals/today")} and complete your end-of-day review.`;

  const sentEmail = await sendEmailIfAllowed({
    uid: user.uid,
    to: user.email,
    subject: `Wrap-up reminder · ${dateId}`,
    html,
    text,
    trigger: "goals_wrap_up",
    metadata: { dateId },
  }).catch((error) => {
    logger.error("Wrap-up email failed", {
      uid: user.uid,
      dateId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return false;
  });

  return {
    sent: true,
    sentEmail,
    dateId,
  };
}

export const goalsDailyBriefScheduler = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "America/Montreal",
    region: "us-central1",
  },
  async () => {
    const users = await listGoalUsers();
    const now = new Date();
    let sentCount = 0;

    for (const user of users) {
      const result = await sendDailyBriefForUser(user, now);
      if (result.sent) sentCount += 1;
    }

    logger.info("Goals daily brief sweep complete", {
      sentCount,
      userCount: users.length,
      now: now.toISOString(),
    });
  },
);

export const goalsWeeklyPlanningScheduler = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "America/Montreal",
    region: "us-central1",
  },
  async () => {
    const users = await listGoalUsers();
    const now = new Date();
    let sentCount = 0;

    for (const user of users) {
      const result = await sendWeeklyReminderForUser(user, now);
      if (result.sent) sentCount += 1;
    }

    logger.info("Goals weekly planning sweep complete", {
      sentCount,
      userCount: users.length,
      now: now.toISOString(),
    });
  },
);

export const goalsWrapUpScheduler = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "America/Montreal",
    region: "us-central1",
  },
  async () => {
    const users = await listGoalUsers();
    const now = new Date();
    let sentCount = 0;

    for (const user of users) {
      const result = await sendWrapUpReminderForUser(user, now);
      if (result.sent) sentCount += 1;
    }

    logger.info("Goals wrap-up sweep complete", {
      sentCount,
      userCount: users.length,
      now: now.toISOString(),
    });
  },
);
