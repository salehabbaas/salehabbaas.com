import "server-only";

import { createHash } from "node:crypto";

import { addDays, format, parseISO } from "date-fns";

import { adminDb } from "@/lib/firebase/admin";
import { badgeCatalog, defaultGoalReminderRules } from "@/lib/goals/constants";
import {
  currentWeekId,
  dateIdFromDate,
  nextDateId,
  todayDateId,
  weekIdFromDateId,
} from "@/lib/goals/date";
import { defaultXpForPriority, streakBonus } from "@/lib/goals/scoring";
import type {
  GoalBadgeDoc,
  GoalBoardDoc,
  GoalBoardQuery,
  GoalBoardResponse,
  GoalDayPlan,
  GoalLearningPlan,
  GoalLearningSession,
  GoalLearningStats,
  GoalPointsLedgerEntry,
  GoalReminderRuleDoc,
  GoalSticker,
  GoalStickerLearning,
  GoalStickerPriority,
  GoalStickerStatus,
  GoalWeekPlan,
} from "@/types/goals";

function toIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    value &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return undefined;
}

function dedupeId(input: string) {
  return createHash("sha256").update(input).digest("hex").slice(0, 36);
}

function userRoot(uid: string) {
  return adminDb.collection("users").doc(uid);
}

function boardRef(uid: string) {
  return userRoot(uid).collection("goalsBoards").doc("default");
}

function stickersCollection(uid: string) {
  return userRoot(uid).collection("stickers");
}

function dayPlansCollection(uid: string) {
  return userRoot(uid).collection("dayPlans");
}

function weekPlansCollection(uid: string) {
  return userRoot(uid).collection("weekPlans");
}

function learningPlansCollection(uid: string) {
  return userRoot(uid).collection("learningPlans");
}

function learningSessionsCollection(uid: string) {
  return userRoot(uid).collection("learningSessions");
}

function learningStatsCollection(uid: string) {
  return userRoot(uid).collection("learningStats");
}

function pointsLedgerCollection(uid: string) {
  return userRoot(uid).collection("pointsLedger");
}

function badgesCollection(uid: string) {
  return userRoot(uid).collection("badges");
}

function reminderRulesCollection(uid: string) {
  return userRoot(uid).collection("reminderRules");
}

function notificationEventsCollection(uid: string) {
  return userRoot(uid).collection("notificationEvents");
}

