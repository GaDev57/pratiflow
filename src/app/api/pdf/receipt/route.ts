import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAccess } from "@/lib/access-log";
import PDFDocument from "pdfkit";

/**
 * GET /api/pdf/receipt?appointmentId=xxx
 * Generate a consultation receipt PDF for the given appointment.
 * Accessible by the practitioner or the patient of the appointment.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const appointmentId = searchParams.get("appointmentId");

  if (!appointmentId) {
    return new Response(JSON.stringify({ error: "appointmentId requis" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Authenticate
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch appointment with related data
  const { data: appointment, error: apptError } = await supabase
    .from("appointments")
    .select(
      `
      id,
      start_at,
      end_at,
      type,
      status,
      stripe_payment_intent_id,
      patient_id,
      practitioner_id,
      patients:patient_id (
        id,
        full_name,
        email,
        phone,
        date_of_birth,
        profile_id
      ),
      practitioners:practitioner_id (
        id,
        profile_id,
        slug,
        specialty,
        consultation_price,
        address
      )
    `
    )
    .eq("id", appointmentId)
    .single();

  if (apptError || !appointment) {
    return new Response(JSON.stringify({ error: "Rendez-vous introuvable" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Type assertions for joined data (Supabase returns arrays for FK joins)
  const patient = (appointment.patients as unknown) as {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    date_of_birth: string | null;
    profile_id: string;
  } | null;

  const practitioner = (appointment.practitioners as unknown) as {
    id: string;
    profile_id: string;
    slug: string;
    specialty: string | null;
    consultation_price: number | null;
    address: string | null;
  } | null;

  if (!patient || !practitioner) {
    return new Response(
      JSON.stringify({ error: "Données du rendez-vous incomplètes" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Fetch practitioner's display name from profiles
  const { data: practitionerProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", practitioner.profile_id)
    .single();

  // Authorization: user must be the practitioner or the patient
  const isPractitioner = user.id === practitioner.profile_id;
  const isPatient = user.id === patient.profile_id;

  if (!isPractitioner && !isPatient) {
    return new Response(JSON.stringify({ error: "Accès refusé" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // HDS access log
  await logAccess(user.id, "export_data", "appointment", appointmentId);

  // --- Build PDF ---
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  // Helper: format date DD/MM/YYYY
  function formatDate(iso: string): string {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Helper: format time HH:MM
  function formatTime(iso: string): string {
    const d = new Date(iso);
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  // Derived values
  const startDate = new Date(appointment.start_at);
  const endDate = new Date(appointment.end_at);
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationMinutes = Math.round(durationMs / 60000);
  const year = startDate.getFullYear();
  const receiptNumber = `REC-${year}-${appointmentId.substring(0, 8).toUpperCase()}`;
  const isPaid = Boolean(appointment.stripe_payment_intent_id);
  const paymentStatus = isPaid ? "Payé" : "En attente";
  const price = practitioner.consultation_price;
  const priceFormatted =
    price !== null && price !== undefined
      ? `${price.toFixed(2)} €`
      : "Non renseigné";

  const practitionerName = practitionerProfile?.full_name ?? "Praticien";
  const specialty = practitioner.specialty ?? "";
  const address = practitioner.address ?? "";

  await new Promise<void>((resolve) => {
    doc.on("end", resolve);

    const pageWidth = doc.page.width;
    const marginLeft = 50;
    const marginRight = 50;
    const contentWidth = pageWidth - marginLeft - marginRight;

    // ── Header ──────────────────────────────────────────────────────────────
    doc
      .font("Helvetica-Bold")
      .fontSize(22)
      .fillColor("#1a1a2e")
      .text("REÇU DE CONSULTATION", marginLeft, 50, {
        width: contentWidth,
        align: "center",
      });

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#666666")
      .text(`N° ${receiptNumber}`, marginLeft, 80, {
        width: contentWidth,
        align: "center",
      });

    // Horizontal rule
    doc
      .moveTo(marginLeft, 100)
      .lineTo(pageWidth - marginRight, 100)
      .strokeColor("#cccccc")
      .lineWidth(1)
      .stroke();

    // ── Practitioner section ─────────────────────────────────────────────────
    let y = 120;

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#333333")
      .text("PRATICIEN", marginLeft, y);

    y += 18;

    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#1a1a2e")
      .text(practitionerName, marginLeft, y);

    y += 18;

    if (specialty) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#555555")
        .text(specialty, marginLeft, y);
      y += 16;
    }

    if (address) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#555555")
        .text(address, marginLeft, y, { width: contentWidth / 2 });
      y += doc.heightOfString(address, { width: contentWidth / 2 }) + 4;
    }

    // ── Patient section ──────────────────────────────────────────────────────
    y += 20;

    doc
      .moveTo(marginLeft, y)
      .lineTo(pageWidth - marginRight, y)
      .strokeColor("#eeeeee")
      .lineWidth(1)
      .stroke();

    y += 15;

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#333333")
      .text("PATIENT", marginLeft, y);

    y += 18;

    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#1a1a2e")
      .text(patient.full_name, marginLeft, y);

    y += 18;

    // ── Consultation details ─────────────────────────────────────────────────
    y += 20;

    doc
      .moveTo(marginLeft, y)
      .lineTo(pageWidth - marginRight, y)
      .strokeColor("#eeeeee")
      .lineWidth(1)
      .stroke();

    y += 15;

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#333333")
      .text("DÉTAILS DE LA CONSULTATION", marginLeft, y);

    y += 20;

    // Details table
    const labelX = marginLeft;
    const valueX = marginLeft + 200;
    const rowHeight = 22;

    const consultationType = appointment.type ?? "Consultation";

    const rows: [string, string][] = [
      ["Date", formatDate(appointment.start_at)],
      [
        "Heure",
        `${formatTime(appointment.start_at)} – ${formatTime(appointment.end_at)}`,
      ],
      ["Durée", `${durationMinutes} minutes`],
      ["Type", consultationType],
    ];

    rows.forEach(([label, value]) => {
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#555555").text(label, labelX, y);
      doc.font("Helvetica").fontSize(10).fillColor("#1a1a2e").text(value, valueX, y);
      y += rowHeight;
    });

    // ── Payment section ──────────────────────────────────────────────────────
    y += 20;

    doc
      .moveTo(marginLeft, y)
      .lineTo(pageWidth - marginRight, y)
      .strokeColor("#cccccc")
      .lineWidth(1)
      .stroke();

    y += 15;

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#333333")
      .text("RÈGLEMENT", marginLeft, y);

    y += 20;

    // Amount row
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#555555").text("Montant", labelX, y);
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor("#1a1a2e")
      .text(priceFormatted, valueX, y - 2);

    y += rowHeight + 4;

    // Payment status badge
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#555555").text("Statut du paiement", labelX, y);

    const badgeColor = isPaid ? "#16a34a" : "#d97706";
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(badgeColor)
      .text(paymentStatus, valueX, y);

    y += rowHeight;

    if (isPaid && appointment.stripe_payment_intent_id) {
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#999999")
        .text(
          `Référence de paiement : ${appointment.stripe_payment_intent_id}`,
          labelX,
          y
        );
      y += 16;
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 80;

    doc
      .moveTo(marginLeft, footerY)
      .lineTo(pageWidth - marginRight, footerY)
      .strokeColor("#cccccc")
      .lineWidth(1)
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#999999")
      .text(
        "Ce document est un reçu de consultation et ne constitue pas une facture.",
        marginLeft,
        footerY + 10,
        { width: contentWidth, align: "center" }
      );

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#bbbbbb")
      .text(
        `Émis le ${formatDate(new Date().toISOString())}`,
        marginLeft,
        footerY + 26,
        { width: contentWidth, align: "center" }
      );

    doc.end();
  });

  return new Response(Buffer.concat(chunks), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recu-${appointmentId}.pdf"`,
    },
  });
}
