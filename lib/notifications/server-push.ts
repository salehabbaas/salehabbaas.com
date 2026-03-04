import type { PushSubscription } from "web-push";
import webpush from "web-push";

import { adminDb, adminMessaging } from "@/lib/firebase/admin";
import { resolveSiteUrl } from "@/lib/utils";

export type PushDeviceRecord = {
  id: string;
  ref: FirebaseFirestore.DocumentReference;
  token: string;
  subscription: PushSubscription | null;
};

function toAbsoluteLink(path: string) {
  if (!path) return "";
  try {
    return new URL(path, resolveSiteUrl()).toString();
  } catch {
    return "";
  }
}

function normalizeSubscription(raw: unknown): PushSubscription | null {
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

  let defaultSubject = "mailto:notifications@salehabbaas.com";
  try {
    const hostname = new URL(resolveSiteUrl()).hostname;
    defaultSubject = `mailto:notifications@${hostname}`;
  } catch {
    // Keep static default.
  }

  return {
    publicKey,
    privateKey,
    subject: configuredSubject || defaultSubject
  };
}

export async function loadEnabledPushDevices(uid: string) {
  const devicesSnap = await adminDb
    .collection("users")
    .doc(uid)
    .collection("notificationDevices")
    .where("enabled", "==", true)
    .get();

  return devicesSnap.docs.map((entry) => {
    const data = entry.data() as Record<string, unknown>;
    return {
      id: entry.id,
      ref: entry.ref,
      token: typeof data.token === "string" ? data.token.trim() : "",
      subscription: normalizeSubscription(data.subscription)
    } satisfies PushDeviceRecord;
  });
}

export function countDeliverableDevices(devices: PushDeviceRecord[]) {
  return devices.filter((device) => Boolean(device.token || device.subscription)).length;
}

export async function sendBrowserPushToUser(input: {
  uid: string;
  title: string;
  body: string;
  link: string;
  data?: Record<string, string>;
}) {
  const devices = await loadEnabledPushDevices(input.uid);
  if (!devices.length) {
    return { sent: 0, failed: 0, deliverableDevices: 0 };
  }

  const absoluteLink = toAbsoluteLink(input.link || "/admin/system-inbox");
  const data = {
    ...(input.data ?? {}),
    ctaUrl: absoluteLink
  };

  let sent = 0;
  let failed = 0;

  const staleTokenDeviceIds = new Set<string>();
  const staleSubscriptionDeviceIds = new Set<string>();
  const vapid = resolveVapidConfig();
  const canSendWebPush = Boolean(vapid.publicKey && vapid.privateKey);

  const endpointToDevices = new Map<string, PushDeviceRecord[]>();
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

  const tokenToDevices = new Map<string, PushDeviceRecord[]>();
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
      data,
      webpush: {
        fcmOptions: {
          link: absoluteLink || undefined
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
        ...data,
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
    const staleDevices = devices.filter((device) => staleIds.has(device.id));
    const batch = adminDb.batch();

    staleDevices.forEach((device) => {
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
      // Ignore stale-device cleanup issues.
    });
  }

  return {
    sent,
    failed,
    deliverableDevices: countDeliverableDevices(devices)
  };
}
