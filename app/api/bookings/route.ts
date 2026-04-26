import { NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/firebase/admin";
import { getRemoteBookingFlag } from "@/lib/firebase/remote-config";
import { slotLockIdFromIso, slotRangeIsoStarts } from "@/lib/booking/slot-locks";
import { getRuntimeAdminSettings } from "@/lib/firestore/admin-settings";
import { getAvailabilityDays, getBookingSettings } from "@/lib/firestore/booking";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  reason: z.string().min(3),
  timezone: z.string().min(2),
  meetingTypeId: z.string().min(2),
  startAt: z.string().min(10)
});

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    const parsed = value.toDate();
    return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
  }
  return null;
}

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
    const maxConfiguredDurationMinutes = settings.meetingTypes.reduce(
      (max, type) => Math.max(max, Number(type.durationMinutes) || 0),
      meetingType.durationMinutes
    );
    const overlapWindowMinutes = Math.max(maxConfiguredDurationMinutes, 24 * 60);
    const overlapWindowStart = new Date(start.getTime() - overlapWindowMinutes * 60 * 1000);

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

        // Use single-field range filters for overlap candidate lookup to avoid multi-range composite index requirements.
        const overlapQuery = adminDb
          .collection("bookings")
          .where("startAt", ">=", overlapWindowStart)
          .where("startAt", "<", end);

        const overlapSnapshot = await transaction.get(overlapQuery);
        const hasOverlap = overlapSnapshot.docs.some((doc) => {
          const data = doc.data();
          if (String(data.status ?? "") !== "confirmed") return false;
          const existingStart = toDate(data.startAt);
          const existingEnd = toDate(data.endAt);
          if (!existingStart || !existingEnd) return false;
          return existingStart < end && existingEnd > start;
        });
        if (hasOverlap) {
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

    const runtime = await getRuntimeAdminSettings();
    const functionUrl = runtime.integrations.bookingFunctionUrl || process.env.BOOK_MEETING_FUNCTION_URL || "";
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
