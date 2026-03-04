"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { getToken, isSupported, onMessage, type MessagePayload } from "firebase/messaging";

import { db } from "@/lib/firebase/client";

const DEVICE_KEY = "sa_notification_device_id";

type SerializedPushSubscription = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

function getOrCreateDeviceId() {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;

    const next =
      typeof window.crypto?.randomUUID === "function"
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    window.localStorage.setItem(DEVICE_KEY, next);
    return next;
  } catch {
    return "";
  }
}

function buildServiceWorkerUrl() {
  const params = new URLSearchParams({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ""
  });

  return `/firebase-messaging-sw.js?${params.toString()}`;
}

function getWebPushPublicKey() {
  return (
    process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ||
    ""
  ).trim();
}

function base64UrlToUint8Array(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const decoded = atob(normalized + padding);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }
  return bytes;
}

function normalizeSerializedSubscription(value: PushSubscription | PushSubscriptionJSON | null | undefined) {
  if (!value) return null;
  const json = (
    "toJSON" in value && typeof value.toJSON === "function" ? value.toJSON() : value
  ) as PushSubscriptionJSON & {
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  };
  const endpoint = typeof json.endpoint === "string" ? json.endpoint.trim() : "";
  const p256dh = typeof json.keys?.p256dh === "string" ? json.keys.p256dh.trim() : "";
  const auth = typeof json.keys?.auth === "string" ? json.keys.auth.trim() : "";
  if (!endpoint || !p256dh || !auth) return null;

  return {
    endpoint,
    expirationTime: typeof json.expirationTime === "number" ? json.expirationTime : null,
    keys: { p256dh, auth }
  } satisfies SerializedPushSubscription;
}

async function upsertDevice(input: {
  uid: string;
  enabled: boolean;
  token?: string;
  subscription?: PushSubscription | PushSubscriptionJSON | null;
}) {
  const deviceId = getOrCreateDeviceId();
  if (!deviceId) return;

  const normalizedToken = typeof input.token === "string" ? input.token.trim() : "";
  const normalizedSubscription = normalizeSerializedSubscription(input.subscription);
  const updatePayload: Record<string, unknown> = {
    enabled: input.enabled,
    platform: typeof navigator !== "undefined" ? navigator.platform : "",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 280) : "",
    lastSeenAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp()
  };

  if (normalizedToken) {
    updatePayload.token = normalizedToken;
  }

  if (normalizedSubscription) {
    updatePayload.subscription = normalizedSubscription;
    updatePayload.endpoint = normalizedSubscription.endpoint;
  }

  const ref = doc(db, "users", input.uid, "notificationDevices", deviceId);
  await setDoc(
    ref,
    updatePayload,
    { merge: true }
  );

  const duplicateIds = new Set<string>();

  if (normalizedToken) {
    const tokenMatches = await getDocs(
      query(collection(db, "users", input.uid, "notificationDevices"), where("token", "==", normalizedToken))
    );
    tokenMatches.docs.forEach((entry) => {
      const data = entry.data() as Record<string, unknown>;
      if (entry.id !== deviceId && data.enabled === true) {
        duplicateIds.add(entry.id);
      }
    });
  }

  if (normalizedSubscription?.endpoint) {
    const endpointMatches = await getDocs(
      query(collection(db, "users", input.uid, "notificationDevices"), where("endpoint", "==", normalizedSubscription.endpoint))
    );
    endpointMatches.docs.forEach((entry) => {
      const data = entry.data() as Record<string, unknown>;
      if (entry.id !== deviceId && data.enabled === true) {
        duplicateIds.add(entry.id);
      }
    });
  }

  if (duplicateIds.size) {
    const batch = writeBatch(db);
    duplicateIds.forEach((id) => {
      batch.set(
        doc(db, "users", input.uid, "notificationDevices", id),
        {
          enabled: false,
          updatedAt: serverTimestamp(),
          disabledAt: serverTimestamp()
        },
        { merge: true }
      );
    });
    await batch.commit();
  }
}

type PushStatus = {
  ok: boolean;
  enabled: boolean;
  permission: NotificationPermission | "unsupported";
  message: string;
};

