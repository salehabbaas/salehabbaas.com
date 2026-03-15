import { createHash } from "node:crypto";

import * as logger from "firebase-functions/logger";
import webpush, { type PushSubscription } from "web-push";

import { adminDb, adminMessaging } from "../admin";
import { getReminderRuntimeSettings, getUserReminderPreferences } from "./settings";

type NotificationModule = "tasks" | "bookings" | "linkedin" | "jobs" | "goals" | "audit" | "system";
type NotificationPriority = "low" | "medium" | "high" | "critical";

type NotificationWriteInput = {
  recipientId: string;
  dedupeKey: string;
  module: NotificationModule;
  sourceType: string;
  sourceId: string;
  title: string;
  body: string;
  priority?: NotificationPriority;
  ctaUrl?: string;
  scheduledFor?: Date;
  metadata?: Record<string, unknown>;
  channels?: {
    banner?: boolean;
    push?: boolean;
  };
  sendPush?: boolean;
};

function notificationIdFromDedupe(key: string) {
  return createHash("sha256").update(key).digest("hex").slice(0, 36);
}

function normalizeSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.DEFAULT_SITE_URL || "https://salehabbaas.com";
  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(normalized).toString();
  } catch {
    return "https://salehabbaas.com";
  }
}

function toAbsoluteLink(path: string) {
  if (!path) return "";
  try {
    return new URL(path, normalizeSiteUrl()).toString();
  } catch {
    return "";
  }
}

function normalizeStoredSubscription(raw: unknown): PushSubscription | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const endpoint = typeof data.endpoint === "string" ? data.endpoint.trim() : "";
  const keysRaw = data.keys;
  const keys = keysRaw && typeof keysRaw === "object" ? (keysRaw as Record<string, unknown>) : null;
  const p256dh = typeof keys?.p256dh === "string" ? keys.p256dh.trim() : "";
  const auth = typeof keys?.auth === "string" ? keys.auth.trim() : "";
  const expirationTime = typeof data.expirationTime === "number" ? data.expirationTime : null;

  if (!endpoint || !p256dh || !auth) return null;

  return {
    endpoint,
    expirationTime,
    keys: {
      p256dh,
      auth
    }
  };
}

function resolveVapidConfig() {
  const publicKey = (
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ||
    ""
  ).trim();
  const privateKey = (process.env.WEB_PUSH_VAPID_PRIVATE_KEY || "").trim();
  const configuredSubject = (process.env.WEB_PUSH_SUBJECT || "").trim();
  let subject = "mailto:notifications@salehabbaas.com";

  try {
    const hostname = new URL(normalizeSiteUrl()).hostname;
    subject = configuredSubject || `mailto:notifications@${hostname}`;
  } catch {
    subject = configuredSubject || subject;
  }

  return { publicKey, privateKey, subject };
}

type PushDevice = {
  id: string;
  ref: FirebaseFirestore.DocumentReference;
  token: string;
  subscription: PushSubscription | null;
};

function datePartsInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit"
  }).formatToParts(date);

  const map = new Map<string, string>();
  parts.forEach((part) => {
    if (part.type !== "literal") map.set(part.type, part.value);
  });

  return {
    hour: Number(map.get("hour")),
    minute: Number(map.get("minute"))
  };
}

