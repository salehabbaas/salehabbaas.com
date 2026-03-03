import {
  DEFAULT_REMINDER_SETTINGS,
  DEFAULT_USER_NOTIFICATION_PREFERENCES,
  type ReminderSettings,
  type UserNotificationPreferences
} from "@/types/notifications";

function toBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function toString(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function toPositiveInt(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.floor(numeric);
}

function toMinuteWindows(value: unknown, fallback: number[]) {
  if (!Array.isArray(value)) return fallback;
  const unique = Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0 && item <= 14 * 24 * 60)
        .map((item) => Math.floor(item))
    )
  ).sort((a, b) => b - a);

  return unique.length ? unique : fallback;
}

function toIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return undefined;
}

export function normalizeReminderSettings(raw: unknown, primaryAdminFallback = ""): ReminderSettings {
  const data = (raw ?? {}) as Record<string, unknown>;

  const tasks = (data.tasks ?? {}) as Record<string, unknown>;
  const bookings = (data.bookings ?? {}) as Record<string, unknown>;
  const linkedin = (data.linkedin ?? {}) as Record<string, unknown>;
  const jobs = (data.jobs ?? {}) as Record<string, unknown>;
  const goals = (data.goals ?? {}) as Record<string, unknown>;
  const audit = (data.audit ?? {}) as Record<string, unknown>;
  const channels = (data.channels ?? {}) as Record<string, unknown>;

  const jobsOverdue = (jobs.overdue ?? {}) as Record<string, unknown>;
  const goalsOverdue = (goals.overdue ?? {}) as Record<string, unknown>;

  return {
    tasks: {
      enabled: toBoolean(tasks.enabled, DEFAULT_REMINDER_SETTINGS.tasks.enabled),
      default24h: toBoolean(tasks.default24h, DEFAULT_REMINDER_SETTINGS.tasks.default24h),
      default1h: toBoolean(tasks.default1h, DEFAULT_REMINDER_SETTINGS.tasks.default1h),
      defaultDailyOverdue: toBoolean(tasks.defaultDailyOverdue, DEFAULT_REMINDER_SETTINGS.tasks.defaultDailyOverdue)
    },
    bookings: {
      enabled: toBoolean(bookings.enabled, DEFAULT_REMINDER_SETTINGS.bookings.enabled),
      windowsMinutes: toMinuteWindows(bookings.windowsMinutes, DEFAULT_REMINDER_SETTINGS.bookings.windowsMinutes)
    },
    linkedin: {
      enabled: toBoolean(linkedin.enabled, DEFAULT_REMINDER_SETTINGS.linkedin.enabled),
      windowsMinutes: toMinuteWindows(linkedin.windowsMinutes, DEFAULT_REMINDER_SETTINGS.linkedin.windowsMinutes)
    },
    jobs: {
      enabled: toBoolean(jobs.enabled, DEFAULT_REMINDER_SETTINGS.jobs.enabled),
      windowsMinutes: toMinuteWindows(jobs.windowsMinutes, DEFAULT_REMINDER_SETTINGS.jobs.windowsMinutes),
      overdue: {
        enabled: toBoolean(jobsOverdue.enabled, DEFAULT_REMINDER_SETTINGS.jobs.overdue.enabled),
        cadenceHours: toPositiveInt(jobsOverdue.cadenceHours, DEFAULT_REMINDER_SETTINGS.jobs.overdue.cadenceHours),
        lookbackDays: toPositiveInt(jobsOverdue.lookbackDays, DEFAULT_REMINDER_SETTINGS.jobs.overdue.lookbackDays)
      }
    },
    goals: {
      enabled: toBoolean(goals.enabled, DEFAULT_REMINDER_SETTINGS.goals.enabled),
      windowsMinutes: toMinuteWindows(goals.windowsMinutes, DEFAULT_REMINDER_SETTINGS.goals.windowsMinutes),
      overdue: {
        enabled: toBoolean(goalsOverdue.enabled, DEFAULT_REMINDER_SETTINGS.goals.overdue.enabled),
        cadenceHours: toPositiveInt(goalsOverdue.cadenceHours, DEFAULT_REMINDER_SETTINGS.goals.overdue.cadenceHours),
        lookbackDays: toPositiveInt(goalsOverdue.lookbackDays, DEFAULT_REMINDER_SETTINGS.goals.overdue.lookbackDays)
      }
    },
    audit: {
      enabled: toBoolean(audit.enabled, DEFAULT_REMINDER_SETTINGS.audit.enabled),
      highRiskOnly: toBoolean(audit.highRiskOnly, DEFAULT_REMINDER_SETTINGS.audit.highRiskOnly)
    },
    channels: {
      inAppEnabled: toBoolean(channels.inAppEnabled, DEFAULT_REMINDER_SETTINGS.channels.inAppEnabled),
      bannerEnabled: toBoolean(channels.bannerEnabled, DEFAULT_REMINDER_SETTINGS.channels.bannerEnabled),
      pushEnabled: toBoolean(channels.pushEnabled, DEFAULT_REMINDER_SETTINGS.channels.pushEnabled),
      emailEnabled: toBoolean(channels.emailEnabled, DEFAULT_REMINDER_SETTINGS.channels.emailEnabled),
      quietHoursStart: toString(channels.quietHoursStart, DEFAULT_REMINDER_SETTINGS.channels.quietHoursStart),
      quietHoursEnd: toString(channels.quietHoursEnd, DEFAULT_REMINDER_SETTINGS.channels.quietHoursEnd),
      timezone: toString(channels.timezone, DEFAULT_REMINDER_SETTINGS.channels.timezone),
      primaryAdminUid: toString(channels.primaryAdminUid, primaryAdminFallback)
    },
    updatedAt: toIso(data.updatedAt)
  };
}

