import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyAdminSessionFromCookie } from "@/lib/auth/admin-api";
import { setRemoteBookingFlag, getRemoteBookingFlag } from "@/lib/firebase/remote-config";
import { adminDb } from "@/lib/firebase/admin";

const schema = z.object({
  bookingEnabled: z.boolean()
});

export async function GET() {
  const user = await verifyAdminSessionFromCookie();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const remote = await getRemoteBookingFlag();
  const firestoreSnap = await adminDb.collection("bookingSettings").doc("default").get();
  const firestoreValue = firestoreSnap.data()?.enabled;

  return NextResponse.json({
    bookingEnabled: typeof remote === "boolean" ? remote : Boolean(firestoreValue ?? true),
    source: typeof remote === "boolean" ? "remote-config" : "firestore"
  });
}

export async function POST(request: Request) {
  const user = await verifyAdminSessionFromCookie();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { bookingEnabled } = schema.parse(body);

    await Promise.all([
      setRemoteBookingFlag(bookingEnabled),
      adminDb.collection("bookingSettings").doc("default").set({ enabled: bookingEnabled, updatedAt: new Date() }, { merge: true })
    ]);

    return NextResponse.json({ success: true, bookingEnabled });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update feature flag";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
