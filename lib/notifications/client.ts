"use client";

import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { NotificationDoc, NotificationPriority, NotificationState } from "@/types/notifications";
import type { FirestoreError } from "firebase/firestore";

function toIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return undefined;
}

function notificationsCollection(uid: string) {
  return collection(db, "users", uid, "notifications");
}

function observeByPolling<T>(input: {
  run: () => Promise<T>;
  onData: (value: T) => void;
  onError?: (error: FirestoreError) => void;
  intervalMs?: number;
}) {
  let active = true;
  const intervalMs = input.intervalMs ?? 10000;

  const tick = async () => {
    try {
      const value = await input.run();
      if (!active) return;
      input.onData(value);
    } catch (error) {
      if (!active) return;
      input.onError?.(error as FirestoreError);
    }
  };

  void tick();
  const timer = window.setInterval(() => {
    void tick();
  }, intervalMs);

  return () => {
    active = false;
    window.clearInterval(timer);
  };
}

function mapNotification(id: string, data: Record<string, unknown>): NotificationDoc {
  const priorityRaw = String(data.priority ?? "medium");
  const stateRaw = String(data.state ?? "unread");

  const priority: NotificationPriority = ["low", "medium", "high", "critical"].includes(priorityRaw)
    ? (priorityRaw as NotificationPriority)
    : "medium";

  const state: NotificationState = ["unread", "read", "dismissed"].includes(stateRaw)
    ? (stateRaw as NotificationState)
    : "unread";

  return {
    id,
    module: (["tasks", "bookings", "linkedin", "jobs", "goals", "audit", "system"].includes(String(data.module))
      ? String(data.module)
      : "system") as NotificationDoc["module"],
    sourceType: String(data.sourceType ?? ""),
    sourceId: String(data.sourceId ?? ""),
    title: String(data.title ?? "Notification"),
    body: String(data.body ?? ""),
    priority,
    state,
    channels: {
      inApp: Boolean((data.channels as Record<string, unknown> | undefined)?.inApp ?? true),
      banner: Boolean((data.channels as Record<string, unknown> | undefined)?.banner ?? true),
      push: Boolean((data.channels as Record<string, unknown> | undefined)?.push ?? false)
    },
    ctaUrl: typeof data.ctaUrl === "string" ? data.ctaUrl : "",
    scheduledFor: toIso(data.scheduledFor),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    readAt: toIso(data.readAt),
    dismissedAt: toIso(data.dismissedAt),
    metadata: (data.metadata ?? {}) as Record<string, unknown>
  };
}

export function observeRecentNotifications(
  uid: string,
  onData: (items: NotificationDoc[]) => void,
  maxItems = 40,
  onError?: (error: FirestoreError) => void
) {
  const notificationsQuery = query(notificationsCollection(uid), orderBy("createdAt", "desc"), limit(maxItems));
  return observeByPolling({
    run: async () => {
      const snap = await getDocs(notificationsQuery);
      return snap.docs.map((entry) => mapNotification(entry.id, entry.data() as Record<string, unknown>));
    },
    onData,
    onError
  });
}

export function observeUnreadNotifications(
  uid: string,
  onData: (items: NotificationDoc[]) => void,
  maxItems = 20,
  onError?: (error: FirestoreError) => void
) {
  const unreadQuery = query(
    notificationsCollection(uid),
    where("state", "==", "unread"),
    orderBy("createdAt", "desc"),
    limit(maxItems)
  );
  return observeByPolling({
    run: async () => {
      const snap = await getDocs(unreadQuery);
      return snap.docs.map((entry) => mapNotification(entry.id, entry.data() as Record<string, unknown>));
    },
    onData,
    onError
  });
}

export function observeUnreadCount(uid: string, onData: (count: number) => void, onError?: (error: FirestoreError) => void) {
  const unreadQuery = query(notificationsCollection(uid), where("state", "==", "unread"), limit(100));
  return observeByPolling({
    run: async () => {
      const snap = await getDocs(unreadQuery);
      return snap.size;
    },
    onData,
    onError
  });
}

export async function markNotificationRead(uid: string, notificationId: string) {
  const ref = doc(db, "users", uid, "notifications", notificationId);
  await updateDoc(ref, {
    state: "read",
    readAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function dismissNotification(uid: string, notificationId: string) {
  const ref = doc(db, "users", uid, "notifications", notificationId);
  await updateDoc(ref, {
    state: "dismissed",
    dismissedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function markAllNotificationsRead(uid: string) {
  const unreadQuery = query(notificationsCollection(uid), where("state", "==", "unread"), limit(120));
  const snap = await getDocs(unreadQuery);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((entry) => {
    batch.update(entry.ref, {
      state: "read",
      readAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });
  await batch.commit();
}
