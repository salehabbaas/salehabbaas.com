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

function toDatePartMap(parts: Intl.DateTimeFormatPart[]) {
  const map = new Map<string, string>();
  parts.forEach((part) => {
    if (part.type !== "literal") {
      map.set(part.type, part.value);
    }
  });
  return map;
}

function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const map = toDatePartMap(parts);
  return {
    year: Number(map.get("year")),
    month: Number(map.get("month")),
    day: Number(map.get("day"))
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(date);
  const map = toDatePartMap(parts);

  const zonedUtc = Date.UTC(
    Number(map.get("year")),
    Number(map.get("month")) - 1,
    Number(map.get("day")),
    Number(map.get("hour")),
    Number(map.get("minute")),
    Number(map.get("second"))
  );

  return zonedUtc - date.getTime();
}

function zonedDateTimeToUtc(input: { year: number; month: number; day: number; hour: number; minute: number; timeZone: string }) {
  const utcGuess = new Date(Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute, 0));
  const firstOffset = getTimeZoneOffsetMs(utcGuess, input.timeZone);
  const corrected = new Date(utcGuess.getTime() - firstOffset);
  const secondOffset = getTimeZoneOffsetMs(corrected, input.timeZone);

  if (firstOffset !== secondOffset) {
    return new Date(utcGuess.getTime() - secondOffset);
  }
  return corrected;
}

function dateKey(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toPositiveNumber(input: unknown, fallback: number) {
  const value = Number(input);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
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
    slotDurationMinutes: toPositiveNumber(data.slotDurationMinutes, DEFAULT_SETTINGS.slotDurationMinutes),
    maxDaysAhead: toPositiveNumber(data.maxDaysAhead, DEFAULT_SETTINGS.maxDaysAhead),
    workDays: Array.isArray(data.workDays) ? data.workDays.map((day: unknown) => Number(day)) : DEFAULT_SETTINGS.workDays,
    dayStartHour: Math.max(0, Math.min(23, Math.floor(Number(data.dayStartHour ?? DEFAULT_SETTINGS.dayStartHour)))),
    dayEndHour: Math.max(1, Math.min(24, Math.floor(Number(data.dayEndHour ?? DEFAULT_SETTINGS.dayEndHour)))),
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

function isBooked(start: Date, end: Date, bookings: BookingRecord[]) {
  return bookings.some((booking) => {
    if (booking.status !== "confirmed") return false;
    if (!booking.startAt || !booking.endAt) return false;
    const bookingStart = new Date(booking.startAt).getTime();
    const bookingEnd = new Date(booking.endAt).getTime();
    return start.getTime() < bookingEnd && end.getTime() > bookingStart;
  });
}

export async function getAvailabilityDays(days = 14) {
  const settings = await getBookingSettings();
  const [blockedSlots, bookings] = await Promise.all([getBlockedSlots(), getBookings({ futureOnly: true })]);
  const slots: Array<{ date: string; slots: string[] }> = [];
  const now = new Date();
  const effectiveTimeZone = settings.timezone || "UTC";
  const todayInZone = getDatePartsInTimeZone(now, effectiveTimeZone);
  const zonedDayCursor = new Date(Date.UTC(todayInZone.year, todayInZone.month - 1, todayInZone.day));
  const dayStartMinutes = settings.dayStartHour * 60;
  const dayEndMinutes = settings.dayEndHour * 60;
  const slotDurationMinutes = toPositiveNumber(settings.slotDurationMinutes, DEFAULT_SETTINGS.slotDurationMinutes);

  for (let dayOffset = 0; dayOffset < Math.min(days, settings.maxDaysAhead); dayOffset += 1) {
    const date = new Date(zonedDayCursor);
    date.setUTCDate(zonedDayCursor.getUTCDate() + dayOffset);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();

    const dayOfWeek = date.getUTCDay();
    if (!settings.workDays.includes(dayOfWeek)) {
      slots.push({ date: dateKey(year, month, day), slots: [] });
      continue;
    }

    if (dayEndMinutes <= dayStartMinutes) {
      slots.push({ date: dateKey(year, month, day), slots: [] });
      continue;
    }

    const daySlots: string[] = [];
    for (let minute = dayStartMinutes; minute + slotDurationMinutes <= dayEndMinutes; minute += slotDurationMinutes) {
      const slot = zonedDateTimeToUtc({
        year,
        month,
        day,
        hour: Math.floor(minute / 60),
        minute: minute % 60,
        timeZone: effectiveTimeZone
      });
      const slotEnd = new Date(slot.getTime() + slotDurationMinutes * 60 * 1000);

      if (slot < now) continue;
      if (isBlocked(slot, slotEnd, blockedSlots)) continue;
      if (isBooked(slot, slotEnd, bookings)) continue;

      daySlots.push(slot.toISOString());
    }

    slots.push({ date: dateKey(year, month, day), slots: daySlots });
  }

  return { settings, days: slots };
}
