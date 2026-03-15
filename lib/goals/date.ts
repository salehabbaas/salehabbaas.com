import { addDays, format, getISOWeek, getISOWeekYear, parseISO, startOfISOWeek } from "date-fns";

function formatInTimezone(date: Date, timezone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    ...options,
  }).format(date);
}

export function dateIdFromDate(date: Date, timezone = "America/Montreal") {
  return formatInTimezone(date, timezone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function todayDateId(timezone = "America/Montreal") {
  return dateIdFromDate(new Date(), timezone);
}

export function isValidDateId(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parseISO(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime());
}

export function weekIdFromDateId(dateId: string) {
  const parsed = parseISO(`${dateId}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return "";
  const isoYear = getISOWeekYear(parsed);
  const isoWeek = getISOWeek(parsed);
  return `${isoYear}-W${String(isoWeek).padStart(2, "0")}`;
}

export function currentWeekId(timezone = "America/Montreal") {
  return weekIdFromDateId(todayDateId(timezone));
}

export function nextDateId(dateId: string, offsetDays: number) {
  const parsed = parseISO(`${dateId}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return dateId;
  return format(addDays(parsed, offsetDays), "yyyy-MM-dd");
}

export function isoWeekDateIds(weekId: string) {
  const matched = weekId.match(/^(\d{4})-W(\d{2})$/);
  if (!matched) return [];
  const year = Number(matched[1]);
  const week = Number(matched[2]);
  if (!Number.isFinite(year) || !Number.isFinite(week)) return [];

  const jan4 = new Date(Date.UTC(year, 0, 4));
  const firstWeekStart = startOfISOWeek(jan4);
  const weekStart = addDays(firstWeekStart, (week - 1) * 7);

  return Array.from({ length: 7 }, (_, index) =>
    format(addDays(weekStart, index), "yyyy-MM-dd"),
  );
}

export function humanDayLabel(dateId: string, timezone = "America/Montreal") {
  if (!isValidDateId(dateId)) return dateId;
  const parsed = parseISO(`${dateId}T12:00:00.000Z`);
  return formatInTimezone(parsed, timezone, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function isSameDateId(date: Date, dateId: string, timezone = "America/Montreal") {
  return dateIdFromDate(date, timezone) === dateId;
}
