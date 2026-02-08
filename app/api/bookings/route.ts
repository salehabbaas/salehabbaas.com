import { NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/firebase/admin";
import { getRemoteBookingFlag } from "@/lib/firebase/remote-config";
import { slotLockIdFromIso, slotRangeIsoStarts } from "@/lib/booking/slot-locks";
import { getAvailabilityDays, getBookingSettings } from "@/lib/firestore/booking";

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
    const remoteEnabled = await getRemoteBookingFlag();
    const bookingEnabled = settings.enabled && remoteEnabled !== false;

    if (!bookingEnabled) {
      return NextResponse.json({ error: "Booking is currently disabled" }, { status: 403 });
    }

    const meetingType = settings.meetingTypes.find((type) => type.id === payload.meetingTypeId);
    if (!meetingType) {
      return NextResponse.json({ error: "Invalid meeting type" }, { status: 400 });
    }

    const start = new Date(payload.startAt);
    if (Number.isNaN(start.getTime())) {
      return NextResponse.json({ error: "Invalid booking start time" }, { status: 400 });
    }

    const end = new Date(start.getTime() + meetingType.durationMinutes * 60 * 1000);

    const availability = await getAvailabilityDays(settings.maxDaysAhead);
    const availableSlotSet = new Set(availability.days.flatMap((day) => day.slots));
    if (!availableSlotSet.has(start.toISOString())) {
      return NextResponse.json(
        { error: "This slot is no longer available. Please refresh and choose another time." },
        { status: 409 }
      );
    }

    const slotIsoStarts = slotRangeIsoStarts(start, end, settings.slotDurationMinutes);
    if (!slotIsoStarts.length) {
      return NextResponse.json({ error: "Invalid booking duration." }, { status: 400 });
    }

    const slotLockRefs = slotIsoStarts.map((slotIso) => adminDb.collection("bookingSlotLocks").doc(slotLockIdFromIso(slotIso)));
    const docRef = adminDb.collection("bookings").doc();

    try {
      await adminDb.runTransaction(async (transaction) => {
        const lockSnapshots = await Promise.all(slotLockRefs.map((ref) => transaction.get(ref)));
        const hasActiveLock = lockSnapshots.some((snap) => snap.exists);
        if (hasActiveLock) {
          throw new Error("SLOT_LOCK_CONFLICT");
        }

        const overlapQuery = adminDb
          .collection("bookings")
          .where("status", "==", "confirmed")
          .where("startAt", "<", end)
          .where("endAt", ">", start)
          .limit(1);

        const overlapSnapshot = await transaction.get(overlapQuery);
        if (!overlapSnapshot.empty) {
          throw new Error("BOOKING_OVERLAP");
        }

        transaction.set(docRef, {
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

        slotLockRefs.forEach((slotRef, index) => {
          transaction.set(slotRef, {
            bookingId: docRef.id,
            slotStartAt: slotIsoStarts[index],
            startAt: start,
            endAt: end,
            status: "active",
            createdAt: new Date(),
            updatedAt: new Date()
          });
        });
      });
    } catch (transactionError) {
      const errorMessage = transactionError instanceof Error ? transactionError.message : "";
      if (errorMessage === "SLOT_LOCK_CONFLICT" || errorMessage === "BOOKING_OVERLAP") {
        return NextResponse.json(
          { error: "This slot was already booked. Please choose another available time." },
          { status: 409 }
        );
      }
      throw transactionError;
    }

    const functionUrl = process.env.BOOK_MEETING_FUNCTION_URL;
    let functionError: string | undefined;

    if (functionUrl) {
      try {
        const functionResponse = await fetch(functionUrl, {
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

        if (!functionResponse.ok) {
          functionError = await functionResponse.text();
        }
      } catch (functionCallError) {
        functionError = functionCallError instanceof Error ? functionCallError.message : "Booking function call failed";
      }
    }

    if (functionError) {
      await docRef.set(
        {
          integrationError: functionError,
          updatedAt: new Date()
        },
        { merge: true }
      );
    }

    return NextResponse.json({ success: true, bookingId: docRef.id, integration: functionError ? "degraded" : "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create booking";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
