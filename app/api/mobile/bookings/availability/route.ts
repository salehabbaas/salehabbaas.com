import { NextResponse } from "next/server";

import { getAvailabilityDays, getBookingSettings } from "@/lib/firestore/booking";

export const runtime = "nodejs";

export async function GET() {
  try {
    const settings = await getBookingSettings();
    const availability = await getAvailabilityDays(settings.maxDaysAhead);

    return NextResponse.json({
      enabled: settings.enabled,
      timezone: settings.timezone,
      meetingTypes: settings.meetingTypes,
      days: availability.days,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load availability";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
