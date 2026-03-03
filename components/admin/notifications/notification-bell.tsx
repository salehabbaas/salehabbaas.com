"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { Bell } from "lucide-react";

import { NotificationCenter } from "@/components/admin/notifications/notification-center";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { auth } from "@/lib/firebase/client";
import { observeUnreadCount } from "@/lib/notifications/client";

export function NotificationBell() {
  const [uid, setUid] = useState("");
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? "");
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;

    const unsub = observeUnreadCount(uid, setUnread, () => {
      setUnread(0);
    });
    return () => unsub();
  }, [uid]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Open notifications" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <Badge className="absolute -right-2 -top-2 h-5 min-w-5 rounded-full px-1 text-[10px] leading-none">{unread}</Badge>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Notifications</DialogTitle>
        </DialogHeader>
        <NotificationCenter uid={uid} maxItems={60} />
      </DialogContent>
    </Dialog>
  );
}
