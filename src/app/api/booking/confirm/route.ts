import { NextResponse } from "next/server";
import {
  sendBookingConfirmationEmail,
  sendBookingConfirmationSMS,
} from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Send email and SMS in parallel
    const [emailSent, smsSent] = await Promise.all([
      sendBookingConfirmationEmail(data),
      sendBookingConfirmationSMS(data),
    ]);

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
