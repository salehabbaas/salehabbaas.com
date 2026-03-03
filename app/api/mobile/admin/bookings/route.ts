import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/lib/auth/admin-api";
import { getBlockedSlots, getBookings, getBookingSettings } from "@/lib/firestore/booking";

export const runtime = "nodejs";

export async function GET() {
  const user = await verifyAdminRequest({ requiredModule: "bookings" });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [settings, bookings, blockedSlots] = await Promise.all([
    getBookingSettings(),
    getBookings({ limit: 120 }),
    getBlockedSlots()
  ]);

  return NextResponse.json({
    apiVersion: "2026-03-01",
    settings,
    bookings,
    blockedSlots
  });
}