function getPushPermissionState(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestPushPermissionAndRegister(uid: string) {
  if (typeof window === "undefined") {
    return { ok: false, message: "Push is only available in the browser." };
  }

  if (!window.isSecureContext) {
    return { ok: false, message: "Push requires HTTPS (or localhost)." };
  }

  const vapidKey = getWebPushPublicKey();
  if (!vapidKey) {
    return {
      ok: false,
      message: "Missing NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY (or NEXT_PUBLIC_FIREBASE_VAPID_KEY)."
    };
  }

  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, message: "Browser does not support push notifications." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    if (permission === "denied") {
      return {
        ok: false,
        message:
          "Push permission is blocked by browser settings. Enable notifications for this site in Safari/Chrome and macOS Notification Center, then try again.",
        permission
      };
    }

    return {
      ok: false,
      message: "Push permission prompt was dismissed. Click Enable Push and choose Allow.",
      permission
    };
  }

  const registration = await navigator.serviceWorker.register(buildServiceWorkerUrl());

  let subscription: PushSubscription | null = null;
  let token = "";
  const issues: string[] = [];

  try {
    subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(vapidKey)
      });
    }
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "Native browser push subscription failed.");
  }

  const supported = await isSupported().catch(() => false);
  if (supported) {
    try {
      const { getMessaging } = await import("firebase/messaging");
      const { getApp } = await import("firebase/app");
      const messaging = getMessaging(getApp());
      token = (
        await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: registration
        })
      )?.trim() || "";
    } catch (error) {
      issues.push(error instanceof Error ? error.message : "Firebase messaging token registration failed.");
    }
  }

  if (!subscription && !token) {
    return {
      ok: false,
      message:
        issues[0] ||
        "Unable to register push on this browser. Check VAPID keys and browser push settings.",
      permission
    };
  }

  await upsertDevice({ uid, token: token || undefined, subscription, enabled: true });
  return {
    ok: true,
    message: "Push notifications enabled on this browser.",
    permission
  };
}

export async function getPushStatus(uid: string): Promise<PushStatus> {
  const permission = getPushPermissionState();
  if (typeof window === "undefined") {
    return { ok: false, enabled: false, permission, message: "Push is only available in the browser." };
  }

  const deviceId = getOrCreateDeviceId();
  if (!deviceId) {
    return { ok: false, enabled: false, permission, message: "Unable to detect this browser device." };
  }

  try {
    const ref = doc(db, "users", uid, "notificationDevices", deviceId);
    const snapshot = await getDoc(ref);
    const data = snapshot.data() ?? {};
    const hasFcmToken = typeof data.token === "string" && data.token.trim().length > 0;
    const hasWebPushSubscription = Boolean(
      data.subscription &&
      typeof data.subscription === "object" &&
      typeof (data.subscription as { endpoint?: unknown }).endpoint === "string"
    );
    const enabled = Boolean(data.enabled) && (hasFcmToken || hasWebPushSubscription);
    return {
      ok: true,
      enabled,
      permission,
      message: enabled ? "Push notifications enabled on this browser." : "Push notifications disabled on this browser."
    };
  } catch {
    return { ok: false, enabled: false, permission, message: "Unable to read push notification status." };
  }
}

export async function disablePushOnThisBrowser(uid: string) {
  if (typeof window === "undefined") {
    return { ok: false, message: "Push is only available in the browser." };
  }

  const deviceId = getOrCreateDeviceId();
  if (!deviceId) {
    return { ok: false, message: "Unable to detect this browser device." };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
  } catch {
    // Continue even if browser unsubscribe fails.
  }

  const ref = doc(db, "users", uid, "notificationDevices", deviceId);
  const snapshot = await getDoc(ref).catch(() => null);
  if (!snapshot?.exists()) {
    return { ok: true, message: "Push notifications are already disabled on this browser." };
  }

  await setDoc(
    ref,
    {
      enabled: false,
      updatedAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
      disabledAt: serverTimestamp()
    },
    { merge: true }
  );

  return { ok: true, message: "Push notifications disabled for this browser." };
}

export async function subscribeForegroundMessages(handler: (payload: MessagePayload) => void) {
  const unsubscribers: Array<() => void> = [];

  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    const onWorkerMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; payload?: MessagePayload } | undefined;
      if (data?.type === "sa_push_message" && data.payload) {
        handler(data.payload);
      }
    };

    navigator.serviceWorker.addEventListener("message", onWorkerMessage);
    unsubscribers.push(() => navigator.serviceWorker.removeEventListener("message", onWorkerMessage));
  }

  const supported = await isSupported().catch(() => false);
  if (supported) {
    const { getMessaging } = await import("firebase/messaging");
    const { getApp } = await import("firebase/app");
    const messaging = getMessaging(getApp());
    const unsub = onMessage(messaging, handler);
    unsubscribers.push(unsub);
  }

  return () => {
    unsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch {
        // Ignore teardown issues.
      }
    });
  };
}
