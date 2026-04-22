import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  sendBookingConfirmationEmail,
  sendBookingConfirmationSMS,
} from "@/lib/notifications";
import { createGoogleCalendarEvent } from "@/lib/google-calendar";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Send email and SMS in parallel
    const [emailSent, smsSent] = await Promise.all([
      sendBookingConfirmationEmail(data),
      sendBookingConfirmationSMS(data),
    ]);

    // Create Google Calendar event if practitioner has connected Google Calendar
    if (data.practitionerId) {
      const serviceClient = getServiceClient();
      if (serviceClient) {
        const { data: practitioner } = await serviceClient
          .from("practitioners")
          .select("google_calendar_token, timezone")
          .eq("id", data.practitionerId)
          .single();

        if (practitioner?.google_calendar_token) {
          const tokens = practitioner.google_calendar_token as {
            access_token: string;
            refresh_token: string;
            expires_in: number;
            token_type: string;
          };

          const tz = (practitioner.timezone as string) || "Europe/Paris";
          const typeLabel =
            data.type === "teleconsultation"
              ? "Téléconsultation WhatsApp"
              : "Cabinet";

          await createGoogleCalendarEvent(tokens, {
            summary: `${data.patientName} — ${typeLabel}`,
            description: `PratiFlow — RDV ${data.duration}min avec ${data.patientName}`,
            startDateTime: data.startDateTime || `${data.date}T${data.time}:00`,
            endDateTime:
              data.endDateTime ||
              new Date(
                new Date(`${data.date}T${data.time}:00`).getTime() +
                  (data.duration || 30) * 60000
              ).toISOString(),
            timezone: tz,
          });
        }
      }
    }

    return NextResponse.json({
      emailSent,
      smsSent,
    });
  } catch (error) {
    console.error("[BOOKING/CONFIRM] Error:", error);
    return NextResponse.json(
      { error: "Failed to send notifications" },
      { status: 500 }
    );
  }
}
