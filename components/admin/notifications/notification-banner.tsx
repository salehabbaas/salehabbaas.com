"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { AlertTriangle, BellRing, ChevronDown, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase/client";
import { dismissNotification, markNotificationRead, observeUnreadNotifications } from "@/lib/notifications/client";
import type { NotificationDoc } from "@/types/notifications";

export function NotificationBanner() {
  const [uid, setUid] = useState("");
  const [items, setItems] = useState<NotificationDoc[]>([]);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? "");
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;
    const unsub = observeUnreadNotifications(uid, setItems, 5, () => {
      setItems([]);
    });
    return () => unsub();
  }, [uid]);

  const top = useMemo(() => items.find((item) => item.channels.banner && item.state === "unread"), [items]);
  const topItem = top;

  useEffect(() => {
    setExpanded(false);
  }, [topItem?.id]);

  if (!topItem) return null;

  async function onMarkRead() {
    if (!uid) return;
    const current = topItem;
    if (!current) return;
    setBusy(true);
    try {
      await markNotificationRead(uid, current.id);
    } finally {
      setBusy(false);
    }
  }

  async function onDismiss() {
    if (!uid) return;
    const current = topItem;
    if (!current) return;
    setBusy(true);
    try {
      await dismissNotification(uid, current.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed right-4 top-20 z-[70] w-[min(88vw,24rem)] rounded-2xl border border-warning/45 bg-warning/10 p-2 shadow-elev2 backdrop-blur sm:right-6">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 rounded-xl border border-warning/40 bg-background/80 px-2.5 py-2 text-left text-sm font-medium transition-colors hover:bg-background"
        aria-expanded={expanded}
        aria-label="Toggle reminder details"
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
        <span className="min-w-0 flex-1 truncate">{topItem.title}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : "rotate-0"}`} />
      </button>

      <div
        className={`grid transition-all duration-300 ease-out ${expanded ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <div className="rounded-xl border border-warning/35 bg-background/70 p-2.5">
            <div className="inline-flex items-center gap-2 text-sm font-semibold">
              <span>{topItem.title}</span>
              <Badge variant="outline" className="border-warning/50 text-warning">
                {topItem.priority}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-foreground/85">{topItem.body}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" asChild>
                <Link href={topItem.ctaUrl || "/admin/settings/reminders"}>
                  <BellRing className="h-3.5 w-3.5" />
                  Open
                </Link>
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => void onMarkRead()} disabled={busy}>
                Mark read
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => void onDismiss()} disabled={busy}>
                <X className="h-3.5 w-3.5" />
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
