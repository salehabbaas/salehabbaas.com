import { z } from "zod";

import {
  goalLearningDifficulties,
  goalStickerPriorities,
  goalStickerStatuses,
  goalStudyTypes,
} from "@/types/goals";

export const dateIdSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/);

export const weekIdSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-W\d{2}$/);

export const hhmmSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/);

export const stickerStatusSchema = z.enum(goalStickerStatuses);

export const stickerPrioritySchema = z.enum(goalStickerPriorities);

export const stickerSourceSchema = z
  .object({
    type: z.enum(["manual", "projectTask"]),
    projectId: z.string().trim().min(1).max(180).optional(),
    taskId: z.string().trim().min(1).max(180).optional(),
  })
  .nullable();

export const stickerLearningSchema = z
  .object({
    learningArea: z.string().trim().min(1).max(120).optional(),
    learningOutcome: z.string().trim().max(1000).optional(),
    difficulty: z.enum(goalLearningDifficulties).optional(),
    studyType: z.enum(goalStudyTypes).optional(),
    resourceLink: z.string().trim().url().max(2000).optional(),
    timeBoxMinutes: z.number().int().min(5).max(480).nullable().optional(),
  })
  .nullable()
  .optional();

export const goalStickerCreateSchema = z.object({
  title: z.string().trim().min(1).max(220),
  notes: z.string().trim().max(5000).optional(),
  status: stickerStatusSchema.default("inbox"),
  tags: z.array(z.string().trim().min(1).max(40)).max(24).optional(),
  color: z
    .string()
    .trim()
    .regex(/^(amber|sky|emerald|rose|violet|slate)$/)
    .default("amber"),
  priority: stickerPrioritySchema.default("medium"),
  estimateMinutes: z.number().int().min(5).max(960).nullable().optional(),
  xpValue: z.number().int().min(1).max(200).optional(),
  plannedDate: dateIdSchema.nullable().optional(),
  source: stickerSourceSchema.optional(),
  learning: stickerLearningSchema,
});

export const goalStickerUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(220).optional(),
    notes: z.string().trim().max(5000).optional(),
    status: stickerStatusSchema.optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(24).optional(),
    color: z
      .string()
      .trim()
      .regex(/^(amber|sky|emerald|rose|violet|slate)$/)
      .optional(),
    priority: stickerPrioritySchema.optional(),
    estimateMinutes: z.number().int().min(5).max(960).nullable().optional(),
    xpValue: z.number().int().min(1).max(200).optional(),
    plannedDate: dateIdSchema.nullable().optional(),
    source: stickerSourceSchema.optional(),
    learning: stickerLearningSchema,
    complete: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "No updates provided.");

