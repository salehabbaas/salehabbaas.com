import { NextResponse } from "next/server";

import { getAvailabilityDays } from "@/lib/firestore/booking";
import { getRemoteBookingFlag } from "@/lib/firebase/remote-config";

export async function GET() {
  const remoteEnabled = await getRemoteBookingFlag();
  const availability = await getAvailabilityDays(14);

  const enabled = typeof remoteEnabled === "boolean" ? remoteEnabled : availability.settings.enabled;

  return NextResponse.json({
    enabled,
    timezone: availability.settings.timezone,
    meetingTypes: availability.settings.meetingTypes,
    days: availability.days
  });
}
