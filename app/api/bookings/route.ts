import { NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/firebase/admin";
import { getBookingSettings } from "@/lib/firestore/booking";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  reason: z.string().min(3),
  timezone: z.string().min(2),
  meetingTypeId: z.string().min(2),
  startAt: z.string().min(10)
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = schema.parse(body);

    const settings = await getBookingSettings();
    if (!settings.enabled) {
      return NextResponse.json({ error: "Booking is currently disabled" }, { status: 403 });
    }

    const meetingType = settings.meetingTypes.find((type) => type.id === payload.meetingTypeId);
    if (!meetingType) {
      return NextResponse.json({ error: "Invalid meeting type" }, { status: 400 });
    }

    const start = new Date(payload.startAt);
    const end = new Date(start.getTime() + meetingType.durationMinutes * 60 * 1000);

    const existing = await adminDb
      .collection("bookings")
      .where("startAt", "==", start)
      .where("status", "in", ["confirmed", "rescheduled"])
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json({ error: "This slot was already booked" }, { status: 409 });
    }

    const docRef = await adminDb.collection("bookings").add({
      name: payload.name,
      email: payload.email,
      reason: payload.reason,
      timezone: payload.timezone,
      meetingTypeId: meetingType.id,
      meetingTypeLabel: meetingType.label,
      startAt: start,
      endAt: end,
      status: "confirmed",
      source: "web",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const functionUrl = process.env.BOOK_MEETING_FUNCTION_URL;
    if (functionUrl) {
      await fetch(functionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: docRef.id,
          ...payload,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          meetingTypeLabel: meetingType.label
        })
      });
    }

    return NextResponse.json({ success: true, bookingId: docRef.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create booking";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
