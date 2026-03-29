import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getGoogleCalendarEvents } from "@/lib/google-calendar";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const practitionerId = searchParams.get("practitionerId");
  const date = searchParams.get("date");

  if (!practitionerId || !date) {
    return NextResponse.json(
      { error: "practitionerId and date are required" },
      { status: 400 }
    );
  }

  const serviceClient = getServiceClient();
  if (!serviceClient) {
    return NextResponse.json({ busyPeriods: [] });
  }

  // Fetch practitioner's Google Calendar tokens
  const { data: practitioner } = await serviceClient
    .from("practitioners")
    .select("google_calendar_token, timezone")
    .eq("id", practitionerId)
    .single();

  if (!practitioner?.google_calendar_token) {
    return NextResponse.json({ busyPeriods: [] });
  }

  const tokens = practitioner.google_calendar_token as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };

  const tz = (practitioner.timezone as string) || "Europe/Paris";
  const timeMin = `${date}T00:00:00`;
  const timeMax = `${date}T23:59:59`;

  const events = await getGoogleCalendarEvents(
    tokens,
    new Date(timeMin).toISOString(),
    new Date(timeMax + "+01:00").toISOString()
  );

  // Convert events to busy periods (start/end in minutes from midnight)
  const busyPeriods = events
    .filter((e) => e.start?.dateTime || e.start?.date)
    .map((e) => {
      if (e.start.date && !e.start.dateTime) {
        // All-day event: block the whole day
        return { start: 0, end: 1440 };
      }

      const startDt = new Date(e.start.dateTime!);
      const endDt = new Date(e.end.dateTime!);

      // Convert to local time in practitioner's timezone
      const startStr = startDt.toLocaleTimeString("en-GB", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const endStr = endDt.toLocaleTimeString("en-GB", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const [sh, sm] = startStr.split(":").map(Number);
      const [eh, em] = endStr.split(":").map(Number);

      return {
        start: sh * 60 + sm,
        end: eh * 60 + em,
      };
    });

  return NextResponse.json({ busyPeriods });
}
