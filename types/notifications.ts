export type NotificationModule = "tasks" | "bookings" | "linkedin" | "jobs" | "goals" | "audit" | "system";

export type NotificationPriority = "low" | "medium" | "high" | "critical";

export type NotificationState = "unread" | "read" | "dismissed";

export type NotificationChannels = {
  inApp: boolean;
  banner: boolean;
  push: boolean;
};

export type NotificationDoc = {
  id: string;
  module: NotificationModule;
  sourceType: string;
  sourceId: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  state: NotificationState;
  channels: NotificationChannels;
  ctaUrl?: string;
  scheduledFor?: string;
  createdAt?: string;
  updatedAt?: string;
  readAt?: string;
  dismissedAt?: string;
  metadata?: Record<string, unknown>;
};

export type ReminderWindowConfig = {
  enabled: boolean;
  windowsMinutes: number[];
};

export type OverdueReminderConfig = {
  enabled: boolean;
  cadenceHours: number;
  lookbackDays: number;
};

export type TaskReminderSettings = {
  enabled: boolean;
  default24h: boolean;
  default1h: boolean;
  defaultDailyOverdue: boolean;
};

export type JobsReminderSettings = ReminderWindowConfig & {
  overdue: OverdueReminderConfig;
};

export type GoalsReminderSettings = ReminderWindowConfig & {
  overdue: OverdueReminderConfig;
};

export type AuditReminderSettings = {
  enabled: boolean;
  highRiskOnly: boolean;
};

export type ReminderChannelsSettings = {
  inAppEnabled: boolean;
  bannerEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
  primaryAdminUid: string;
};

export type ReminderSettings = {
  tasks: TaskReminderSettings;
  bookings: ReminderWindowConfig;
  linkedin: ReminderWindowConfig;
  jobs: JobsReminderSettings;
  goals: GoalsReminderSettings;
  audit: AuditReminderSettings;
  channels: ReminderChannelsSettings;
  updatedAt?: string;
};

export type UserNotificationPreferences = {
  timezone: string;
  inAppEnabled: boolean;
  bannerEnabled: boolean;
  pushEnabled: boolean;
};

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
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

export const DEFAULT_USER_NOTIFICATION_PREFERENCES: UserNotificationPreferences = {
  timezone: "UTC",
  inAppEnabled: true,
  bannerEnabled: true,
  pushEnabled: true
};
