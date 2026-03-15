import type { GoalReminderRuleDoc } from "@/types/goals";

export const goalStickerColorPalette = [
  "amber",
  "sky",
  "emerald",
  "rose",
  "violet",
  "slate",
] as const;

export type GoalStickerColor = (typeof goalStickerColorPalette)[number];

export const goalStickerToneMap: Record<
  GoalStickerColor,
  {
    border: string;
    bg: string;
    chip: string;
  }
> = {
  amber: {
    border: "border-amber-300/70 dark:border-amber-500/45",
    bg: "bg-amber-50/90 dark:bg-amber-500/10",
    chip: "border-amber-400/45 bg-amber-100/80 text-amber-900 dark:border-amber-500/45 dark:bg-amber-500/20 dark:text-amber-100",
  },
  sky: {
    border: "border-sky-300/70 dark:border-sky-500/45",
    bg: "bg-sky-50/90 dark:bg-sky-500/10",
    chip: "border-sky-400/45 bg-sky-100/80 text-sky-900 dark:border-sky-500/45 dark:bg-sky-500/20 dark:text-sky-100",
  },
  emerald: {
    border: "border-emerald-300/70 dark:border-emerald-500/45",
    bg: "bg-emerald-50/90 dark:bg-emerald-500/10",
    chip: "border-emerald-400/45 bg-emerald-100/80 text-emerald-900 dark:border-emerald-500/45 dark:bg-emerald-500/20 dark:text-emerald-100",
  },
  rose: {
    border: "border-rose-300/70 dark:border-rose-500/45",
    bg: "bg-rose-50/90 dark:bg-rose-500/10",
    chip: "border-rose-400/45 bg-rose-100/80 text-rose-900 dark:border-rose-500/45 dark:bg-rose-500/20 dark:text-rose-100",
  },
  violet: {
    border: "border-violet-300/70 dark:border-violet-500/45",
    bg: "bg-violet-50/90 dark:bg-violet-500/10",
    chip: "border-violet-400/45 bg-violet-100/80 text-violet-900 dark:border-violet-500/45 dark:bg-violet-500/20 dark:text-violet-100",
  },
  slate: {
    border: "border-slate-300/70 dark:border-slate-500/45",
    bg: "bg-slate-50/90 dark:bg-slate-500/10",
    chip: "border-slate-400/45 bg-slate-100/80 text-slate-900 dark:border-slate-500/45 dark:bg-slate-500/20 dark:text-slate-100",
  },
};

export const defaultGoalReminderRules: GoalReminderRuleDoc = {
  id: "settings",
  workspaceId: "main",
  userId: "",
  enableDailyBrief: true,
  enableWrapUp: true,
  enableWeeklyPlanning: true,
  dailyBriefTime: "08:00",
  wrapUpTime: "19:30",
  weeklyPlanningTime: "08:00",
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  timezone: "America/Montreal",
  forceDailyPlan: true,
  minTasksRequired: 3,
  maxTasksRecommended: 7,
  streakMode: "completion_or_review",
};

export const stickerStatusLabels = {
  inbox: "Inbox",
  this_week: "This Week",
  today: "Today",
  done: "Done",
} as const;

export const stickerPriorityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
} as const;

export const learningDifficultyLabels = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
} as const;

export const studyTypeLabels = {
  read: "Read",
  watch: "Watch",
  build: "Build",
  practice: "Practice",
  review: "Review",
} as const;

export const badgeCatalog = [
  {
    id: "streak-7",
    title: "7-day streak",
    description: "Complete at least one sticker per day for seven days.",
    target: 7,
  },
  {
    id: "tasks-50",
    title: "50 stickers done",
    description: "Close fifty stickers across your plans.",
    target: 50,
  },
  {
    id: "full-week-plan",
    title: "Planned full week",
    description: "Build a weekly plan with at least five stickers.",
    target: 5,
  },
] as const;

export type GoalBadgeId = (typeof badgeCatalog)[number]["id"];
