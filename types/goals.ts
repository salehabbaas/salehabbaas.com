export const goalStickerStatuses = [
  "inbox",
  "this_week",
  "today",
  "done",
] as const;

export type GoalStickerStatus = (typeof goalStickerStatuses)[number];

export const goalStickerPriorities = ["low", "medium", "high"] as const;

export type GoalStickerPriority = (typeof goalStickerPriorities)[number];

export const goalStickerSourceTypes = ["manual", "projectTask"] as const;

export type GoalStickerSourceType = (typeof goalStickerSourceTypes)[number];

export const goalLearningDifficulties = [
  "beginner",
  "intermediate",
  "advanced",
] as const;

export type GoalLearningDifficulty = (typeof goalLearningDifficulties)[number];

export const goalStudyTypes = [
  "read",
  "watch",
  "build",
  "practice",
  "review",
] as const;

export type GoalStudyType = (typeof goalStudyTypes)[number];

export type GoalStickerSource = {
  type: GoalStickerSourceType;
  projectId?: string;
  taskId?: string;
} | null;

export type GoalStickerLearning = {
  learningArea?: string;
  learningOutcome?: string;
  difficulty?: GoalLearningDifficulty;
  studyType?: GoalStudyType;
  resourceLink?: string;
  timeBoxMinutes?: number | null;
} | null;

export type GoalSticker = {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  notes?: string;
  status: GoalStickerStatus;
  tags: string[];
  color: string;
  priority: GoalStickerPriority;
  estimateMinutes: number | null;
  xpValue: number;
  plannedDate: string | null;
  completedAt?: string;
  source: GoalStickerSource;
  learning: GoalStickerLearning;
  order: number;
  createdAt?: string;
  updatedAt?: string;
};

export type GoalForceRulesSnapshot = {
  minTasksRequired: number;
  maxTasksRecommended: number;
};

export type GoalDayPlan = {
  id: string;
  workspaceId: string;
  userId: string;
  dateId: string;
  stickerIds: string[];
  startedAt?: string;
  reviewedAt?: string;
  forceRulesSnapshot: GoalForceRulesSnapshot;
  whatWentWell?: string;
  whatToImprove?: string;
  aiSummary?: string;
  reviewedCompletedCount?: number;
  reviewedPlannedCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type GoalWeekPlan = {
  id: string;
  workspaceId: string;
  userId: string;
  weekId: string;
  stickerIds: string[];
  focusAreas: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type GoalPointsReason =
  | "sticker_completed"
  | "streak_bonus"
  | "weekly_planning"
  | "manual_adjustment";

export type GoalPointsLedgerEntry = {
  id: string;
  workspaceId: string;
  userId: string;
  dateId: string;
  stickerId?: string;
  xp: number;
  reason: GoalPointsReason;
  metadata?: Record<string, unknown>;
  createdAt?: string;
};

export type GoalBadgeDoc = {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  description: string;
  achieved: boolean;
  achievedAt?: string;
  progress: number;
  target: number;
  createdAt?: string;
  updatedAt?: string;
};

export type GoalReminderRuleDoc = {
  id: string;
  workspaceId: string;
  userId: string;
  enableDailyBrief: boolean;
  enableWrapUp: boolean;
  enableWeeklyPlanning: boolean;
  dailyBriefTime: string;
  wrapUpTime: string;
  weeklyPlanningTime: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
  forceDailyPlan: boolean;
  minTasksRequired: number;
  maxTasksRecommended: number;
  streakMode: "completion_or_review" | "completion_only";
  updatedAt?: string;
};

export type GoalNotificationEvent = {
  id: string;
  workspaceId: string;
  userId: string;
  module: "goals";
  sourceType: string;
  sourceId: string;
  title: string;
  body: string;
  priority: "low" | "medium" | "high" | "critical";
  state: "unread" | "read" | "dismissed";
  ctaUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type GoalBoardDoc = {
  id: string;
  workspaceId: string;
  userId: string;
  title: string;
  columns: GoalStickerStatus[];
  createdAt?: string;
  updatedAt?: string;
};

export type GoalBoardQuery = {
  limit?: number;
  cursor?: string;
  status?: GoalStickerStatus | "all";
  priority?: GoalStickerPriority | "all";
  tag?: string;
  projectLinkedOnly?: boolean;
  learningOnly?: boolean;
  learningArea?: string;
  learningDifficulty?: GoalLearningDifficulty | "all";
  studyType?: GoalStudyType | "all";
  plannedDate?: string;
};

export type GoalBoardResponse = {
  stickers: GoalSticker[];
  nextCursor: string | null;
};

export type GoalLearningPlan = {
  id: string;
  workspaceId: string;
  userId: string;
  weekId: string;
  focusAreas: string[];
  stickerIds: string[];
  targetMinutes: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type GoalLearningSession = {
  id: string;
  workspaceId: string;
  userId: string;
  dateId: string;
  stickerId?: string;
  learningArea?: string;
  minutesSpent: number;
  notes?: string;
  completed: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type GoalLearningStats = {
  id: string;
  workspaceId: string;
  userId: string;
  currentStreak: number;
  longestStreak: number;
  totalMinutes: number;
  sessionsCount: number;
  updatedAt?: string;
};

export const goalsWorkspaceDefault = "main";
