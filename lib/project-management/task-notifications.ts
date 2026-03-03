import "server-only";

import { createHash } from "node:crypto";

import { getConfiguredEmailAdapter } from "@/lib/email/service";
import { adminDb } from "@/lib/firebase/admin";
import { normalizeReminderSettings, normalizeUserNotificationPreferences } from "@/lib/notifications/settings";
import type { NotificationPriority, ReminderSettings, UserNotificationPreferences } from "@/types/notifications";

type TaskNotificationRecipientProfile = {
  uid: string;
  email: string;
  displayName: string;
  preferences: UserNotificationPreferences;
  emailRemindersEnabled: boolean;
};

export type TaskNotificationContext = {
  runtimeSettings: ReminderSettings;
  profileCache: Map<string, TaskNotificationRecipientProfile>;
};

type InAppTaskNotificationInput = {
  context?: TaskNotificationContext;
  recipientUid: string;
  dedupeKey: string;
  sourceType: string;
  sourceId: string;
  title: string;
  body: string;
  priority?: NotificationPriority;
  ctaPath?: string;
  metadata?: Record<string, unknown>;
};

type TaskEmailNotificationInput = {
  context?: TaskNotificationContext;
  recipientUid: string;
  subject: string;
  headline: string;
  summaryLines: string[];
  taskPath?: string;
  trigger: string;
  metadata?: Record<string, unknown>;
};

