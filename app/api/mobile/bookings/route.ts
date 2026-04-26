import { NextResponse } from "next/server";
import { z } from "zod";

import { adminDb } from "@/lib/firebase/admin";
import { getAvailabilityDays, getBookingSettings } from "@/lib/firestore/booking";
import { slotLockIdFromIso, slotRangeIsoStarts } from "@/lib/booking/slot-locks";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  reason: z.string().min(3),
  timezone: z.string().min(2),
  meetingTypeId: z.string().min(2),
  startAt: z.string().min(10),
  source: z.string().optional(),
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
    if (!settings.enabled) {
      return NextResponse.json({ error: "Booking is currently disabled" }, { status: 403 });
    }

    const meetingType = settings.meetingTypes.find((t) => t.id === payload.meetingTypeId);
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
        { error: "This slot is no longer available. Please choose another time." },
        { status: 409 }
      );
    }

    const slotIsoStarts = slotRangeIsoStarts(start, end, settings.slotDurationMinutes);
    if (!slotIsoStarts.length) {
      return NextResponse.json({ error: "Invalid booking duration." }, { status: 400 });
    }

    const slotLockRefs = slotIsoStarts.map((slotIso) =>
      adminDb.collection("bookingSlotLocks").doc(slotLockIdFromIso(slotIso))
    );
    const docRef = adminDb.collection("bookings").doc();

    try {
      await adminDb.runTransaction(async (transaction) => {
        const lockSnapshots = await Promise.all(slotLockRefs.map((ref) => transaction.get(ref)));
        const hasActiveLock = lockSnapshots.some((snap) => snap.exists);
        if (hasActiveLock) throw new Error("SLOT_LOCK_CONFLICT");

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
        if (hasOverlap) throw new Error("BOOKING_OVERLAP");

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
          source: payload.source || "mobile",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        slotLockRefs.forEach((slotRef, index) => {
          transaction.set(slotRef, {
            bookingId: docRef.id,
            slotStartAt: slotIsoStarts[index],
            startAt: start,
            endAt: end,
            status: "active",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        });
      });
    } catch (transactionError) {
      const msg = transactionError instanceof Error ? transactionError.message : "";
      if (msg === "SLOT_LOCK_CONFLICT" || msg === "BOOKING_OVERLAP") {
        return NextResponse.json(
          { error: "This slot was already booked. Please choose another available time." },
          { status: 409 }
        );
      }
      throw transactionError;
    }

    // Create notification for admin
    await adminDb.collection("notifications").add({
      module: "bookings",
      sourceType: "booking",
      sourceId: docRef.id,
      title: `New booking from ${payload.name}`,
      body: `${meetingType.label} on ${start.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })}. Reason: ${payload.reason}`,
      priority: "high",
      state: "unread",
      ctaUrl: "/admin/bookings",
      metadata: {
        bookingId: docRef.id,
        name: payload.name,
        email: payload.email,
        meetingType: meetingType.label,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        source: payload.source || "mobile",
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, bookingId: docRef.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create booking";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