export const stickersReorderSchema = z.object({
  updates: z
    .array(
      z.object({
        stickerId: z.string().trim().min(1),
        status: stickerStatusSchema,
        order: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(300),
});

export const boardQuerySchema = z.object({
  limit: z.number().int().min(1).max(200).default(120),
  cursor: z.string().trim().min(1).optional(),
  status: z.enum(["all", ...goalStickerStatuses]).default("all"),
  priority: z.enum(["all", ...goalStickerPriorities]).default("all"),
  tag: z.string().trim().max(40).optional(),
  projectLinkedOnly: z.boolean().default(false),
  learningOnly: z.boolean().default(false),
  learningArea: z.string().trim().max(120).optional(),
  learningDifficulty: z.enum(["all", ...goalLearningDifficulties]).default("all"),
  studyType: z.enum(["all", ...goalStudyTypes]).default("all"),
  plannedDate: dateIdSchema.optional(),
});

export const dayPlanUpdateSchema = z.object({
  dateId: dateIdSchema,
  stickerIds: z.array(z.string().trim().min(1)).max(200),
  forceRulesSnapshot: z
    .object({
      minTasksRequired: z.number().int().min(1).max(20),
      maxTasksRecommended: z.number().int().min(1).max(30),
    })
    .optional(),
});

export const dayPlanStartSchema = z.object({
  dateId: dateIdSchema,
});

export const dayPlanReviewSchema = z.object({
  dateId: dateIdSchema,
  whatWentWell: z.string().trim().max(4000).optional(),
  whatToImprove: z.string().trim().max(4000).optional(),
  autoReschedule: z.enum(["none", "tomorrow", "this_week", "inbox"]).default("tomorrow"),
});

export const weekPlanUpsertSchema = z.object({
  weekId: weekIdSchema,
  stickerIds: z.array(z.string().trim().min(1)).max(250),
  focusAreas: z.array(z.string().trim().min(1).max(100)).max(12).optional(),
  notes: z.string().trim().max(5000).optional(),
});

export const goalSettingsSchema = z
  .object({
    enableDailyBrief: z.boolean().optional(),
    enableWrapUp: z.boolean().optional(),
    enableWeeklyPlanning: z.boolean().optional(),
    dailyBriefTime: hhmmSchema.optional(),
    wrapUpTime: hhmmSchema.optional(),
    weeklyPlanningTime: hhmmSchema.optional(),
    quietHoursStart: hhmmSchema.optional(),
    quietHoursEnd: hhmmSchema.optional(),
    timezone: z.string().trim().min(1).max(120).optional(),
    forceDailyPlan: z.boolean().optional(),
    minTasksRequired: z.number().int().min(1).max(20).optional(),
    maxTasksRecommended: z.number().int().min(1).max(30).optional(),
    streakMode: z.enum(["completion_or_review", "completion_only"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "No settings updates provided.");

export const addProjectTaskStickerSchema = z.object({
  projectId: z.string().trim().min(1),
  taskId: z.string().trim().min(1),
  dateId: dateIdSchema.optional(),
  status: stickerStatusSchema.default("today"),
});

export const learningPlanUpsertSchema = z.object({
  weekId: weekIdSchema,
  stickerIds: z.array(z.string().trim().min(1)).max(300),
  focusAreas: z.array(z.string().trim().min(1).max(120)).max(15).optional(),
  targetMinutes: z.number().int().min(30).max(4200).optional(),
  notes: z.string().trim().max(5000).optional(),
});

export const learningSessionCreateSchema = z.object({
  dateId: dateIdSchema.optional(),
  stickerId: z.string().trim().min(1).max(180).optional(),
  learningArea: z.string().trim().min(1).max(120).optional(),
  minutesSpent: z.number().int().min(5).max(480),
  notes: z.string().trim().max(2000).optional(),
  completed: z.boolean().default(true),
});

export const aiExtractSchema = z.object({
  text: z.string().trim().min(1).max(20000),
  url: z.string().trim().max(2000).optional(),
});

export const aiPlanDaySchema = z.object({
  dateId: dateIdSchema.optional(),
  maxTasks: z.number().int().min(1).max(12).optional(),
  focusAreas: z.array(z.string().trim().min(1).max(100)).max(10).optional(),
  backlogStickerIds: z.array(z.string().trim().min(1)).max(300).optional(),
});

export const aiSummarySchema = z.object({
  dateId: dateIdSchema,
  whatWentWell: z.string().trim().max(4000).optional(),
  whatToImprove: z.string().trim().max(4000).optional(),
  completedStickerIds: z.array(z.string().trim().min(1)).max(300).optional(),
});

export const aiLearningPlanSchema = z.object({
  weekId: weekIdSchema.optional(),
  focusAreas: z.array(z.string().trim().min(1).max(120)).max(15).optional(),
  maxItems: z.number().int().min(1).max(25).optional(),
  stickerIds: z.array(z.string().trim().min(1)).max(300).optional(),
});

export const aiLearningNextTaskSchema = z.object({
  availableMinutes: z.number().int().min(5).max(480).optional(),
  learningArea: z.string().trim().max(120).optional(),
});

export const aiLearningRecapSchema = z.object({
  weekId: weekIdSchema.optional(),
});