function notificationsCollection(uid: string) {
  return userRoot(uid).collection("notifications");
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function clampPriority(value: unknown): GoalStickerPriority {
  if (value === "low" || value === "medium" || value === "high") return value;
  return "medium";
}

function clampStatus(value: unknown): GoalStickerStatus {
  if (value === "inbox" || value === "this_week" || value === "today" || value === "done") return value;
  return "inbox";
}

function mapStickerLearning(value: unknown): GoalStickerLearning {
  const learning = toRecord(value);
  if (!Object.keys(learning).length) return null;

  const normalized: NonNullable<GoalStickerLearning> = {};

  if (typeof learning.learningArea === "string" && learning.learningArea.trim()) {
    normalized.learningArea = learning.learningArea.trim();
  }
  if (typeof learning.learningOutcome === "string" && learning.learningOutcome.trim()) {
    normalized.learningOutcome = learning.learningOutcome.trim();
  }
  if (
    learning.difficulty === "beginner" ||
    learning.difficulty === "intermediate" ||
    learning.difficulty === "advanced"
  ) {
    normalized.difficulty = learning.difficulty;
  }
  if (
    learning.studyType === "read" ||
    learning.studyType === "watch" ||
    learning.studyType === "build" ||
    learning.studyType === "practice" ||
    learning.studyType === "review"
  ) {
    normalized.studyType = learning.studyType;
  }
  if (typeof learning.resourceLink === "string" && learning.resourceLink.trim()) {
    normalized.resourceLink = learning.resourceLink.trim();
  }
  if (
    typeof learning.timeBoxMinutes === "number" &&
    Number.isFinite(learning.timeBoxMinutes)
  ) {
    normalized.timeBoxMinutes = Math.max(
      5,
      Math.floor(Number(learning.timeBoxMinutes)),
    );
  }

  return Object.keys(normalized).length ? normalized : null;
}

const statusSortOrder: Record<GoalStickerStatus, number> = {
  inbox: 0,
  this_week: 1,
  today: 2,
  done: 3,
};

function mapSticker(id: string, data: Record<string, unknown>): GoalSticker {
  const sourceRaw = toRecord(data.source);
  const sourceType =
    sourceRaw.type === "manual" || sourceRaw.type === "projectTask"
      ? sourceRaw.type
      : null;

  return {
    id,
    workspaceId:
      typeof data.workspaceId === "string" && data.workspaceId.trim()
        ? data.workspaceId
        : "main",
    userId: typeof data.userId === "string" ? data.userId : "",
    title: typeof data.title === "string" ? data.title : "",
    notes: typeof data.notes === "string" ? data.notes : "",
    status: clampStatus(data.status),
    tags: Array.isArray(data.tags)
      ? data.tags.filter((item): item is string => typeof item === "string")
      : [],
    color: typeof data.color === "string" && data.color ? data.color : "amber",
    priority: clampPriority(data.priority),
    estimateMinutes:
      typeof data.estimateMinutes === "number" &&
      Number.isFinite(data.estimateMinutes)
        ? Number(data.estimateMinutes)
        : null,
    xpValue:
      typeof data.xpValue === "number" && Number.isFinite(data.xpValue)
        ? Math.max(1, Math.floor(Number(data.xpValue)))
        : defaultXpForPriority(clampPriority(data.priority), null),
    plannedDate:
      typeof data.plannedDate === "string" && data.plannedDate.trim()
        ? data.plannedDate
        : null,
    completedAt: toIso(data.completedAt),
    source: sourceType
      ? {
          type: sourceType,
          ...(typeof sourceRaw.projectId === "string" && sourceRaw.projectId
            ? { projectId: sourceRaw.projectId }
            : {}),
          ...(typeof sourceRaw.taskId === "string" && sourceRaw.taskId
            ? { taskId: sourceRaw.taskId }
            : {}),
        }
      : null,
    learning: mapStickerLearning(data.learning),
    order:
      typeof data.order === "number" && Number.isFinite(data.order)
        ? Number(data.order)
        : 0,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function mapLearningPlan(id: string, data: Record<string, unknown>): GoalLearningPlan {
  return {
    id,
    workspaceId:
      typeof data.workspaceId === "string" && data.workspaceId.trim()
        ? data.workspaceId
        : "main",
    userId: typeof data.userId === "string" ? data.userId : "",
    weekId: typeof data.weekId === "string" && data.weekId.trim() ? data.weekId : id,
    focusAreas: Array.isArray(data.focusAreas)
      ? data.focusAreas.filter((value): value is string => typeof value === "string")
      : [],
    stickerIds: Array.isArray(data.stickerIds)
      ? data.stickerIds.filter((value): value is string => typeof value === "string")
      : [],
    targetMinutes:
      typeof data.targetMinutes === "number" && Number.isFinite(data.targetMinutes)
        ? Math.max(30, Math.floor(Number(data.targetMinutes)))
        : 300,
    notes: typeof data.notes === "string" ? data.notes : "",
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function mapLearningSession(
  id: string,
  data: Record<string, unknown>,
): GoalLearningSession {
  return {
    id,
    workspaceId:
      typeof data.workspaceId === "string" && data.workspaceId.trim()
        ? data.workspaceId
        : "main",
    userId: typeof data.userId === "string" ? data.userId : "",
    dateId:
      typeof data.dateId === "string" && data.dateId.trim() ? data.dateId : "",
    stickerId: typeof data.stickerId === "string" ? data.stickerId : "",
    learningArea:
      typeof data.learningArea === "string" ? data.learningArea : "",
    minutesSpent:
      typeof data.minutesSpent === "number" && Number.isFinite(data.minutesSpent)
        ? Math.max(0, Math.floor(Number(data.minutesSpent)))
        : 0,
    notes: typeof data.notes === "string" ? data.notes : "",
    completed: data.completed === true,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function mapLearningStats(id: string, data: Record<string, unknown>): GoalLearningStats {
  return {
    id,
    workspaceId:
      typeof data.workspaceId === "string" && data.workspaceId.trim()
        ? data.workspaceId
        : "main",
    userId: typeof data.userId === "string" ? data.userId : "",
    currentStreak:
      typeof data.currentStreak === "number" && Number.isFinite(data.currentStreak)
        ? Math.max(0, Math.floor(Number(data.currentStreak)))
        : 0,
    longestStreak:
      typeof data.longestStreak === "number" && Number.isFinite(data.longestStreak)
        ? Math.max(0, Math.floor(Number(data.longestStreak)))
        : 0,
    totalMinutes:
      typeof data.totalMinutes === "number" && Number.isFinite(data.totalMinutes)
        ? Math.max(0, Math.floor(Number(data.totalMinutes)))
        : 0,
    sessionsCount:
      typeof data.sessionsCount === "number" && Number.isFinite(data.sessionsCount)
        ? Math.max(0, Math.floor(Number(data.sessionsCount)))
        : 0,
    updatedAt: toIso(data.updatedAt),
  };
}

function mapDayPlan(id: string, data: Record<string, unknown>): GoalDayPlan {
  const forceRules = toRecord(data.forceRulesSnapshot);
  return {
    id,
    workspaceId:
      typeof data.workspaceId === "string" && data.workspaceId.trim()
        ? data.workspaceId
        : "main",
    userId: typeof data.userId === "string" ? data.userId : "",
    dateId:
      typeof data.dateId === "string" && data.dateId.trim() ? data.dateId : id,
    stickerIds: Array.isArray(data.stickerIds)
      ? data.stickerIds.filter((value): value is string => typeof value === "string")
      : [],
    startedAt: toIso(data.startedAt),
    reviewedAt: toIso(data.reviewedAt),
    forceRulesSnapshot: {
      minTasksRequired:
        typeof forceRules.minTasksRequired === "number" &&
        Number.isFinite(forceRules.minTasksRequired)
          ? Math.max(1, Math.floor(Number(forceRules.minTasksRequired)))
          : defaultGoalReminderRules.minTasksRequired,
      maxTasksRecommended:
        typeof forceRules.maxTasksRecommended === "number" &&
        Number.isFinite(forceRules.maxTasksRecommended)
          ? Math.max(1, Math.floor(Number(forceRules.maxTasksRecommended)))
          : defaultGoalReminderRules.maxTasksRecommended,
    },
    whatWentWell:
      typeof data.whatWentWell === "string" ? data.whatWentWell : "",
    whatToImprove:
      typeof data.whatToImprove === "string" ? data.whatToImprove : "",
    aiSummary: typeof data.aiSummary === "string" ? data.aiSummary : "",
    reviewedCompletedCount:
      typeof data.reviewedCompletedCount === "number" &&
      Number.isFinite(data.reviewedCompletedCount)
        ? Math.max(0, Math.floor(Number(data.reviewedCompletedCount)))
        : undefined,
    reviewedPlannedCount:
      typeof data.reviewedPlannedCount === "number" &&
      Number.isFinite(data.reviewedPlannedCount)
        ? Math.max(0, Math.floor(Number(data.reviewedPlannedCount)))
        : undefined,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function mapWeekPlan(id: string, data: Record<string, unknown>): GoalWeekPlan {
  return {
    id,
    workspaceId:
      typeof data.workspaceId === "string" && data.workspaceId.trim()
        ? data.workspaceId
        : "main",
    userId: typeof data.userId === "string" ? data.userId : "",
    weekId: typeof data.weekId === "string" ? data.weekId : id,
    stickerIds: Array.isArray(data.stickerIds)
      ? data.stickerIds.filter((value): value is string => typeof value === "string")
      : [],
    focusAreas: Array.isArray(data.focusAreas)
      ? data.focusAreas.filter((value): value is string => typeof value === "string")
      : [],
    notes: typeof data.notes === "string" ? data.notes : "",
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function mapBadge(id: string, data: Record<string, unknown>): GoalBadgeDoc {
  const catalog = badgeCatalog.find((badge) => badge.id === id);
  return {
    id,
    workspaceId:
      typeof data.workspaceId === "string" && data.workspaceId.trim()
        ? data.workspaceId
        : "main",
    userId: typeof data.userId === "string" ? data.userId : "",
    title:
      typeof data.title === "string" && data.title.trim()
        ? data.title
        : catalog?.title || id,
    description:
      typeof data.description === "string" && data.description.trim()
        ? data.description
        : catalog?.description || "",
    achieved: data.achieved === true,
    achievedAt: toIso(data.achievedAt),
    progress:
      typeof data.progress === "number" && Number.isFinite(data.progress)
        ? Math.max(0, Math.floor(Number(data.progress)))
        : 0,
    target:
      typeof data.target === "number" && Number.isFinite(data.target)
        ? Math.max(1, Math.floor(Number(data.target)))
        : catalog?.target || 1,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

function mapPointsLedger(
  id: string,
  data: Record<string, unknown>,
): GoalPointsLedgerEntry {
  return {
    id,
    workspaceId:
      typeof data.workspaceId === "string" && data.workspaceId.trim()
        ? data.workspaceId
        : "main",
    userId: typeof data.userId === "string" ? data.userId : "",
    dateId: typeof data.dateId === "string" ? data.dateId : "",
    stickerId: typeof data.stickerId === "string" ? data.stickerId : "",
    xp:
      typeof data.xp === "number" && Number.isFinite(data.xp)
        ? Math.floor(Number(data.xp))
        : 0,
    reason:
      data.reason === "sticker_completed" ||
      data.reason === "streak_bonus" ||
      data.reason === "weekly_planning" ||
      data.reason === "manual_adjustment"
        ? data.reason
        : "manual_adjustment",
    metadata:
      data.metadata && typeof data.metadata === "object"
        ? (data.metadata as Record<string, unknown>)
        : {},
    createdAt: toIso(data.createdAt),
  };
}

export async function ensureGoalsBoard(uid: string): Promise<GoalBoardDoc> {
  const ref = boardRef(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    const now = new Date();
    await ref.set({
      workspaceId: "main",
      userId: uid,
      title: "Goals Board",
      columns: ["inbox", "this_week", "today", "done"],
      createdAt: now,
      updatedAt: now,
    });
  }

  const latest = await ref.get();
  const data = (latest.data() ?? {}) as Record<string, unknown>;
  return {
    id: latest.id,
    workspaceId:
      typeof data.workspaceId === "string" && data.workspaceId
        ? data.workspaceId
        : "main",
    userId: typeof data.userId === "string" ? data.userId : uid,
    title:
      typeof data.title === "string" && data.title.trim()
        ? data.title
        : "Goals Board",
    columns: Array.isArray(data.columns)
      ? (data.columns.filter((item): item is GoalStickerStatus =>
          item === "inbox" ||
          item === "this_week" ||
          item === "today" ||
          item === "done",
        ) as GoalStickerStatus[])
      : ["inbox", "this_week", "today", "done"],
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

export async function getGoalReminderRules(
  uid: string,
): Promise<GoalReminderRuleDoc> {
  const ref = reminderRulesCollection(uid).doc("settings");
  const snap = await ref.get();

  if (!snap.exists) {
    const now = new Date();
    await ref.set({
      ...defaultGoalReminderRules,
      userId: uid,
      workspaceId: "main",
      id: "settings",
      createdAt: now,
      updatedAt: now,
    });
  }

  const latest = await ref.get();
  const data = (latest.data() ?? {}) as Record<string, unknown>;

  return {
    id: "settings",
    workspaceId:
      typeof data.workspaceId === "string" && data.workspaceId
        ? data.workspaceId
        : "main",
    userId: typeof data.userId === "string" && data.userId ? data.userId : uid,
    enableDailyBrief:
      typeof data.enableDailyBrief === "boolean"
        ? data.enableDailyBrief
        : defaultGoalReminderRules.enableDailyBrief,
    enableWrapUp:
      typeof data.enableWrapUp === "boolean"
        ? data.enableWrapUp
        : defaultGoalReminderRules.enableWrapUp,
    enableWeeklyPlanning:
      typeof data.enableWeeklyPlanning === "boolean"
        ? data.enableWeeklyPlanning
        : defaultGoalReminderRules.enableWeeklyPlanning,
    dailyBriefTime:
      typeof data.dailyBriefTime === "string" && data.dailyBriefTime
        ? data.dailyBriefTime
        : defaultGoalReminderRules.dailyBriefTime,
    wrapUpTime:
      typeof data.wrapUpTime === "string" && data.wrapUpTime
        ? data.wrapUpTime
        : defaultGoalReminderRules.wrapUpTime,
    weeklyPlanningTime:
      typeof data.weeklyPlanningTime === "string" && data.weeklyPlanningTime
        ? data.weeklyPlanningTime
        : defaultGoalReminderRules.weeklyPlanningTime,
    quietHoursStart:
      typeof data.quietHoursStart === "string" && data.quietHoursStart
        ? data.quietHoursStart
        : defaultGoalReminderRules.quietHoursStart,
    quietHoursEnd:
      typeof data.quietHoursEnd === "string" && data.quietHoursEnd
        ? data.quietHoursEnd
        : defaultGoalReminderRules.quietHoursEnd,
    timezone:
      typeof data.timezone === "string" && data.timezone
        ? data.timezone
        : defaultGoalReminderRules.timezone,
    forceDailyPlan:
      typeof data.forceDailyPlan === "boolean"
        ? data.forceDailyPlan
        : defaultGoalReminderRules.forceDailyPlan,
    minTasksRequired:
      typeof data.minTasksRequired === "number" &&
      Number.isFinite(data.minTasksRequired)
        ? Math.max(1, Math.floor(Number(data.minTasksRequired)))
        : defaultGoalReminderRules.minTasksRequired,
    maxTasksRecommended:
      typeof data.maxTasksRecommended === "number" &&
      Number.isFinite(data.maxTasksRecommended)
        ? Math.max(1, Math.floor(Number(data.maxTasksRecommended)))
        : defaultGoalReminderRules.maxTasksRecommended,
    streakMode:
      data.streakMode === "completion_only" ||
      data.streakMode === "completion_or_review"
        ? data.streakMode
        : defaultGoalReminderRules.streakMode,
    updatedAt: toIso(data.updatedAt),
  };
}

export async function updateGoalReminderRules(
  uid: string,
  patch: Partial<GoalReminderRuleDoc>,
) {
  const current = await getGoalReminderRules(uid);
  const now = new Date();

  const next: GoalReminderRuleDoc = {
    ...current,
    ...patch,
    id: "settings",
    userId: uid,
    workspaceId: "main",
    minTasksRequired: Math.max(1, patch.minTasksRequired ?? current.minTasksRequired),
    maxTasksRecommended: Math.max(
      1,
      patch.maxTasksRecommended ?? current.maxTasksRecommended,
    ),
    streakMode:
      patch.streakMode === "completion_only" ||
      patch.streakMode === "completion_or_review"
        ? patch.streakMode
        : current.streakMode,
    updatedAt: now.toISOString(),
  };

  await reminderRulesCollection(uid)
    .doc("settings")
    .set({
      ...next,
      updatedAt: now,
    }, { merge: true });

  return next;
}

function filterStickerByQuery(sticker: GoalSticker, query: GoalBoardQuery) {
  if (query.status && query.status !== "all" && sticker.status !== query.status) {
    return false;
  }
  if (
    query.priority &&
    query.priority !== "all" &&
    sticker.priority !== query.priority
  ) {
    return false;
  }
  if (query.tag && !sticker.tags.some((tag) => tag.toLowerCase() === query.tag?.toLowerCase())) {
    return false;
  }
  if (query.projectLinkedOnly && sticker.source?.type !== "projectTask") {
    return false;
  }
  if (query.learningOnly && !sticker.learning) {
    return false;
  }
  if (
    query.learningArea &&
    sticker.learning?.learningArea?.toLowerCase() !== query.learningArea.toLowerCase()
  ) {
    return false;
  }
  if (
    query.learningDifficulty &&
    query.learningDifficulty !== "all" &&
    sticker.learning?.difficulty !== query.learningDifficulty
  ) {
    return false;
  }
  if (query.studyType && query.studyType !== "all" && sticker.learning?.studyType !== query.studyType) {
    return false;
  }
  if (query.plannedDate && sticker.plannedDate !== query.plannedDate) {
    return false;
  }
  return true;
}

export async function listGoalStickers(
  uid: string,
  query: GoalBoardQuery,
): Promise<GoalBoardResponse> {
  const limit = Math.min(Math.max(query.limit ?? 120, 1), 200);
  const readLimit = Math.max(limit * 3, 120);

  let refQuery: FirebaseFirestore.Query = stickersCollection(uid)
    .orderBy("updatedAt", "desc")
    .limit(readLimit);

  if (query.cursor) {
    const cursorDoc = await stickersCollection(uid).doc(query.cursor).get();
    if (cursorDoc.exists) {
      refQuery = refQuery.startAfter(cursorDoc);
    }
  }

  const snap = await refQuery.get();
  const filtered = snap.docs
    .map((doc) => mapSticker(doc.id, doc.data() as Record<string, unknown>))
    .filter((sticker) => filterStickerByQuery(sticker, query))
    .sort((a, b) => {
      if (a.status !== b.status) {
        return statusSortOrder[a.status] - statusSortOrder[b.status];
      }
      if (a.order !== b.order) return a.order - b.order;
      return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    })
    .slice(0, limit);

  return {
    stickers: filtered,
    nextCursor: snap.docs.length ? snap.docs[snap.docs.length - 1].id : null,
  };
}

export async function createGoalSticker(
  uid: string,
  input: {
    title: string;
    notes?: string;
    status?: GoalStickerStatus;
    tags?: string[];
    color?: string;
    priority?: GoalStickerPriority;
    estimateMinutes?: number | null;
    xpValue?: number;
    plannedDate?: string | null;
    source?: GoalSticker["source"];
    learning?: GoalSticker["learning"];
  },
) {
  const now = new Date();
  const status = input.status ?? "inbox";
  const priority = input.priority ?? "medium";
  const estimateMinutes = input.estimateMinutes ?? null;
  const xpValue =
    typeof input.xpValue === "number" && Number.isFinite(input.xpValue)
      ? Math.max(1, Math.floor(input.xpValue))
      : defaultXpForPriority(priority, estimateMinutes);

  const topInColumn = await stickersCollection(uid)
    .where("status", "==", status)
    .orderBy("order", "desc")
    .limit(1)
    .get();
  const nextOrder = topInColumn.docs.length
    ? Number(topInColumn.docs[0].data().order ?? 0) + 1
    : 0;

  const ref = stickersCollection(uid).doc();

  await ref.set({
    workspaceId: "main",
    userId: uid,
    title: input.title,
    notes: input.notes ?? "",
    status,
    tags: Array.from(new Set(input.tags ?? [])),
    color: input.color ?? "amber",
    priority,
    estimateMinutes,
    xpValue,
    plannedDate: input.plannedDate ?? null,
    completedAt: null,
    source: input.source ?? { type: "manual" },
    learning: mapStickerLearning(input.learning),
    order: nextOrder,
    createdAt: now,
    updatedAt: now,
  });

  const created = await ref.get();
  return mapSticker(created.id, (created.data() ?? {}) as Record<string, unknown>);
}

async function recordPointsEntryIfMissing(input: {
  uid: string;
  entryId: string;
  dateId: string;
  xp: number;
  reason: GoalPointsLedgerEntry["reason"];
  stickerId?: string;
  metadata?: Record<string, unknown>;
}) {
  const ref = pointsLedgerCollection(input.uid).doc(input.entryId);
  const snap = await ref.get();
  if (snap.exists) return false;

  await ref.set({
    workspaceId: "main",
    userId: input.uid,
    dateId: input.dateId,
    xp: input.xp,
    reason: input.reason,
    stickerId: input.stickerId ?? "",
    metadata: input.metadata ?? {},
    createdAt: new Date(),
  });
  return true;
}

async function buildCompletionActivity(input: {
  uid: string;
  timezone: string;
  lookbackDays: number;
}) {
  const lowerBoundDate = format(
    addDays(new Date(), -Math.max(input.lookbackDays, 7)),
    "yyyy-MM-dd",
  );

  const [stickersSnap, dayPlansSnap] = await Promise.all([
    stickersCollection(input.uid)
      .where("status", "==", "done")
      .orderBy("updatedAt", "desc")
      .limit(1200)
      .get(),
    dayPlansCollection(input.uid).where("dateId", ">=", lowerBoundDate).get(),
  ]);

  const completionCountByDate = new Map<string, number>();
  stickersSnap.docs.forEach((doc) => {
    const sticker = mapSticker(doc.id, doc.data() as Record<string, unknown>);
    const completionDateId =
      sticker.plannedDate ||
      (sticker.completedAt
        ? dateIdFromDate(new Date(sticker.completedAt), input.timezone)
        : "");
    if (!completionDateId) return;
    completionCountByDate.set(
      completionDateId,
      (completionCountByDate.get(completionDateId) ?? 0) + 1,
    );
  });

  const reviewedCountByDate = new Map<
    string,
    { completedCount: number; plannedCount: number }
  >();
  dayPlansSnap.docs.forEach((doc) => {
    const plan = mapDayPlan(doc.id, doc.data() as Record<string, unknown>);
    if (!plan.reviewedAt) return;
    reviewedCountByDate.set(plan.dateId, {
      completedCount: plan.reviewedCompletedCount ?? 0,
      plannedCount: plan.reviewedPlannedCount ?? plan.stickerIds.length,
    });
  });

  return {
    completionCountByDate,
    reviewedCountByDate,
  };
}

export async function computeCurrentGoalsStreak(
  uid: string,
  settings?: GoalReminderRuleDoc,
) {
  const rules = settings ?? (await getGoalReminderRules(uid));
  const today = todayDateId(rules.timezone);
  const activity = await buildCompletionActivity({
    uid,
    timezone: rules.timezone,
    lookbackDays: 90,
  });

  let streak = 0;
  let cursor = today;

  for (let day = 0; day < 90; day += 1) {
    const completionCount = activity.completionCountByDate.get(cursor) ?? 0;
    const reviewed = activity.reviewedCountByDate.get(cursor);

    const qualifiesByReview =
      rules.streakMode === "completion_or_review" &&
      Boolean(reviewed) &&
      (reviewed?.completedCount ?? 0) >=
        Math.max(1, rules.minTasksRequired, reviewed?.plannedCount ?? 0);

    const qualifies = completionCount > 0 || qualifiesByReview;

    if (!qualifies) break;
    streak += 1;
    cursor = nextDateId(cursor, -1);
  }

  return streak;
}

async function computeCompletedStickerCount(uid: string) {
  const snap = await stickersCollection(uid).where("status", "==", "done").get();
  return snap.size;
}

async function getCurrentWeekPlan(uid: string, timezone: string) {
  const weekId = currentWeekId(timezone);
  const snap = await weekPlansCollection(uid).doc(weekId).get();
  if (!snap.exists) return null;
  return mapWeekPlan(snap.id, (snap.data() ?? {}) as Record<string, unknown>);
}

export async function syncGoalBadges(uid: string) {
  const settings = await getGoalReminderRules(uid);
  const [completedCount, streak, weekPlan] = await Promise.all([
    computeCompletedStickerCount(uid),
    computeCurrentGoalsStreak(uid, settings),
    getCurrentWeekPlan(uid, settings.timezone),
  ]);

  const progressByBadge: Record<string, number> = {
    "streak-7": streak,
    "tasks-50": completedCount,
    "full-week-plan": weekPlan?.stickerIds.length ?? 0,
  };

  const now = new Date();
  const batch = adminDb.batch();
  const badgesSnap = await badgesCollection(uid).get();
  const existing = new Map(
    badgesSnap.docs.map((doc) => [
      doc.id,
      mapBadge(doc.id, doc.data() as Record<string, unknown>),
    ]),
  );

  for (const badge of badgeCatalog) {
    const progress = Math.max(0, progressByBadge[badge.id] ?? 0);
    const achieved = progress >= badge.target;
    const current = existing.get(badge.id);

    batch.set(
      badgesCollection(uid).doc(badge.id),
      {
        workspaceId: "main",
        userId: uid,
        title: badge.title,
        description: badge.description,
        progress,
        target: badge.target,
        achieved,
        achievedAt:
          achieved && !current?.achieved
            ? now
            : current?.achievedAt
              ? new Date(current.achievedAt)
              : null,
        updatedAt: now,
        ...(current ? {} : { createdAt: now }),
      },
      { merge: true },
    );
  }

  await batch.commit();

  const synced = await badgesCollection(uid).get();
  return synced.docs
    .map((doc) => mapBadge(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => a.title.localeCompare(b.title));
}

async function awardStickerCompletionXp(input: {
  uid: string;
  sticker: GoalSticker;
}) {
  const settings = await getGoalReminderRules(input.uid);
  const completedAt = input.sticker.completedAt
    ? new Date(input.sticker.completedAt)
    : new Date();
  const dateId = input.sticker.plannedDate || dateIdFromDate(completedAt, settings.timezone);

  const baseEntryId = `sticker-complete-${input.sticker.id}`;
  const baseCreated = await recordPointsEntryIfMissing({
    uid: input.uid,
    entryId: baseEntryId,
    dateId,
    xp: input.sticker.xpValue,
    reason: "sticker_completed",
    stickerId: input.sticker.id,
    metadata: {
      status: input.sticker.status,
      priority: input.sticker.priority,
    },
  });

  if (!baseCreated) {
    return {
      awardedBaseXp: 0,
      awardedBonusXp: 0,
      streak: await computeCurrentGoalsStreak(input.uid, settings),
    };
  }

  const streak = await computeCurrentGoalsStreak(input.uid, settings);
  const bonus = streakBonus(streak);

  if (bonus > 0) {
    await recordPointsEntryIfMissing({
      uid: input.uid,
      entryId: `streak-bonus-${input.sticker.id}`,
      dateId,
      xp: bonus,
      reason: "streak_bonus",
      stickerId: input.sticker.id,
      metadata: {
        streak,
      },
    });
  }

  await syncGoalBadges(input.uid);

  return {
    awardedBaseXp: input.sticker.xpValue,
    awardedBonusXp: bonus,
    streak,
  };
}

export async function updateGoalSticker(
  uid: string,
  stickerId: string,
  patch: Partial<GoalSticker> & { complete?: boolean },
) {
  const ref = stickersCollection(uid).doc(stickerId);
  const now = new Date();

  const updatedSticker = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new Error("Sticker not found");
    }

    const current = mapSticker(snap.id, (snap.data() ?? {}) as Record<string, unknown>);

    const nextPriority = patch.priority ?? current.priority;
    const nextEstimate =
      patch.estimateMinutes !== undefined
        ? patch.estimateMinutes
        : current.estimateMinutes;

    const nextXpValue =
      typeof patch.xpValue === "number" && Number.isFinite(patch.xpValue)
        ? Math.max(1, Math.floor(patch.xpValue))
        : patch.priority !== undefined || patch.estimateMinutes !== undefined
          ? defaultXpForPriority(nextPriority, nextEstimate)
          : current.xpValue;

    const payload: Record<string, unknown> = {
      updatedAt: now,
      ...(typeof patch.title === "string" ? { title: patch.title } : {}),
      ...(typeof patch.notes === "string" ? { notes: patch.notes } : {}),
      ...(patch.status ? { status: patch.status } : {}),
      ...(Array.isArray(patch.tags) ? { tags: Array.from(new Set(patch.tags)) } : {}),
      ...(typeof patch.color === "string" ? { color: patch.color } : {}),
      ...(patch.priority ? { priority: patch.priority } : {}),
      ...(patch.estimateMinutes !== undefined
        ? { estimateMinutes: patch.estimateMinutes }
        : {}),
      ...(patch.plannedDate !== undefined
        ? { plannedDate: patch.plannedDate }
        : {}),
      ...(patch.source !== undefined ? { source: patch.source } : {}),
      ...(patch.learning !== undefined ? { learning: mapStickerLearning(patch.learning) } : {}),
      xpValue: nextXpValue,
    };

    const isCompleting = patch.complete === true || patch.status === "done";
    if (isCompleting) {
      payload.status = "done";
      payload.completedAt = current.completedAt ? new Date(current.completedAt) : now;
    } else if (patch.complete === false || (patch.status && patch.status !== "done")) {
      payload.completedAt = null;
    }

    const statusAfter = (payload.status as GoalStickerStatus | undefined) ?? current.status;
    if (statusAfter !== current.status) {
      const topInColumn = await tx.get(
        stickersCollection(uid)
          .where("status", "==", statusAfter)
          .orderBy("order", "desc")
          .limit(1),
      );
      const nextOrder = topInColumn.docs.length
        ? Number(topInColumn.docs[0].data().order ?? 0) + 1
        : 0;
      payload.order = nextOrder;
    }

    tx.set(ref, payload, { merge: true });

    return mapSticker(current.id, {
      ...current,
      ...payload,
      completedAt:
        payload.completedAt instanceof Date
          ? payload.completedAt.toISOString()
          : (payload.completedAt as string | null | undefined) ?? current.completedAt,
    });
  });

  if (updatedSticker.completedAt && updatedSticker.status === "done") {
    await awardStickerCompletionXp({
      uid,
      sticker: updatedSticker,
    });
    if (updatedSticker.learning) {
      await refreshGoalLearningStats(uid);
    }
  }

  return updatedSticker;
}

export async function reorderGoalStickers(
  uid: string,
  updates: Array<{ stickerId: string; status: GoalStickerStatus; order: number }>,
) {
  if (!updates.length) return;
  const now = new Date();
  const batch = adminDb.batch();

  updates.forEach((update) => {
    batch.set(
      stickersCollection(uid).doc(update.stickerId),
      {
        status: update.status,
        order: update.order,
        updatedAt: now,
      },
      { merge: true },
    );
  });

  await batch.commit();
}

async function fetchStickersByIds(uid: string, ids: string[]) {
  if (!ids.length) return [];
  const refs = ids.map((id) => stickersCollection(uid).doc(id));
  const snaps = await adminDb.getAll(...refs);
  return snaps
    .filter((doc) => doc.exists)
    .map((doc) => mapSticker(doc.id, (doc.data() ?? {}) as Record<string, unknown>));
}

export async function getGoalDayPlan(uid: string, dateId: string) {
  const snap = await dayPlansCollection(uid).doc(dateId).get();
  if (!snap.exists) return null;
  return mapDayPlan(snap.id, (snap.data() ?? {}) as Record<string, unknown>);
}

export async function upsertGoalDayPlan(input: {
  uid: string;
  dateId: string;
  stickerIds: string[];
  forceRulesSnapshot?: GoalDayPlan["forceRulesSnapshot"];
}) {
  const settings = await getGoalReminderRules(input.uid);
  const now = new Date();
  const payload = {
    workspaceId: "main",
    userId: input.uid,
    dateId: input.dateId,
    stickerIds: Array.from(new Set(input.stickerIds)),
    forceRulesSnapshot:
      input.forceRulesSnapshot ?? {
        minTasksRequired: settings.minTasksRequired,
        maxTasksRecommended: settings.maxTasksRecommended,
      },
    updatedAt: now,
  };

  await dayPlansCollection(input.uid)
    .doc(input.dateId)
    .set(
      {
        ...payload,
        createdAt: now,
      },
      { merge: true },
    );

  return getGoalDayPlan(input.uid, input.dateId);
}

export async function getTodayGoalsPayload(uid: string, dateId: string) {
  const settings = await getGoalReminderRules(uid);
  const [dayPlan, stickersSnap] = await Promise.all([
    getGoalDayPlan(uid, dateId),
    stickersCollection(uid).orderBy("updatedAt", "desc").limit(500).get(),
  ]);

  const stickers = stickersSnap.docs.map((doc) =>
    mapSticker(doc.id, doc.data() as Record<string, unknown>),
  );

  const planStickerIds = new Set(dayPlan?.stickerIds ?? []);
  const planStickers = stickers
    .filter((sticker) => planStickerIds.has(sticker.id))
    .sort((a, b) => a.order - b.order);

  const availableForToday = stickers
    .filter((sticker) => sticker.status !== "done")
    .sort((a, b) => {
      if (a.status !== b.status) {
        return statusSortOrder[a.status] - statusSortOrder[b.status];
      }
      return a.order - b.order;
    });

  return {
    dateId,
    settings,
    dayPlan,
    stickers,
    planStickers,
    availableForToday,
  };
}

export async function startGoalDay(input: { uid: string; dateId: string }) {
  const settings = await getGoalReminderRules(input.uid);
  const existing = await getGoalDayPlan(input.uid, input.dateId);

  if (!existing) {
    await upsertGoalDayPlan({
      uid: input.uid,
      dateId: input.dateId,
      stickerIds: [],
    });
  }

  const next = (await getGoalDayPlan(input.uid, input.dateId))!;

  if (settings.forceDailyPlan && next.stickerIds.length < settings.minTasksRequired) {
    throw new Error(
      `At least ${settings.minTasksRequired} sticker(s) are required before starting your day.`,
    );
  }

  if (!next.startedAt) {
    await dayPlansCollection(input.uid)
      .doc(input.dateId)
      .set(
        {
          startedAt: new Date(),
          updatedAt: new Date(),
        },
        { merge: true },
      );
  }

  return getGoalDayPlan(input.uid, input.dateId);
}

export async function reviewGoalDay(input: {
  uid: string;
  dateId: string;
  whatWentWell?: string;
  whatToImprove?: string;
  autoReschedule: "none" | "tomorrow" | "this_week" | "inbox";
}) {
  const settings = await getGoalReminderRules(input.uid);
  const plan = await getGoalDayPlan(input.uid, input.dateId);
  if (!plan) {
    throw new Error("No day plan exists for this date.");
  }

  const stickers = await fetchStickersByIds(input.uid, plan.stickerIds);
  const incomplete = stickers.filter((sticker) => sticker.status !== "done");
  const completedCount = stickers.length - incomplete.length;

  const now = new Date();
  const batch = adminDb.batch();

  batch.set(
    dayPlansCollection(input.uid).doc(input.dateId),
    {
      reviewedAt: now,
      whatWentWell: input.whatWentWell ?? "",
      whatToImprove: input.whatToImprove ?? "",
      reviewedCompletedCount: completedCount,
      reviewedPlannedCount: stickers.length,
      updatedAt: now,
    },
    { merge: true },
  );

  if (input.autoReschedule !== "none") {
    const tomorrow = nextDateId(input.dateId, 1);
    incomplete.forEach((sticker) => {
      if (input.autoReschedule === "tomorrow") {
        batch.set(
          stickersCollection(input.uid).doc(sticker.id),
          {
            status: "this_week",
            plannedDate: tomorrow,
            updatedAt: now,
          },
          { merge: true },
        );
      } else if (input.autoReschedule === "this_week") {
        batch.set(
          stickersCollection(input.uid).doc(sticker.id),
          {
            status: "this_week",
            plannedDate: null,
            updatedAt: now,
          },
          { merge: true },
        );
      } else {
        batch.set(
          stickersCollection(input.uid).doc(sticker.id),
          {
            status: "inbox",
            plannedDate: null,
            updatedAt: now,
          },
          { merge: true },
        );
      }
    });
  }

  await batch.commit();

  await syncGoalBadges(input.uid);

  if (
    settings.streakMode === "completion_or_review" &&
    completedCount >= Math.max(1, settings.minTasksRequired)
  ) {
    await createGoalNotification({
      uid: input.uid,
      dedupeKey: `day-review:${input.uid}:${input.dateId}`,
      sourceType: "day_review",
      sourceId: input.dateId,
      title: "Day review saved",
      body: `You reviewed ${completedCount}/${stickers.length} planned sticker(s).`,
      priority: "low",
      ctaUrl: "/sa/goals/today",
      metadata: {
        dateId: input.dateId,
      },
    });
  }

  return getGoalDayPlan(input.uid, input.dateId);
}

export async function getGoalWeekPlan(uid: string, weekId: string) {
  const snap = await weekPlansCollection(uid).doc(weekId).get();
  if (!snap.exists) return null;
  return mapWeekPlan(snap.id, (snap.data() ?? {}) as Record<string, unknown>);
}

async function awardWeeklyPlanningXpIfNeeded(input: {
  uid: string;
  weekId: string;
  stickerCount: number;
}) {
  if (input.stickerCount < 5) return false;

  const rules = await getGoalReminderRules(input.uid);
  const dateIds = weekIdToDateIds(input.weekId);
  const dateId = dateIds[0] || todayDateId(rules.timezone);

  return recordPointsEntryIfMissing({
    uid: input.uid,
    entryId: `week-plan-${input.weekId}`,
    dateId,
    xp: 25,
    reason: "weekly_planning",
    metadata: {
      weekId: input.weekId,
      stickerCount: input.stickerCount,
    },
  });
}

export function weekIdToDateIds(weekId: string) {
  const matched = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!matched) return [];
  const year = Number(matched[1]);
  const week = Number(matched[2]);
  if (!Number.isFinite(year) || !Number.isFinite(week)) return [];

  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const mondayWeek1 = addDays(jan4, -(dayOfWeek - 1));
  const monday = addDays(mondayWeek1, (week - 1) * 7);

  return Array.from({ length: 7 }, (_, index) =>
    format(addDays(monday, index), "yyyy-MM-dd"),
  );
}

export async function upsertGoalWeekPlan(input: {
  uid: string;
  weekId: string;
  stickerIds: string[];
  focusAreas?: string[];
  notes?: string;
}) {
  const now = new Date();

  await weekPlansCollection(input.uid)
    .doc(input.weekId)
    .set(
      {
        workspaceId: "main",
        userId: input.uid,
        weekId: input.weekId,
        stickerIds: Array.from(new Set(input.stickerIds)),
        focusAreas: Array.from(new Set(input.focusAreas ?? [])),
        notes: input.notes ?? "",
        updatedAt: now,
        createdAt: now,
      },
      { merge: true },
    );

  await awardWeeklyPlanningXpIfNeeded({
    uid: input.uid,
    weekId: input.weekId,
    stickerCount: input.stickerIds.length,
  });

  await syncGoalBadges(input.uid);

  return getGoalWeekPlan(input.uid, input.weekId);
}

export async function getGoalLearningPlan(uid: string, weekId: string) {
  const snap = await learningPlansCollection(uid).doc(weekId).get();
  if (!snap.exists) return null;
  return mapLearningPlan(snap.id, (snap.data() ?? {}) as Record<string, unknown>);
}

export async function upsertGoalLearningPlan(input: {
  uid: string;
  weekId: string;
  stickerIds: string[];
  focusAreas?: string[];
  targetMinutes?: number;
  notes?: string;
}) {
  const now = new Date();
  await learningPlansCollection(input.uid)
    .doc(input.weekId)
    .set(
      {
        workspaceId: "main",
        userId: input.uid,
        weekId: input.weekId,
        stickerIds: Array.from(new Set(input.stickerIds)),
        focusAreas: Array.from(new Set(input.focusAreas ?? [])),
        targetMinutes: Math.max(30, Math.floor(input.targetMinutes ?? 300)),
        notes: input.notes ?? "",
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    );

  return getGoalLearningPlan(input.uid, input.weekId);
}

export async function getLearningCandidateStickers(input: {
  uid: string;
  includeDone?: boolean;
  limit?: number;
}) {
  const statuses = input.includeDone
    ? (["inbox", "this_week", "today", "done"] as const)
    : (["inbox", "this_week", "today"] as const);

  const snaps = await Promise.all(
    statuses.map((status) =>
      stickersCollection(input.uid)
        .where("status", "==", status)
        .orderBy("updatedAt", "desc")
        .limit(Math.min(Math.max(input.limit ?? 200, 1), 500))
        .get(),
    ),
  );

  return snaps
    .flatMap((snap) => snap.docs)
    .map((doc) => mapSticker(doc.id, doc.data() as Record<string, unknown>))
    .filter((sticker) => Boolean(sticker.learning));
}

export async function createGoalLearningSession(input: {
  uid: string;
  dateId: string;
  stickerId?: string;
  learningArea?: string;
  minutesSpent: number;
  notes?: string;
  completed: boolean;
}) {
  const now = new Date();
  const ref = learningSessionsCollection(input.uid).doc();

  await ref.set({
    workspaceId: "main",
    userId: input.uid,
    dateId: input.dateId,
    stickerId: input.stickerId ?? "",
    learningArea: input.learningArea ?? "",
    minutesSpent: Math.max(5, Math.floor(input.minutesSpent)),
    notes: input.notes ?? "",
    completed: input.completed,
    createdAt: now,
    updatedAt: now,
  });

  const snap = await ref.get();
  const session = mapLearningSession(snap.id, (snap.data() ?? {}) as Record<string, unknown>);
  await refreshGoalLearningStats(input.uid);
  return session;
}

export async function listGoalLearningSessions(input: {
  uid: string;
  fromDateId?: string;
  toDateId?: string;
  limit?: number;
}) {
  let query: FirebaseFirestore.Query = learningSessionsCollection(input.uid)
    .orderBy("dateId", "desc")
    .limit(Math.min(Math.max(input.limit ?? 200, 1), 1200));

  if (input.fromDateId) {
    query = query.where("dateId", ">=", input.fromDateId);
  }
  if (input.toDateId) {
    query = query.where("dateId", "<=", input.toDateId);
  }

  const snap = await query.get();
  return snap.docs.map((doc) =>
    mapLearningSession(doc.id, doc.data() as Record<string, unknown>),
  );
}

async function buildLearningActivity(input: {
  uid: string;
  timezone: string;
  lookbackDays: number;
}) {
  const lowerBoundDate = format(
    addDays(new Date(), -Math.max(input.lookbackDays, 7)),
    "yyyy-MM-dd",
  );

  const [sessionsSnap, doneStickersSnap] = await Promise.all([
    learningSessionsCollection(input.uid)
      .where("dateId", ">=", lowerBoundDate)
      .orderBy("dateId", "asc")
      .limit(2600)
      .get(),
    stickersCollection(input.uid)
      .where("status", "==", "done")
      .orderBy("updatedAt", "desc")
      .limit(2600)
      .get(),
  ]);

  const activeDates = new Set<string>();
  const minutesByDate = new Map<string, number>();
  const minutesByArea = new Map<string, number>();
  const completedByArea = new Map<string, number>();
  const sessionsByArea = new Map<string, number>();

  const sessions = sessionsSnap.docs.map((doc) =>
    mapLearningSession(doc.id, doc.data() as Record<string, unknown>),
  );

  sessions.forEach((session) => {
    if (!session.dateId) return;
    const area = session.learningArea || "General";
    minutesByDate.set(
      session.dateId,
      (minutesByDate.get(session.dateId) ?? 0) + session.minutesSpent,
    );
    minutesByArea.set(area, (minutesByArea.get(area) ?? 0) + session.minutesSpent);
    sessionsByArea.set(area, (sessionsByArea.get(area) ?? 0) + 1);
    if (session.completed) {
      activeDates.add(session.dateId);
    }
  });

  const doneLearningStickers = doneStickersSnap.docs
    .map((doc) => mapSticker(doc.id, doc.data() as Record<string, unknown>))
    .filter((sticker) => Boolean(sticker.learning));

  doneLearningStickers.forEach((sticker) => {
    const completedDateId =
      sticker.plannedDate ||
      (sticker.completedAt
        ? dateIdFromDate(new Date(sticker.completedAt), input.timezone)
        : "");
    if (!completedDateId) return;
    if (completedDateId >= lowerBoundDate) {
      activeDates.add(completedDateId);
    }
    const area = sticker.learning?.learningArea || "General";
    completedByArea.set(area, (completedByArea.get(area) ?? 0) + 1);
  });

  return {
    sessions,
    doneLearningStickers,
    activeDates,
    minutesByDate,
    minutesByArea,
    completedByArea,
    sessionsByArea,
  };
}

function computeStreaksFromDates(activeDates: Set<string>, timezone: string) {
  const today = todayDateId(timezone);
  let currentStreak = 0;
  let cursor = today;

  for (let day = 0; day < 370; day += 1) {
    if (!activeDates.has(cursor)) break;
    currentStreak += 1;
    cursor = nextDateId(cursor, -1);
  }

  let longestStreak = 0;
  let running = 0;
  for (let day = 365; day >= 0; day -= 1) {
    const dateId = nextDateId(today, -day);
    if (activeDates.has(dateId)) {
      running += 1;
      longestStreak = Math.max(longestStreak, running);
    } else {
      running = 0;
    }
  }

  return { currentStreak, longestStreak };
}

export async function computeGoalLearningStreaks(
  uid: string,
  settings?: GoalReminderRuleDoc,
) {
  const rules = settings ?? (await getGoalReminderRules(uid));
  const activity = await buildLearningActivity({
    uid,
    timezone: rules.timezone,
    lookbackDays: 365,
  });
  return computeStreaksFromDates(activity.activeDates, rules.timezone);
}

export async function refreshGoalLearningStats(uid: string) {
  const settings = await getGoalReminderRules(uid);
  const activity = await buildLearningActivity({
    uid,
    timezone: settings.timezone,
    lookbackDays: 365,
  });
  const streaks = computeStreaksFromDates(activity.activeDates, settings.timezone);

  const totalMinutes = activity.sessions.reduce(
    (sum, session) => sum + session.minutesSpent,
    0,
  );
  const sessionsCount = activity.sessions.length;

  const now = new Date();
  await learningStatsCollection(uid).doc("current").set(
    {
      workspaceId: "main",
      userId: uid,
      currentStreak: streaks.currentStreak,
      longestStreak: streaks.longestStreak,
      totalMinutes,
      sessionsCount,
      updatedAt: now,
      createdAt: now,
    },
    { merge: true },
  );

  const snap = await learningStatsCollection(uid).doc("current").get();
  return mapLearningStats(
    snap.id,
    (snap.data() ?? {}) as Record<string, unknown>,
  );
}

export async function getGoalLearningStats(uid: string) {
  const snap = await learningStatsCollection(uid).doc("current").get();
  if (!snap.exists) {
    return refreshGoalLearningStats(uid);
  }
  return mapLearningStats(snap.id, (snap.data() ?? {}) as Record<string, unknown>);
}

export async function getGoalLearningDashboard(input: {
  uid: string;
  weekId: string;
}) {
  const settings = await getGoalReminderRules(input.uid);
  const [plan, stats, activity, learningStickers] = await Promise.all([
    getGoalLearningPlan(input.uid, input.weekId),
    getGoalLearningStats(input.uid),
    buildLearningActivity({
      uid: input.uid,
      timezone: settings.timezone,
      lookbackDays: 120,
    }),
    getLearningCandidateStickers({
      uid: input.uid,
      includeDone: false,
      limit: 260,
    }),
  ]);

  const weekDateIds = weekIdToDateIds(input.weekId);
  const weekMinutes = weekDateIds.reduce(
    (sum, dateId) => sum + (activity.minutesByDate.get(dateId) ?? 0),
    0,
  );

  const areaRows = Array.from(
    new Set([
      ...activity.minutesByArea.keys(),
      ...activity.completedByArea.keys(),
      ...activity.sessionsByArea.keys(),
    ]),
  )
    .map((area) => ({
      area,
      minutes: activity.minutesByArea.get(area) ?? 0,
      completed: activity.completedByArea.get(area) ?? 0,
      sessions: activity.sessionsByArea.get(area) ?? 0,
    }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 12);

  const recentSessions = [...activity.sessions]
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, 30);

  return {
    weekId: input.weekId,
    settings,
    stats,
    plan,
    weekMinutes,
    areaRows,
    recentSessions,
    learningStickers: learningStickers.slice(0, 200),
  };
}

export async function getGoalLearningStreaks(uid: string) {
  const settings = await getGoalReminderRules(uid);
  const [stats, activity] = await Promise.all([
    getGoalLearningStats(uid),
    buildLearningActivity({
      uid,
      timezone: settings.timezone,
      lookbackDays: 120,
    }),
  ]);

  const today = todayDateId(settings.timezone);
  const heatmap = Array.from({ length: 56 }, (_, index) => {
    const dateId = nextDateId(today, -(55 - index));
    return {
      dateId,
      active: activity.activeDates.has(dateId),
      minutes: activity.minutesByDate.get(dateId) ?? 0,
    };
  });

  const monthMinutes = heatmap.slice(-30).reduce((sum, item) => sum + item.minutes, 0);

  return {
    stats,
    heatmap,
    monthMinutes,
  };
}

export async function createGoalNotification(input: {
  uid: string;
  dedupeKey: string;
  sourceType: string;
  sourceId: string;
  title: string;
  body: string;
  priority?: "low" | "medium" | "high" | "critical";
  ctaUrl?: string;
  metadata?: Record<string, unknown>;
}) {
  const now = new Date();
  const notificationId = dedupeId(input.dedupeKey);

  const eventRef = notificationEventsCollection(input.uid).doc(notificationId);
  const notificationRef = notificationsCollection(input.uid).doc(notificationId);
  const eventSnap = await eventRef.get();

  if (eventSnap.exists) {
    return {
      created: false,
      id: notificationId,
    };
  }

  const payload = {
    workspaceId: "main",
    userId: input.uid,
    module: "goals",
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    title: input.title,
    body: input.body,
    priority: input.priority ?? "medium",
    state: "unread",
    channels: {
      inApp: true,
      banner: true,
      push: false,
    },
    ctaUrl: input.ctaUrl ?? "/sa/goals",
    metadata: input.metadata ?? {},
    createdAt: now,
    updatedAt: now,
    readAt: null,
    dismissedAt: null,
  };

  await Promise.all([eventRef.set(payload), notificationRef.set(payload)]);

  return {
    created: true,
    id: notificationId,
  };
}

export async function getGoalsAchievements(uid: string) {
  const settings = await getGoalReminderRules(uid);
  const [ledgerSnap, stickersSnap, badgesSnap] = await Promise.all([
    pointsLedgerCollection(uid).orderBy("createdAt", "desc").limit(1600).get(),
    stickersCollection(uid).where("status", "==", "done").get(),
    badgesCollection(uid).get(),
  ]);

  const ledger = ledgerSnap.docs.map((doc) =>
    mapPointsLedger(doc.id, doc.data() as Record<string, unknown>),
  );

  const totalXp = ledger.reduce((sum, entry) => sum + entry.xp, 0);
  const completedCount = stickersSnap.size;
  const streak = await computeCurrentGoalsStreak(uid, settings);

  const xpByDay = new Map<string, number>();
  const completionByDay = new Map<string, number>();

  ledger.forEach((entry) => {
    if (!entry.dateId) return;
    xpByDay.set(entry.dateId, (xpByDay.get(entry.dateId) ?? 0) + entry.xp);
    if (entry.reason === "sticker_completed") {
      completionByDay.set(
        entry.dateId,
        (completionByDay.get(entry.dateId) ?? 0) + 1,
      );
    }
  });

  const today = todayDateId(settings.timezone);
  const chart = Array.from({ length: 14 }, (_, index) => {
    const dateId = nextDateId(today, -13 + index);
    return {
      dateId,
      xp: xpByDay.get(dateId) ?? 0,
      completed: completionByDay.get(dateId) ?? 0,
    };
  });

  const badges = badgesSnap.docs
    .map((doc) => mapBadge(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => a.title.localeCompare(b.title));

  return {
    totals: {
      totalXp,
      completedCount,
      streak,
      badgesUnlocked: badges.filter((badge) => badge.achieved).length,
    },
    chart,
    ledger: ledger.slice(0, 120),
    badges,
  };
}

export async function createStickerFromProjectTask(input: {
  uid: string;
  projectId: string;
  taskId: string;
  dateId?: string;
  status?: GoalStickerStatus;
}) {
  const taskSnap = await adminDb.collection("tasks").doc(input.taskId).get();
  if (!taskSnap.exists) {
    throw new Error("Task not found.");
  }

  const taskData = (taskSnap.data() ?? {}) as Record<string, unknown>;
  if (String(taskData.projectId ?? "") !== input.projectId) {
    throw new Error("Task does not belong to the selected project.");
  }

  const projectSnap = await adminDb.collection("projects").doc(input.projectId).get();
  const projectName = String(projectSnap.data()?.name ?? "Project");

  const title = String(taskData.title ?? "Project task").trim() || "Project task";
  const notes = `Linked from ${projectName}`;

  const status = input.status ?? (input.dateId ? "today" : "this_week");
  const sticker = await createGoalSticker(input.uid, {
    title,
    notes,
    status,
    priority:
      taskData.priority === "P1" || taskData.priority === "P2"
        ? "high"
        : taskData.priority === "P3"
          ? "medium"
          : "low",
    plannedDate: input.dateId ?? null,
    source: {
      type: "projectTask",
      projectId: input.projectId,
      taskId: input.taskId,
    },
  });

  if (input.dateId) {
    const dayPlan = await getGoalDayPlan(input.uid, input.dateId);
    const stickerIds = Array.from(
      new Set([...(dayPlan?.stickerIds ?? []), sticker.id]),
    );
    await upsertGoalDayPlan({
      uid: input.uid,
      dateId: input.dateId,
      stickerIds,
    });
  }

  return sticker;
}

export async function getGoalsOverview(uid: string) {
  const settings = await getGoalReminderRules(uid);
  const dateId = todayDateId(settings.timezone);
  const weekId = weekIdFromDateId(dateId);

  const [board, boardRows, dayPlan, weekPlan] = await Promise.all([
    ensureGoalsBoard(uid),
    listGoalStickers(uid, {
      limit: 220,
      status: "all",
      priority: "all",
      projectLinkedOnly: false,
    }),
    getGoalDayPlan(uid, dateId),
    getGoalWeekPlan(uid, weekId),
  ]);

  return {
    dateId,
    weekId,
    board,
    stickers: boardRows.stickers,
    nextCursor: boardRows.nextCursor,
    dayPlan,
    weekPlan,
    settings,
  };
}

export async function deleteGoalSticker(uid: string, stickerId: string) {
  await stickersCollection(uid).doc(stickerId).delete();

  const [dayPlansSnap, weekPlansSnap] = await Promise.all([
    dayPlansCollection(uid).where("stickerIds", "array-contains", stickerId).get(),
    weekPlansCollection(uid).where("stickerIds", "array-contains", stickerId).get(),
  ]);

  const batch = adminDb.batch();

  dayPlansSnap.docs.forEach((doc) => {
    const plan = mapDayPlan(doc.id, doc.data() as Record<string, unknown>);
    batch.set(
      doc.ref,
      {
        stickerIds: plan.stickerIds.filter((id) => id !== stickerId),
        updatedAt: new Date(),
      },
      { merge: true },
    );
  });

  weekPlansSnap.docs.forEach((doc) => {
    const plan = mapWeekPlan(doc.id, doc.data() as Record<string, unknown>);
    batch.set(
      doc.ref,
      {
        stickerIds: plan.stickerIds.filter((id) => id !== stickerId),
        updatedAt: new Date(),
      },
      { merge: true },
    );
  });

  await batch.commit();
}

export async function getDailyBriefContext(input: {
  uid: string;
  dateId: string;
  timezone: string;
}) {
  const yesterday = nextDateId(input.dateId, -1);

  const [todayPlan, yesterdayPlan, stickersSnap, ledgerSnap] = await Promise.all([
    getGoalDayPlan(input.uid, input.dateId),
    getGoalDayPlan(input.uid, yesterday),
    stickersCollection(input.uid).orderBy("updatedAt", "desc").limit(500).get(),
    pointsLedgerCollection(input.uid)
      .where("dateId", "==", yesterday)
      .orderBy("createdAt", "desc")
      .limit(200)
      .get(),
  ]);

  const stickers = stickersSnap.docs.map((doc) =>
    mapSticker(doc.id, doc.data() as Record<string, unknown>),
  );
  const ledger = ledgerSnap.docs.map((doc) =>
    mapPointsLedger(doc.id, doc.data() as Record<string, unknown>),
  );

  const yesterdayDoneCount = stickers.filter((sticker) => {
    const doneDate = sticker.completedAt
      ? dateIdFromDate(new Date(sticker.completedAt), input.timezone)
      : "";
    return sticker.status === "done" && (sticker.plannedDate === yesterday || doneDate === yesterday);
  }).length;

  const yesterdayXp = ledger.reduce((sum, entry) => sum + entry.xp, 0);

  const todayStickers = (todayPlan?.stickerIds ?? [])
    .map((id) => stickers.find((sticker) => sticker.id === id) ?? null)
    .filter((item): item is GoalSticker => Boolean(item));

  return {
    todayPlan,
    yesterdayPlan,
    todayStickers,
    yesterdayDoneCount,
    yesterdayXp,
  };
}

export async function ensureDailyBriefIdempotency(input: {
  uid: string;
  dateId: string;
}) {
  const stateRef = reminderRulesCollection(input.uid).doc("dailyBriefState");

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(stateRef);
    const current = (snap.data() ?? {}) as Record<string, unknown>;
    const sentMap = toRecord(current.dailyBriefByDate);
    if (sentMap[input.dateId]) {
      return {
        shouldSend: false,
      };
    }

    tx.set(
      stateRef,
      {
        workspaceId: "main",
        userId: input.uid,
        dailyBriefByDate: {
          ...sentMap,
          [input.dateId]: new Date(),
        },
        updatedAt: new Date(),
      },
      { merge: true },
    );

    return {
      shouldSend: true,
    };
  });
}

export function goalsLink(path: string) {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.DEFAULT_SITE_URL ||
    "https://salehabbaas.com";
  try {
    return new URL(path, origin).toString();
  } catch {
    return `https://salehabbaas.com${path}`;
  }
}

export async function listUsersWithGoalsEnabled() {
  const snap = await adminDb.collection("adminUsers").where("status", "==", "active").get();
  if (snap.empty) return [] as string[];

  const ids = snap.docs.map((doc) => doc.id);
  const settings = await Promise.all(ids.map((uid) => getGoalReminderRules(uid)));

  return settings.map((setting) => setting.userId);
}

export async function getStickersByIds(uid: string, stickerIds: string[]) {
  return fetchStickersByIds(uid, stickerIds);
}

export async function saveDayAiSummary(input: {
  uid: string;
  dateId: string;
  summary: string;
}) {
  await dayPlansCollection(input.uid).doc(input.dateId).set(
    {
      aiSummary: input.summary,
      updatedAt: new Date(),
    },
    { merge: true },
  );
}

export async function getBacklogStickers(uid: string) {
  const snap = await stickersCollection(uid)
    .where("status", "in", ["inbox", "this_week", "today"])
    .orderBy("updatedAt", "desc")
    .limit(400)
    .get();

  return snap.docs.map((doc) => mapSticker(doc.id, doc.data() as Record<string, unknown>));
}

export async function getDayPlanOrCreate(uid: string, dateId: string) {
  const existing = await getGoalDayPlan(uid, dateId);
  if (existing) return existing;
  await upsertGoalDayPlan({
    uid,
    dateId,
    stickerIds: [],
  });
  return getGoalDayPlan(uid, dateId);
}

export async function replaceDayPlanStickerIds(input: {
  uid: string;
  dateId: string;
  stickerIds: string[];
}) {
  await upsertGoalDayPlan({
    uid: input.uid,
    dateId: input.dateId,
    stickerIds: input.stickerIds,
  });
}

export async function getLatestCompletedStickers(input: {
  uid: string;
  limit?: number;
}) {
  const snap = await stickersCollection(input.uid)
    .where("status", "==", "done")
    .orderBy("completedAt", "desc")
    .limit(Math.min(Math.max(input.limit ?? 20, 1), 120))
    .get();

  return snap.docs.map((doc) => mapSticker(doc.id, doc.data() as Record<string, unknown>));
}

export function parseDateIdOrToday(dateId: string | null | undefined, timezone: string) {
  if (dateId && /^\d{4}-\d{2}-\d{2}$/.test(dateId)) return dateId;
  return todayDateId(timezone);
}

export function isoWeekFromDateId(dateId: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateId)) return currentWeekId();
  const parsed = parseISO(`${dateId}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return currentWeekId();
  return weekIdFromDateId(dateId);
}
