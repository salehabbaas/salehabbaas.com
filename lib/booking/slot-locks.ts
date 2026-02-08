const DEFAULT_SLOT_DURATION_MINUTES = 30;

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function safeDurationMinutes(input: number) {
  if (!Number.isFinite(input) || input <= 0) return DEFAULT_SLOT_DURATION_MINUTES;
  return Math.floor(input);
}

export function slotLockIdFromIso(iso: string) {
  return iso.replace(/[:.]/g, "-");
}

export function slotRangeIsoStarts(
  startAt: Date | string,
  endAt: Date | string,
  slotDurationMinutes: number
) {
  const start = asDate(startAt);
  const end = asDate(endAt);
  const step = safeDurationMinutes(slotDurationMinutes);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return [] as string[];
  }

  const slots: string[] = [];
  const cursor = new Date(start);

  while (cursor < end) {
    slots.push(cursor.toISOString());
    cursor.setMinutes(cursor.getMinutes() + step);
  }

  return slots;
}

export function slotRangeLockIds(
  startAt: Date | string,
  endAt: Date | string,
  slotDurationMinutes: number
) {
  return slotRangeIsoStarts(startAt, endAt, slotDurationMinutes).map(slotLockIdFromIso);
}
