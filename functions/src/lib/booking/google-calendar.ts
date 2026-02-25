import { google } from "googleapis";
import { adminDb } from "../admin";

interface CalendarEventInput {
  summary: string;
  description: string;
  startAt: string;
  endAt: string;
  timezone: string;
  attendeeEmail: string;
}

async function getCalendarConfig() {
  const [integrationSnap, secretSnap] = await Promise.all([
    adminDb.collection("adminSettings").doc("integrations").get(),
    adminDb.collection("adminSettings").doc("secrets").get()
  ]);

  const integrations = integrationSnap.data() ?? {};
  const secrets = secretSnap.data() ?? {};

  const clientEmail = (secrets.googleServiceAccountEmail as string | undefined) || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
  const privateKeyRaw =
    (secrets.googleServiceAccountPrivateKey as string | undefined) || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "";
  const privateKey = privateKeyRaw ? privateKeyRaw.replace(/\\n/g, "\n") : "";
  const calendarId = (integrations.googleCalendarId as string | undefined) || process.env.GOOGLE_CALENDAR_ID || "primary";

  return { clientEmail, privateKey, calendarId };
}

export async function createCalendarEvent(input: CalendarEventInput) {
  const config = await getCalendarConfig();
  if (!config.clientEmail || !config.privateKey) {
    return { eventId: "", meetLink: "" };
  }

  const auth = new google.auth.JWT({
    email: config.clientEmail,
    key: config.privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar"]
  });

  if (!auth) {
    return { eventId: "", meetLink: "" };
  }

  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = config.calendarId;

  const response = await calendar.events.insert({
    calendarId,
    conferenceDataVersion: 1,
    requestBody: {
      summary: input.summary,
      description: input.description,
      start: {
        dateTime: input.startAt,
        timeZone: input.timezone
      },
      end: {
        dateTime: input.endAt,
        timeZone: input.timezone
      },
      attendees: [{ email: input.attendeeEmail }],
      conferenceData: {
        createRequest: {
          requestId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet"
          }
        }
      }
    }
  });

  const event = response.data;
  return {
    eventId: event.id || "",
    meetLink: event.hangoutLink || ""
  };
}
