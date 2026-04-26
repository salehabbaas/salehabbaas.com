import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

function asIso(value: unknown) {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return undefined;
}

export async function GET() {
  const user = await verifyAdminRequest({ requiredModule: "dashboard" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const snap = await adminDb
      .collection("notifications")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const notifications = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        module: String(data.module ?? "system"),
        title: String(data.title ?? ""),
        body: String(data.body ?? ""),
        priority: String(data.priority ?? "medium"),
        state: String(data.state ?? "unread"),
        ctaUrl: data.ctaUrl ? String(data.ctaUrl) : undefined,
        createdAt: asIso(data.createdAt),
      };
    });

    const unreadCount = notifications.filter((n) => n.state === "unread").length;

    return NextResponse.json({
      apiVersion: "2026-03-01",
      notifications,
      unreadCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load notifications";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const actionSchema = z.object({
  action: z.enum(["read", "dismiss"]),
  notificationId: z.string().min(1),
});

export async function POST(request: Request) {
  const user = await verifyAdminRequest({ requiredModule: "dashboard" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const payload = actionSchema.parse(body);

    const ref = adminDb.collection("notifications").doc(payload.notificationId);
    await ref.set(
      {
        state: payload.action === "read" ? "read" : "dismissed",
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update notification";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
