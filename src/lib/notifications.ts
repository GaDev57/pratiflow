/**
 * Notification stubs for email (Resend) and SMS (Twilio).
 * Gracefully degrade when API keys are not configured.
 */

interface BookingNotification {
  patientEmail: string;
  patientPhone?: string;
  patientName: string;
  practitionerName: string;
  date: string;
  time: string;
  duration: number;
  type: "in_person" | "teleconsultation";
  appointmentId: string;
}

export async function sendBookingConfirmationEmail(
  data: BookingNotification
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[EMAIL] Resend API key not configured. Skipping email.");
    console.log("[EMAIL] Would send confirmation to:", data.patientEmail);
    return false;
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "PratiFlow <noreply@pratiflow.com>",
        to: data.patientEmail,
        subject: `Confirmation de rendez-vous avec ${data.practitionerName}`,
        html: `
          <h2>Votre rendez-vous est confirmé</h2>
          <p>Bonjour ${data.patientName},</p>
          <p>Votre rendez-vous avec <strong>${data.practitionerName}</strong> est confirmé :</p>
          <ul>
            <li><strong>Date :</strong> ${data.date}</li>
            <li><strong>Heure :</strong> ${data.time}</li>
            <li><strong>Durée :</strong> ${data.duration} minutes</li>
            <li><strong>Type :</strong> ${data.type === "teleconsultation" ? "Téléconsultation" : "En cabinet"}</li>
          </ul>
          ${
            data.type === "teleconsultation"
              ? `<p><a href="${appUrl}/room/${data.appointmentId}">Rejoindre la téléconsultation</a></p>`
              : ""
          }
          <p><a href="${appUrl}/dashboard/appointments">Gérer mes rendez-vous</a></p>
          <hr/>
          <p style="color:#666;font-size:12px;">PratiFlow — Gestion de cabinet pour praticiens de santé</p>
        `,
      }),
    });

    return res.ok;
  } catch (error) {
    console.error("[EMAIL] Failed to send:", error);
    return false;
  }
}

export async function sendBookingConfirmationSMS(
  data: BookingNotification
): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber || !data.patientPhone) {
    console.log("[SMS] Twilio not configured or no phone. Skipping SMS.");
    return false;
  }

  try {
    const message = `PratiFlow: RDV confirmé avec ${data.practitionerName} le ${data.date} à ${data.time} (${data.duration}min). ${data.type === "teleconsultation" ? "Téléconsultation." : "En cabinet."}`;

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: data.patientPhone,
          From: fromNumber,
          Body: message,
        }),
      }
    );

    return res.ok;
  } catch (error) {
    console.error("[SMS] Failed to send:", error);
    return false;
  }
}

export async function sendReminderEmail(
  data: BookingNotification
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log("[EMAIL] Resend not configured. Skipping reminder.");
    return false;
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "PratiFlow <noreply@pratiflow.com>",
        to: data.patientEmail,
        subject: `Rappel : rendez-vous demain avec ${data.practitionerName}`,
        html: `
          <h2>Rappel de rendez-vous</h2>
          <p>Bonjour ${data.patientName},</p>
          <p>Ceci est un rappel pour votre rendez-vous <strong>demain</strong> avec ${data.practitionerName} :</p>
          <ul>
            <li><strong>Heure :</strong> ${data.time}</li>
            <li><strong>Durée :</strong> ${data.duration} minutes</li>
          </ul>
          ${
            data.type === "teleconsultation"
              ? `<p><a href="${appUrl}/room/${data.appointmentId}">Rejoindre la téléconsultation</a></p>`
              : ""
          }
          <p><a href="${appUrl}/dashboard/appointments">Gérer mes rendez-vous</a></p>
        `,
      }),
    });
    return res.ok;
  } catch (error) {
    console.error("[EMAIL] Failed to send reminder:", error);
    return false;
  }
}
