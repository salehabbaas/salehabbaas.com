import { adminAuth, adminDb } from "../admin";

export type ReminderRuntimeSettings = {
  tasks: {
    enabled: boolean;
    default24h: boolean;
    default1h: boolean;
    defaultDailyOverdue: boolean;
  };
  bookings: {
    enabled: boolean;
    windowsMinutes: number[];
  };
  linkedin: {
    enabled: boolean;
    windowsMinutes: number[];
  };
  jobs: {
    enabled: boolean;
    windowsMinutes: number[];
    overdue: {
      enabled: boolean;
      cadenceHours: number;
      lookbackDays: number;
    };
  };
  goals: {
    enabled: boolean;
    windowsMinutes: number[];
    overdue: {
      enabled: boolean;
      cadenceHours: number;
      lookbackDays: number;
    };
  };
  audit: {
    enabled: boolean;
    highRiskOnly: boolean;
  };
  channels: {
    inAppEnabled: boolean;
    bannerEnabled: boolean;
    pushEnabled: boolean;
    emailEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    timezone: string;
    primaryAdminUid: string;
  };
};

export type UserReminderPreferences = {
  timezone: string;
  inAppEnabled: boolean;
  bannerEnabled: boolean;
  pushEnabled: boolean;
  emailRemindersEnabled: boolean;
};

const DEFAULT_SETTINGS: ReminderRuntimeSettings = {
  tasks: {
    enabled: true,
    default24h: true,
    default1h: true,
    defaultDailyOverdue: true
  },
  bookings: {
    enabled: true,
    windowsMinutes: [1440, 60]
  },
  linkedin: {
    enabled: true,
    windowsMinutes: [1440, 60]
  },
  jobs: {
    enabled: true,
    windowsMinutes: [1440],
    overdue: {
      enabled: true,
      cadenceHours: 24,
      lookbackDays: 30
    }
  },
  goals: {
    enabled: true,
    windowsMinutes: [10080, 1440],
    overdue: {
      enabled: true,
      cadenceHours: 24,
      lookbackDays: 60
    }
  },
  audit: {
    enabled: true,
    highRiskOnly: true
  },
  channels: {
    inAppEnabled: true,
    bannerEnabled: true,
    pushEnabled: true,
    emailEnabled: true,
    quietHoursStart: "23:00",
    quietHoursEnd: "07:00",
    timezone: "UTC",
    primaryAdminUid: ""
  }
};

let runtimeCache: {
  value: ReminderRuntimeSettings;
  expiresAt: number;
} | null = null;

const userPrefCache = new Map<string, UserReminderPreferences>();

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

