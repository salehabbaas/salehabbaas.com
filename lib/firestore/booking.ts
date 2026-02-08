import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { BlockedSlot, BookingRecord, BookingSettings } from "@/types/booking";

function asIso(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return "";
}

const DEFAULT_SETTINGS: BookingSettings = {
  enabled: true,
  timezone: "America/Toronto",
  slotDurationMinutes: 30,
  maxDaysAhead: 30,
  workDays: [1, 2, 3, 4, 5],
  dayStartHour: 9,
  dayEndHour: 17,
  meetingTypes: [
    { id: "intro", label: "Intro Call", durationMinutes: 30 },
    { id: "project", label: "Project Discovery", durationMinutes: 45 },
    { id: "advisory", label: "Advisory Session", durationMinutes: 60 }
  ]
};

export async function getBookingSettings(): Promise<BookingSettings> {
  const snap = await adminDb.collection("bookingSettings").doc("default").get();
  if (!snap.exists) return DEFAULT_SETTINGS;

  const data = snap.data() ?? {};
  const meetingTypes = Array.isArray(data.meetingTypes)
    ? data.meetingTypes
        .map((item) => ({
          id: item.id ?? "meeting",
          label: item.label ?? "Meeting",
          durationMinutes: Number(item.durationMinutes ?? 30)
        }))
        .filter((item) => item.id && item.label)
    : DEFAULT_SETTINGS.meetingTypes;

  return {
    enabled: data.enabled ?? DEFAULT_SETTINGS.enabled,
    timezone: data.timezone ?? DEFAULT_SETTINGS.timezone,
    slotDurationMinutes: Number(data.slotDurationMinutes ?? DEFAULT_SETTINGS.slotDurationMinutes),
    maxDaysAhead: Number(data.maxDaysAhead ?? DEFAULT_SETTINGS.maxDaysAhead),
    workDays: Array.isArray(data.workDays) ? data.workDays.map((day: unknown) => Number(day)) : DEFAULT_SETTINGS.workDays,
    dayStartHour: Number(data.dayStartHour ?? DEFAULT_SETTINGS.dayStartHour),
    dayEndHour: Number(data.dayEndHour ?? DEFAULT_SETTINGS.dayEndHour),
    meetingTypes
  };
}

export async function getBlockedSlots(): Promise<BlockedSlot[]> {
  const snap = await adminDb.collection("blockedSlots").orderBy("startAt", "asc").get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      startAt: asIso(data.startAt),
      endAt: asIso(data.endAt),
      reason: data.reason ?? "",
      createdAt: asIso(data.createdAt)
    } satisfies BlockedSlot;
  });
}

export async function getBookings(options?: { futureOnly?: boolean; limit?: number }): Promise<BookingRecord[]> {
  let query = adminDb.collection("bookings").orderBy("startAt", "asc");
  if (options?.futureOnly) {
    query = adminDb.collection("bookings").where("startAt", ">=", new Date()).orderBy("startAt", "asc");
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const snap = await query.get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name ?? "",
      email: data.email ?? "",
      reason: data.reason ?? "",
      timezone: data.timezone ?? "",
      meetingTypeId: data.meetingTypeId ?? "",
      meetingTypeLabel: data.meetingTypeLabel ?? "",
      startAt: asIso(data.startAt),
      endAt: asIso(data.endAt),
      status: data.status ?? "confirmed",
      googleMeetLink: data.googleMeetLink ?? "",
      calendarEventId: data.calendarEventId ?? "",
      createdAt: asIso(data.createdAt),
      updatedAt: asIso(data.updatedAt)
    } satisfies BookingRecord;
  });
}

function isBlocked(start: Date, end: Date, blocked: BlockedSlot[]) {
  return blocked.some((slot) => {
    if (!slot.startAt || !slot.endAt) return false;
    const slotStart = new Date(slot.startAt).getTime();
    const slotEnd = new Date(slot.endAt).getTime();
    return start.getTime() < slotEnd && end.getTime() > slotStart;
  });
}

function isBooked(start: Date, bookings: BookingRecord[]) {
  return bookings.some((booking) => {
    if (booking.status === "cancelled") return false;
    return new Date(booking.startAt).getTime() === start.getTime();
  });
}

export async function getAvailabilityDays(days = 14) {
  const settings = await getBookingSettings();
  const [blockedSlots, bookings] = await Promise.all([getBlockedSlots(), getBookings({ futureOnly: true })]);
  const slots: Array<{ date: string; slots: string[] }> = [];

  const startDate = new Date();
  startDate.setMinutes(0, 0, 0);

  for (let dayOffset = 0; dayOffset < Math.min(days, settings.maxDaysAhead); dayOffset += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + dayOffset);

    const dayOfWeek = date.getDay();
    if (!settings.workDays.includes(dayOfWeek)) {
      slots.push({ date: date.toISOString().slice(0, 10), slots: [] });
      continue;
    }

    const daySlots: string[] = [];

    for (let hour = settings.dayStartHour; hour < settings.dayEndHour; hour += 1) {
      const slot = new Date(date);
      slot.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(slot.getTime() + settings.slotDurationMinutes * 60 * 1000);

      if (slot < new Date()) continue;
      if (isBlocked(slot, slotEnd, blockedSlots)) continue;
      if (isBooked(slot, bookings)) continue;

      daySlots.push(slot.toISOString());
    }

    slots.push({ date: date.toISOString().slice(0, 10), slots: daySlots });
  }

  return { settings, days: slots };
}
