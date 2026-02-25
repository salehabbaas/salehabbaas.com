import { z } from "zod";

const daySchema = z.enum(["MO", "TU", "WE", "TH", "FR", "SA", "SU"]);

export const studioConfigSchema = z.object({
  profile: z.object({
    displayName: z.string().min(1).max(120),
    headline: z.string().min(1).max(240),
    about: z.string().min(1).max(5000),
    goals: z.array(z.string().min(1).max(400)).min(1),
    location: z.string().max(200).optional().default(""),
    voiceStyle: z.object({
      tone: z.string().min(1).max(160),
      length: z.string().min(1).max(80),
      dos: z.array(z.string().max(200)).default([]),
      donts: z.array(z.string().max(200)).default([])
    })
  }),
  targeting: z.object({
    companies: z
      .array(
        z.object({
          name: z.string().min(1).max(200),
          website: z.string().max(300).optional(),
          notes: z.string().max(400).optional(),
          priority: z.coerce.number().min(1).max(5).optional(),
          rotationWeight: z.coerce.number().min(1).max(20).optional(),
          lastUsedAt: z.string().optional()
        })
      )
      .min(1),
    industries: z.array(z.string().min(1).max(120)).default([]),
    technologies: z.array(z.string().min(1).max(120)).default([]),
    pillars: z.array(z.string().min(1).max(120)).default([])
  }),
  settings: z.object({
    cadenceDaysOfWeek: z.array(daySchema).min(1),
    reminderTimeLocal: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string().min(1).max(80),
    webResearchEnabled: z.boolean(),
    autoSelectCompany: z.boolean(),
    autoSelectTopic: z.boolean(),
    autoShareLinkedIn: z.boolean()
  }),
  experience: z
    .array(
      z.object({
        roleTitle: z.string().min(1).max(200),
        company: z.string().min(1).max(200),
        industry: z.string().max(160).optional(),
        startDate: z.string().max(80).optional(),
        endDate: z.string().max(80).optional(),
        bullets: z.array(z.string().max(300)).default([]),
        technologies: z.array(z.string().max(120)).default([]),
        lessonsLearned: z.array(z.string().max(300)).default([])
      })
    )
    .default([])
});

export const generatePostSchema = z.object({
  manualCompany: z.string().max(200).optional(),
  manualTopic: z.string().max(240).optional(),
  manualPillar: z.string().max(160).optional()
});

export const refinePostSchema = z.object({
  feedback: z.string().max(2000).optional()
});