export function normalizeUserNotificationPreferences(raw: unknown, fallbackTimezone = "UTC"): UserNotificationPreferences {
  const data = (raw ?? {}) as Record<string, unknown>;

  return {
    timezone: toString(data.timezone, fallbackTimezone || DEFAULT_USER_NOTIFICATION_PREFERENCES.timezone),
    inAppEnabled: toBoolean(data.inAppEnabled, DEFAULT_USER_NOTIFICATION_PREFERENCES.inAppEnabled),
    bannerEnabled: toBoolean(data.bannerEnabled, DEFAULT_USER_NOTIFICATION_PREFERENCES.bannerEnabled),
    pushEnabled: toBoolean(data.pushEnabled, DEFAULT_USER_NOTIFICATION_PREFERENCES.pushEnabled)
  };
}

export function mergeReminderSettings(base: ReminderSettings, patch: Partial<ReminderSettings>): ReminderSettings {
  return normalizeReminderSettings({
    ...base,
    ...patch,
    tasks: { ...base.tasks, ...(patch.tasks ?? {}) },
    bookings: { ...base.bookings, ...(patch.bookings ?? {}) },
    linkedin: { ...base.linkedin, ...(patch.linkedin ?? {}) },
    jobs: {
      ...base.jobs,
      ...(patch.jobs ?? {}),
      overdue: {
        ...base.jobs.overdue,
        ...(patch.jobs?.overdue ?? {})
      }
    },
    goals: {
      ...base.goals,
      ...(patch.goals ?? {}),
      overdue: {
        ...base.goals.overdue,
        ...(patch.goals?.overdue ?? {})
      }
    },
    audit: {
      ...base.audit,
      ...(patch.audit ?? {})
    },
    channels: {
      ...base.channels,
      ...(patch.channels ?? {})
    }
  });
}

export function mergeUserNotificationPreferences(
  base: UserNotificationPreferences,
  patch: Partial<UserNotificationPreferences>
): UserNotificationPreferences {
  return normalizeUserNotificationPreferences({
    ...base,
    ...patch
  }, patch.timezone ?? base.timezone);
}
