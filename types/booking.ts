export type BookingStatus = "confirmed" | "cancelled" | "rescheduled";

export interface MeetingType {
  id: string;
  label: string;
  durationMinutes: number;
}

export interface BookingSettings {
  enabled: boolean;
  timezone: string;
  slotDurationMinutes: number;
  maxDaysAhead: number;
  workDays: number[];
  dayStartHour: number;
  dayEndHour: number;
  meetingTypes: MeetingType[];
}

export interface BlockedSlot {
  id: string;
  startAt: string;
  endAt: string;
  reason?: string;
  createdAt?: string;
}

export interface BookingRecord {
  id: string;
  name: string;
  email: string;
  reason: string;
  timezone: string;
  meetingTypeId: string;
  meetingTypeLabel: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  googleMeetLink?: string;
  calendarEventId?: string;
  createdAt?: string;
  updatedAt?: string;
}
