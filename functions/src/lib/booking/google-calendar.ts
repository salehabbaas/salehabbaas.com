import { google } from "googleapis";

interface CalendarEventInput {
  summary: string;
  description: string;
  startAt: string;
  endAt: string;
  timezone: string;
  attendeeEmail: string;
}

function getAuthClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    return null;
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar"]
  });
}

export async function createCalendarEvent(input: CalendarEventInput) {
  const auth = getAuthClient();
  if (!auth) {
    return { eventId: "", meetLink: "" };
  }

  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";

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