function notificationIdFromDedupe(key: string) {
  return createHash("sha256").update(key).digest("hex").slice(0, 36);
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

function toAbsoluteLink(path: string) {
  const trimmed = path.trim();
  if (!trimmed) return "";
  try {
    return new URL(trimmed, normalizeSiteUrl()).toString();
  } catch {
    return "";
  }
}

function resolveLogoUrl() {
  const siteUrl = normalizeSiteUrl().replace(/\/$/, "");
  return `${siteUrl}/SA-Logo.png`;
}

type SummaryStyle = {
  token: string;
  badgeBg: string;
  badgeColor: string;
  cardBg: string;
  cardBorder: string;
};

function getSummaryStyle(line: string, index: number): SummaryStyle {
  const normalized = line.trim().toLowerCase();
  if (normalized.startsWith("project:")) {
    return {
      token: "PRJ",
      badgeBg: "#DBEAFE",
      badgeColor: "#1D4ED8",
      cardBg: "#EFF6FF",
      cardBorder: "#BFDBFE"
    };
  }
  if (normalized.startsWith("task:")) {
    return {
      token: "TSK",
      badgeBg: "#DCFCE7",
      badgeColor: "#166534",
      cardBg: "#F0FDF4",
      cardBorder: "#BBF7D0"
    };
  }
  if (normalized.startsWith("assigned by:")) {
    return {
      token: "USR",
      badgeBg: "#FDE68A",
      badgeColor: "#92400E",
      cardBg: "#FFFBEB",
      cardBorder: "#FCD34D"
    };
  }
  if (normalized.includes("priority")) {
    return {
      token: "PRI",
      badgeBg: "#FCA5A5",
      badgeColor: "#991B1B",
      cardBg: "#FEF2F2",
      cardBorder: "#FECACA"
    };
  }
  if (normalized.includes("status")) {
    return {
      token: "STS",
      badgeBg: "#C7D2FE",
      badgeColor: "#3730A3",
      cardBg: "#EEF2FF",
      cardBorder: "#C7D2FE"
    };
  }
  if (normalized.includes("due")) {
    return {
      token: "DUE",
      badgeBg: "#DDD6FE",
      badgeColor: "#5B21B6",
      cardBg: "#F5F3FF",
      cardBorder: "#DDD6FE"
    };
  }
  if (normalized.includes("label")) {
    return {
      token: "LBL",
      badgeBg: "#BAE6FD",
      badgeColor: "#0C4A6E",
      cardBg: "#F0F9FF",
      cardBorder: "#BAE6FD"
    };
  }
  const fallbackPalette: SummaryStyle[] = [
    { token: "UPD", badgeBg: "#FBCFE8", badgeColor: "#9D174D", cardBg: "#FDF2F8", cardBorder: "#F9A8D4" },
    { token: "INF", badgeBg: "#D1FAE5", badgeColor: "#065F46", cardBg: "#ECFDF5", cardBorder: "#A7F3D0" },
    { token: "ALT", badgeBg: "#E2E8F0", badgeColor: "#334155", cardBg: "#F8FAFC", cardBorder: "#CBD5E1" }
  ];
  return fallbackPalette[index % fallbackPalette.length];
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function resolveReminderRuntimeSettings(primaryAdminFallback = "") {
  const remindersSnap = await adminDb.collection("adminSettings").doc("reminders").get();
  return normalizeReminderSettings(remindersSnap.data() ?? {}, primaryAdminFallback);
}

async function resolveRecipientProfile(uid: string, runtimeSettings: ReminderSettings): Promise<TaskNotificationRecipientProfile> {
  const [adminUserSnap, userSettingsSnap] = await Promise.all([
    adminDb.collection("adminUsers").doc(uid).get(),
    adminDb.collection("users").doc(uid).collection("settings").doc("projectManagement").get()
  ]);

  const adminData = (adminUserSnap.data() ?? {}) as Record<string, unknown>;
  const userSettingsData = (userSettingsSnap.data() ?? {}) as Record<string, unknown>;
  const timezone =
    typeof userSettingsData.timezone === "string" && userSettingsData.timezone.trim()
      ? userSettingsData.timezone
      : runtimeSettings.channels.timezone;

  const preferences = normalizeUserNotificationPreferences(userSettingsData.notificationPreferences, timezone);

  return {
    uid,
    email: typeof adminData.email === "string" ? adminData.email : "",
    displayName:
      (typeof adminData.displayName === "string" && adminData.displayName.trim()) ||
      (typeof adminData.email === "string" && adminData.email.trim()) ||
      uid,
    preferences,
    emailRemindersEnabled: userSettingsData.emailRemindersEnabled !== false
  };
}

async function getContext(input?: TaskNotificationContext, primaryAdminFallback = "") {
  if (input) return input;
  return {
    runtimeSettings: await resolveReminderRuntimeSettings(primaryAdminFallback),
    profileCache: new Map<string, TaskNotificationRecipientProfile>()
  } satisfies TaskNotificationContext;
}

async function getRecipientProfile(context: TaskNotificationContext, uid: string) {
  const cached = context.profileCache.get(uid);
  if (cached) return cached;
  const resolved = await resolveRecipientProfile(uid, context.runtimeSettings);
  context.profileCache.set(uid, resolved);
  return resolved;
}

export async function createTaskNotificationContext(primaryAdminFallback = ""): Promise<TaskNotificationContext> {
  return {
    runtimeSettings: await resolveReminderRuntimeSettings(primaryAdminFallback),
    profileCache: new Map<string, TaskNotificationRecipientProfile>()
  };
}

export async function sendInAppTaskNotification(input: InAppTaskNotificationInput) {
  const context = await getContext(input.context, input.recipientUid);
  const profile = await getRecipientProfile(context, input.recipientUid);

  if (!context.runtimeSettings.channels.inAppEnabled || !profile.preferences.inAppEnabled) {
    return { created: false, notificationId: "" };
  }

  const notificationId = notificationIdFromDedupe(input.dedupeKey);
  const ref = adminDb.collection("users").doc(input.recipientUid).collection("notifications").doc(notificationId);
  const exists = await ref.get();
  if (exists.exists) {
    return { created: false, notificationId };
  }

  const now = new Date();
  const ctaUrl = toAbsoluteLink(input.ctaPath || "/admin/system-inbox");

  await ref.set({
    module: "tasks",
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    title: input.title,
    body: input.body,
    priority: input.priority ?? "medium",
    state: "unread",
    channels: {
      inApp: true,
      banner: context.runtimeSettings.channels.bannerEnabled && profile.preferences.bannerEnabled,
      push: false
    },
    ctaUrl,
    metadata: input.metadata ?? {},
    createdAt: now,
    updatedAt: now,
    readAt: null,
    dismissedAt: null
  });

  return {
    created: true,
    notificationId
  };
}

export async function sendTaskEmailNotification(input: TaskEmailNotificationInput) {
  const context = await getContext(input.context, input.recipientUid);
  const profile = await getRecipientProfile(context, input.recipientUid);

  if (!context.runtimeSettings.channels.emailEnabled || !profile.emailRemindersEnabled || !profile.email) {
    return { sent: false };
  }

  const taskUrl = toAbsoluteLink(input.taskPath || "/admin/system-inbox");
  const summaryHtml = input.summaryLines
    .map((line, index) => {
      const safeLine = escapeHtml(line);
      const style = getSummaryStyle(line, index);
      return `<tr>
        <td class="summary-card" style="padding:0 0 10px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;background:${style.cardBg};border:1px solid ${style.cardBorder};border-radius:12px;">
            <tr>
              <td style="padding:10px 12px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding-right:10px;vertical-align:top;">
                      <span style="display:inline-block;min-width:34px;padding:6px 0;border-radius:999px;background:${style.badgeBg};color:${style.badgeColor};font-size:10px;line-height:1;font-weight:700;letter-spacing:0.04em;text-align:center;">${style.token}</span>
                    </td>
                    <td style="font-size:14px;line-height:1.45;color:#0F172A;font-weight:500;">${safeLine}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
    })
    .join("");
  const safeHeadline = escapeHtml(input.headline);
  const safeTaskUrl = escapeHtml(taskUrl);
  const safeLogoUrl = escapeHtml(resolveLogoUrl());
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${safeHeadline}</title>
    <style>
      @media only screen and (max-width: 620px) {
        .email-shell {
          width: 100% !important;
        }
        .email-body {
          padding: 18px 14px !important;
        }
        .content-pad {
          padding: 18px 14px !important;
        }
        .brand-stack {
          display: block !important;
        }
        .brand-right {
          margin-top: 10px !important;
          display: inline-block !important;
        }
        .cta-button {
          display: block !important;
          width: 100% !important;
          text-align: center !important;
          box-sizing: border-box !important;
        }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#EAF1FF;">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">
      ${safeHeadline} - You have a task update in SalehAbbaas Project.
    </span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:linear-gradient(180deg,#EAF1FF 0%,#F8FAFF 45%,#F5F9FF 100%);">
      <tr>
        <td class="email-body" style="padding:28px 16px;">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" align="center" class="email-shell" style="width:640px;max-width:640px;border-collapse:separate;border-spacing:0;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #D7E5FF;box-shadow:0 14px 40px rgba(15,23,42,0.12);">
            <tr>
              <td style="padding:20px;background:linear-gradient(125deg,#0F172A 0%,#1D4ED8 50%,#0284C7 100%);">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="brand-stack">
                  <tr>
                    <td style="vertical-align:middle;">
                      <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                        <tr>
                          <td style="padding-right:12px;vertical-align:middle;">
                            <img src="${safeLogoUrl}" alt="Saleh Abbaas Logo" width="40" height="40" style="display:block;border-radius:10px;background:#FFFFFF;padding:4px;" />
                          </td>
                          <td style="vertical-align:middle;">
                            <p style="margin:0;font-family:Arial,sans-serif;font-size:16px;line-height:1.2;color:#FFFFFF;font-weight:700;">SalehAbbaas Project</p>
                            <p style="margin:3px 0 0;font-family:Arial,sans-serif;font-size:12px;line-height:1.3;color:#DBEAFE;">Task Notification Center</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td class="brand-right" style="text-align:right;vertical-align:middle;">
                      <span style="display:inline-block;padding:7px 11px;border-radius:999px;background:rgba(255,255,255,0.18);font-family:Arial,sans-serif;font-size:11px;line-height:1;color:#FFFFFF;font-weight:700;letter-spacing:0.05em;">TASK ALERT</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="content-pad" style="padding:24px 22px 22px;">
                <h1 style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:24px;line-height:1.25;color:#0F172A;">${safeHeadline}</h1>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 16px;">
                  ${summaryHtml}
                </table>
                <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 10px;">
                  <tr>
                    <td>
                      <a class="cta-button" href="${safeTaskUrl}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#1D4ED8;font-family:Arial,sans-serif;color:#FFFFFF;text-decoration:none;font-size:14px;line-height:1;font-weight:700;">Open Task</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:1.45;color:#64748B;">
                  If the button does not open, use this link:
                  <a href="${safeTaskUrl}" style="color:#1D4ED8;text-decoration:none;">${safeTaskUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 22px 18px;border-top:1px solid #E2E8F0;background:#F8FAFC;">
                <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:1.45;color:#475569;">This email was sent because task updates are enabled for your account.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  const text = `${input.headline}\n${input.summaryLines.map((line) => `- ${line}`).join("\n")}\nOpen task: ${taskUrl}`;

  const adapter = await getConfiguredEmailAdapter();
  await adapter.send({
    to: profile.email,
    subject: input.subject,
    html,
    text,
    activity: {
      module: "project-management",
      templateId: "taskLifecycleAlert",
      trigger: input.trigger,
      source: "nextjs",
      metadata: {
        recipientUid: input.recipientUid,
        ...input.metadata
      }
    }
  });

  return { sent: true };
}