function parseHm(value: string) {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function isQuietHoursNow(input: { timezone: string; startHm: string; endHm: string; now: Date }) {
  const start = parseHm(input.startHm);
  const end = parseHm(input.endHm);
  if (start === null || end === null) return false;

  const local = datePartsInTimezone(input.now, input.timezone || "UTC");
  const current = local.hour * 60 + local.minute;

  if (start === end) return false;
  if (start < end) {
    return current >= start && current < end;
  }

  return current >= start || current < end;
}

async function sendPushToUser(input: {
  uid: string;
  title: string;
  body: string;
  link: string;
  data: Record<string, string>;
}) {
  const devicesSnap = await adminDb.collection("users").doc(input.uid).collection("notificationDevices").where("enabled", "==", true).get();
  if (devicesSnap.empty) return { sent: 0, failed: 0 };

  const devices = devicesSnap.docs.map((entry) => {
    const data = entry.data() as Record<string, unknown>;
    return {
      id: entry.id,
      ref: entry.ref,
      token: typeof data.token === "string" ? data.token.trim() : "",
      subscription: normalizeStoredSubscription(data.subscription)
    } satisfies PushDevice;
  });

  let sent = 0;
  let failed = 0;

  const staleTokenDeviceIds = new Set<string>();
  const staleSubscriptionDeviceIds = new Set<string>();
  const vapid = resolveVapidConfig();
  const canSendWebPush = Boolean(vapid.publicKey && vapid.privateKey);

  const endpointToDevices = new Map<string, PushDevice[]>();
  const subscriptionBackedTokens = new Set<string>();

  devices.forEach((device) => {
    const endpoint = device.subscription?.endpoint?.trim() ?? "";
    if (!endpoint || !canSendWebPush) return;

    const rows = endpointToDevices.get(endpoint) ?? [];
    rows.push(device);
    endpointToDevices.set(endpoint, rows);

    if (device.token) {
      subscriptionBackedTokens.add(device.token);
    }
  });

  const tokenToDevices = new Map<string, PushDevice[]>();
  devices.forEach((device) => {
    if (!device.token || subscriptionBackedTokens.has(device.token)) return;
    const rows = tokenToDevices.get(device.token) ?? [];
    rows.push(device);
    tokenToDevices.set(device.token, rows);
  });

  const undeliverableSubscriptionCount = devices.filter(
    (device) => Boolean(device.subscription) && !device.token && !canSendWebPush
  ).length;
  failed += undeliverableSubscriptionCount;

  const tokens = Array.from(tokenToDevices.keys());
  if (tokens.length) {
    const response = await adminMessaging.sendEachForMulticast({
      tokens,
      notification: {
        title: input.title,
        body: input.body
      },
      data: input.data,
      webpush: {
        fcmOptions: {
          link: input.link || undefined
        }
      }
    });

    sent += response.successCount;
    failed += response.failureCount;

    response.responses.forEach((item, index) => {
      if (item.success) return;
      const code = item.error?.code ?? "";
      if (!code.includes("registration-token-not-registered") && !code.includes("invalid-registration-token")) {
        return;
      }

      const token = tokens[index];
      const refs = tokenToDevices.get(token) ?? [];
      refs.forEach((device) => staleTokenDeviceIds.add(device.id));
    });
  }

  if (endpointToDevices.size && canSendWebPush) {
    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
    const payload = JSON.stringify({
      notification: {
        title: input.title,
        body: input.body
      },
      data: {
        ...input.data,
        _provider: "webpush"
      }
    });

    await Promise.all(
      Array.from(endpointToDevices.entries()).map(async ([endpoint, endpointDevices]) => {
        const subscription = endpointDevices[0]?.subscription;
        if (!subscription) return;
        try {
          await webpush.sendNotification(subscription, payload, {
            TTL: 60 * 60
          });
          sent += 1;
        } catch (error) {
          failed += 1;
          const statusCode =
            typeof error === "object" && error && "statusCode" in error
              ? Number((error as { statusCode?: number }).statusCode)
              : 0;
          if (statusCode === 404 || statusCode === 410) {
            const staleGroup = endpointToDevices.get(endpoint) ?? [];
            staleGroup.forEach((device) => staleSubscriptionDeviceIds.add(device.id));
          }
        }
      })
    );
  }

  if (staleTokenDeviceIds.size || staleSubscriptionDeviceIds.size) {
    const staleIds = new Set<string>([...staleTokenDeviceIds, ...staleSubscriptionDeviceIds]);
    const batch = adminDb.batch();

    devices
      .filter((device) => staleIds.has(device.id))
      .forEach((device) => {
        const clearToken = staleTokenDeviceIds.has(device.id);
        const clearSubscription = staleSubscriptionDeviceIds.has(device.id);
        const keepToken = Boolean(device.token) && !clearToken;
        const keepSubscription = Boolean(device.subscription) && !clearSubscription;

        if (!keepToken && !keepSubscription) {
          batch.delete(device.ref);
          return;
        }

        const patch: Record<string, unknown> = {
          updatedAt: new Date()
        };

        if (clearToken) {
          patch.token = "";
        }

        if (clearSubscription) {
          patch.subscription = null;
          patch.endpoint = "";
        }

        batch.set(device.ref, patch, { merge: true });
      });

    await batch.commit().catch(() => {
      // Ignore stale-device cleanup failures.
    });
  }

  return { sent, failed };
}

export async function createNotification(input: NotificationWriteInput) {
  const runtime = await getReminderRuntimeSettings();
  const userPrefs = await getUserReminderPreferences(input.recipientId);

  if (!runtime.channels.inAppEnabled || !userPrefs.inAppEnabled) {
    return { created: false, id: "" };
  }

  const now = new Date();
  const pushEnabled =
    runtime.channels.pushEnabled &&
    userPrefs.pushEnabled &&
    input.channels?.push !== false &&
    input.sendPush !== false &&
    !isQuietHoursNow({
      timezone: userPrefs.timezone,
      startHm: runtime.channels.quietHoursStart,
      endHm: runtime.channels.quietHoursEnd,
      now
    });

  const bannerEnabled = runtime.channels.bannerEnabled && userPrefs.bannerEnabled && input.channels?.banner !== false;

  const id = notificationIdFromDedupe(input.dedupeKey);
  const ref = adminDb.collection("users").doc(input.recipientId).collection("notifications").doc(id);
  const eventRef = adminDb.collection("users").doc(input.recipientId).collection("notificationEvents").doc(id);
  const existing = await ref.get();
  if (existing.exists) {
    return { created: false, id };
  }

  const absoluteLink = toAbsoluteLink(input.ctaUrl || "/admin/system-inbox");

  const payload = {
    module: input.module,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    title: input.title,
    body: input.body,
    priority: input.priority ?? "medium",
    state: "unread",
    channels: {
      inApp: true,
      banner: bannerEnabled,
      push: pushEnabled
    },
    ctaUrl: absoluteLink,
    scheduledFor: input.scheduledFor ?? null,
    metadata: input.metadata ?? {},
    createdAt: now,
    updatedAt: now,
    readAt: null,
    dismissedAt: null
  };

  await Promise.all([ref.set(payload), eventRef.set(payload)]);

  if (pushEnabled) {
    try {
      await sendPushToUser({
        uid: input.recipientId,
        title: input.title,
        body: input.body,
        link: absoluteLink,
        data: {
          notificationId: id,
          ctaUrl: absoluteLink,
          module: input.module,
          sourceType: input.sourceType,
          sourceId: input.sourceId
        }
      });
    } catch (error) {
      logger.error("Push send failed", {
        recipientId: input.recipientId,
        message: error instanceof Error ? error.message : "unknown"
      });
    }
  }

  return {
    created: true,
    id
  };
}