function toWindows(value: unknown, fallback: number[]) {
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

async function findPrimaryAdminUid() {
  const fromEnv = toString(process.env.NOTIFICATION_PRIMARY_ADMIN_UID, "");
  if (fromEnv) return fromEnv;

  let pageToken: string | undefined;
  for (let index = 0; index < 5; index += 1) {
    const page = await adminAuth.listUsers(1000, pageToken);
    const adminUser = page.users.find((entry) => entry.customClaims?.admin === true);
    if (adminUser) return adminUser.uid;
    if (!page.pageToken) break;
    pageToken = page.pageToken;
  }

  return "";
}

function normalizeSettings(raw: Record<string, unknown>, primaryFallback: string): ReminderRuntimeSettings {
  const tasks = (raw.tasks ?? {}) as Record<string, unknown>;
  const bookings = (raw.bookings ?? {}) as Record<string, unknown>;
  const linkedin = (raw.linkedin ?? {}) as Record<string, unknown>;
  const jobs = (raw.jobs ?? {}) as Record<string, unknown>;
  const goals = (raw.goals ?? {}) as Record<string, unknown>;
  const audit = (raw.audit ?? {}) as Record<string, unknown>;
  const channels = (raw.channels ?? {}) as Record<string, unknown>;
  const jobsOverdue = (jobs.overdue ?? {}) as Record<string, unknown>;
  const goalsOverdue = (goals.overdue ?? {}) as Record<string, unknown>;

  return {
    tasks: {
      enabled: toBoolean(tasks.enabled, DEFAULT_SETTINGS.tasks.enabled),
      default24h: toBoolean(tasks.default24h, DEFAULT_SETTINGS.tasks.default24h),
      default1h: toBoolean(tasks.default1h, DEFAULT_SETTINGS.tasks.default1h),
      defaultDailyOverdue: toBoolean(tasks.defaultDailyOverdue, DEFAULT_SETTINGS.tasks.defaultDailyOverdue)
    },
    bookings: {
      enabled: toBoolean(bookings.enabled, DEFAULT_SETTINGS.bookings.enabled),
      windowsMinutes: toWindows(bookings.windowsMinutes, DEFAULT_SETTINGS.bookings.windowsMinutes)
    },
    linkedin: {
      enabled: toBoolean(linkedin.enabled, DEFAULT_SETTINGS.linkedin.enabled),
      windowsMinutes: toWindows(linkedin.windowsMinutes, DEFAULT_SETTINGS.linkedin.windowsMinutes)
    },
    jobs: {
      enabled: toBoolean(jobs.enabled, DEFAULT_SETTINGS.jobs.enabled),
      windowsMinutes: toWindows(jobs.windowsMinutes, DEFAULT_SETTINGS.jobs.windowsMinutes),
      overdue: {
        enabled: toBoolean(jobsOverdue.enabled, DEFAULT_SETTINGS.jobs.overdue.enabled),
        cadenceHours: toPositiveInt(jobsOverdue.cadenceHours, DEFAULT_SETTINGS.jobs.overdue.cadenceHours),
        lookbackDays: toPositiveInt(jobsOverdue.lookbackDays, DEFAULT_SETTINGS.jobs.overdue.lookbackDays)
      }
    },
    goals: {
      enabled: toBoolean(goals.enabled, DEFAULT_SETTINGS.goals.enabled),
      windowsMinutes: toWindows(goals.windowsMinutes, DEFAULT_SETTINGS.goals.windowsMinutes),
      overdue: {
        enabled: toBoolean(goalsOverdue.enabled, DEFAULT_SETTINGS.goals.overdue.enabled),
        cadenceHours: toPositiveInt(goalsOverdue.cadenceHours, DEFAULT_SETTINGS.goals.overdue.cadenceHours),
        lookbackDays: toPositiveInt(goalsOverdue.lookbackDays, DEFAULT_SETTINGS.goals.overdue.lookbackDays)
      }
    },
    audit: {
      enabled: toBoolean(audit.enabled, DEFAULT_SETTINGS.audit.enabled),
      highRiskOnly: toBoolean(audit.highRiskOnly, DEFAULT_SETTINGS.audit.highRiskOnly)
    },
    channels: {
      inAppEnabled: toBoolean(channels.inAppEnabled, DEFAULT_SETTINGS.channels.inAppEnabled),
      bannerEnabled: toBoolean(channels.bannerEnabled, DEFAULT_SETTINGS.channels.bannerEnabled),
      pushEnabled: toBoolean(channels.pushEnabled, DEFAULT_SETTINGS.channels.pushEnabled),
      emailEnabled: toBoolean(channels.emailEnabled, DEFAULT_SETTINGS.channels.emailEnabled),
      quietHoursStart: toString(channels.quietHoursStart, DEFAULT_SETTINGS.channels.quietHoursStart),
      quietHoursEnd: toString(channels.quietHoursEnd, DEFAULT_SETTINGS.channels.quietHoursEnd),
      timezone: toString(channels.timezone, DEFAULT_SETTINGS.channels.timezone),
      primaryAdminUid: toString(channels.primaryAdminUid, primaryFallback)
    }
  };
}

export async function getReminderRuntimeSettings(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && runtimeCache && runtimeCache.expiresAt > now) {
    return runtimeCache.value;
  }

  const [snap, primaryFallback] = await Promise.all([
    adminDb.collection("adminSettings").doc("reminders").get(),
    findPrimaryAdminUid()
  ]);

  const value = normalizeSettings((snap.data() ?? {}) as Record<string, unknown>, primaryFallback);
  runtimeCache = {
    value,
    expiresAt: now + 60_000
  };
  return value;
}

export async function getPrimaryAdminUid() {
  const settings = await getReminderRuntimeSettings();
  if (settings.channels.primaryAdminUid) return settings.channels.primaryAdminUid;
  return findPrimaryAdminUid();
}

export async function getUserReminderPreferences(uid: string): Promise<UserReminderPreferences> {
  const cached = userPrefCache.get(uid);
  if (cached) return cached;

  const runtime = await getReminderRuntimeSettings();
  const snap = await adminDb.collection("users").doc(uid).collection("settings").doc("projectManagement").get();
  const data = (snap.data() ?? {}) as Record<string, unknown>;
  const notification = (data.notificationPreferences ?? {}) as Record<string, unknown>;

  const value: UserReminderPreferences = {
    timezone: toString(data.timezone, toString(notification.timezone, runtime.channels.timezone)),
    inAppEnabled: toBoolean(notification.inAppEnabled, true),
    bannerEnabled: toBoolean(notification.bannerEnabled, true),
    pushEnabled: toBoolean(notification.pushEnabled, true),
    emailRemindersEnabled: data.emailRemindersEnabled !== false
  };

  userPrefCache.set(uid, value);
  return value;
}

export function clearReminderUserPreferenceCache() {
  userPrefCache.clear();
}
