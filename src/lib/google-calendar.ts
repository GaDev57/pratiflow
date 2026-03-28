/**
 * Google Calendar integration helpers.
 * Reads existing events to detect unavailability and creates events on booking.
 */

interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

async function refreshAccessToken(
  refreshToken: string
): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token;
}

/**
 * Fetch Google Calendar events for a date range.
 * Returns busy periods to block from availability.
 */
export async function getGoogleCalendarEvents(
  tokens: GoogleTokens,
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  let accessToken = tokens.access_token;

  // Try with current token first, refresh if needed
  let res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "100",
      }),
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (res.status === 401 && tokens.refresh_token) {
    const newToken = await refreshAccessToken(tokens.refresh_token);
    if (newToken) {
      accessToken = newToken;
      res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
          new URLSearchParams({
            timeMin,
            timeMax,
            singleEvents: "true",
            orderBy: "startTime",
            maxResults: "100",
          }),
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
    }
  }

  if (!res.ok) {
    console.error("[GCAL] Failed to fetch events:", res.status);
    return [];
  }

  const data = await res.json();
  return data.items ?? [];
}

/**
 * Create a Google Calendar event for a new appointment.
 */
export async function createGoogleCalendarEvent(
  tokens: GoogleTokens,
  event: {
    summary: string;
    description: string;
    startDateTime: string;
    endDateTime: string;
    timezone: string;
  }
): Promise<boolean> {
  let accessToken = tokens.access_token;

  if (tokens.refresh_token) {
    const newToken = await refreshAccessToken(tokens.refresh_token);
    if (newToken) accessToken = newToken;
  }

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description,
        start: {
          dateTime: event.startDateTime,
          timeZone: event.timezone,
        },
        end: {
          dateTime: event.endDateTime,
          timeZone: event.timezone,
        },
      }),
    }
  );

  return res.ok;
}
