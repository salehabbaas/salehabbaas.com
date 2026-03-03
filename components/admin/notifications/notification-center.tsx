"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { Bell, BellRing, CheckCheck, Clock3, ExternalLink, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/firebase/client";
import {
  dismissNotification,
  markAllNotificationsRead,
  markNotificationRead,
  observeRecentNotifications,
  observeUnreadCount
} from "@/lib/notifications/client";
import {
  disablePushOnThisBrowser,
  getPushStatus,
  requestPushPermissionAndRegister,
  subscribeForegroundMessages
} from "@/lib/notifications/push";
import type { NotificationDoc } from "@/types/notifications";
import { formatDate } from "@/lib/utils";

function priorityTone(priority: NotificationDoc["priority"]) {
  if (priority === "critical") return "border-destructive/50 bg-destructive/10 text-destructive";
  if (priority === "high") return "border-warning/40 bg-warning/10 text-warning";
  if (priority === "medium") return "border-primary/35 bg-primary/10 text-primary";
  return "border-border/70 bg-card/70 text-muted-foreground";
}

export function NotificationCenter({ uid: uidProp, maxItems = 40 }: { uid?: string; maxItems?: number }) {
  const [uid, setUid] = useState(uidProp || "");
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState("");
  const [pushEnabledOnBrowser, setPushEnabledOnBrowser] = useState(false);
  const [checkingPushStatus, setCheckingPushStatus] = useState(false);
  const [togglingPush, setTogglingPush] = useState(false);

  useEffect(() => {
    if (uidProp) {
      setUid(uidProp);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? "");
    });

    return () => unsubscribe();
  }, [uidProp]);

  useEffect(() => {
    if (!uid) return;

    const handleListenError = (error: { code?: string; message: string }) => {
      setStatus(
        error.code === "permission-denied"
          ? "Notifications are unavailable for this admin account."
          : error.message || "Unable to load notifications."
      );
    };

    const unsubRecent = observeRecentNotifications(uid, setNotifications, maxItems, handleListenError);
    const unsubUnread = observeUnreadCount(uid, setUnreadCount, handleListenError);

    return () => {
      unsubRecent();
      unsubUnread();
    };
  }, [uid, maxItems]);

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    async function connectForegroundPush() {
      const unsub = await subscribeForegroundMessages((payload) => {
        setStatus(payload.notification?.title ? `Push received: ${payload.notification.title}` : "Push message received.");
      });
      unsubs.push(unsub);
    }

    void connectForegroundPush();

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

  const unreadItems = useMemo(() => notifications.filter((item) => item.state === "unread").length, [notifications]);

  useEffect(() => {
    let active = true;

    async function loadPushStatus() {
      if (!uid) {
        setPushEnabledOnBrowser(false);
        setCheckingPushStatus(false);
        return;
      }
      setCheckingPushStatus(true);
      try {
        const pushStatus = await getPushStatus(uid);
        if (active) setPushEnabledOnBrowser(pushStatus.enabled);
      } catch {
        if (active) setPushEnabledOnBrowser(false);
      } finally {
        if (active) setCheckingPushStatus(false);
      }
    }

    void loadPushStatus();
    return () => {
      active = false;
    };
  }, [uid]);

  async function onTogglePush() {
    if (!uid) return;
    setTogglingPush(true);
    try {
      const result = pushEnabledOnBrowser
        ? await disablePushOnThisBrowser(uid)
        : await requestPushPermissionAndRegister(uid);
      setStatus(result.message);
      const pushStatus = await getPushStatus(uid);
      setPushEnabledOnBrowser(pushStatus.enabled);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to update push notification setting.");
    } finally {
      setTogglingPush(false);
    }
  }

  async function onMarkRead(notificationId: string) {
    if (!uid) return;
    setBusyId(notificationId);
    setStatus("");
    try {
      await markNotificationRead(uid, notificationId);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to mark notification as read.");
    } finally {
      setBusyId("");
    }
  }

  async function onDismiss(notificationId: string) {
    if (!uid) return;
    setBusyId(notificationId);
    setStatus("");
    try {
      await dismissNotification(uid, notificationId);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to dismiss notification.");
    } finally {
      setBusyId("");
    }
  }

  async function onMarkAllRead() {
    if (!uid) return;
    setBusyId("all");
    setStatus("");
    try {
      await markAllNotificationsRead(uid);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to mark all notifications as read.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-4 w-4" />
          Notification Center
        </CardTitle>
        <CardDescription>Unread: {unreadItems || unreadCount}. Use this feed for reminders and alerts.</CardDescription>
        {status ? <p className="text-sm text-primary">{status}</p> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onTogglePush} disabled={!uid || checkingPushStatus || togglingPush}>
            <Bell className="h-4 w-4" />
            {togglingPush
              ? pushEnabledOnBrowser
                ? "Disabling Push..."
                : "Enabling Push..."
              : checkingPushStatus
                ? "Checking Push..."
                : pushEnabledOnBrowser
                  ? "Disable Push"
                  : "Enable Push"}
          </Button>
          <Button type="button" variant="outline" onClick={onMarkAllRead} disabled={busyId === "all" || !unreadCount}>
            <CheckCheck className="h-4 w-4" />
            Mark All Read
          </Button>
        </div>

        {notifications.map((item) => (
          <div key={item.id} className="rounded-xl border border-border/70 bg-card/70 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{item.title}</p>
                  <Badge className={priorityTone(item.priority)}>{item.priority}</Badge>
                  <Badge variant={item.state === "unread" ? "default" : "outline"}>{item.state}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" />
                  {formatDate(item.createdAt)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {item.ctaUrl ? (
                  <Button type="button" variant="outline" size="sm" asChild>
                    <a href={item.ctaUrl}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open
                    </a>
                  </Button>
                ) : null}
                {item.state === "unread" ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => void onMarkRead(item.id)} disabled={busyId === item.id}>
                    Mark Read
                  </Button>
                ) : null}
                {item.state !== "dismissed" ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => void onDismiss(item.id)} disabled={busyId === item.id}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Dismiss
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ))}

        {!notifications.length ? <p className="text-sm text-muted-foreground">No notifications yet.</p> : null}
      </CardContent>
    </Card>
  );
}
