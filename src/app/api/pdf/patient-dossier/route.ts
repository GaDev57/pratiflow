import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAccess } from "@/lib/access-log";
import PDFDocument from "pdfkit";

// ---------------------------------------------------------------------------
// Tiptap JSON → plain text
// ---------------------------------------------------------------------------

interface TiptapNode {
  type: string;
  text?: string;
  content?: TiptapNode[];
}

function extractText(node: TiptapNode): string {
  if (node.type === "text" && node.text) {
    return node.text;
  }
  if (!node.content) return "";

  const children = node.content.map(extractText).join("");

  // Add a newline after block-level nodes so paragraphs are separated
  const blockTypes = new Set(["paragraph", "heading", "bulletList", "orderedList", "listItem", "blockquote", "codeBlock"]);
  return blockTypes.has(node.type) ? children + "\n" : children;
}

function tiptapToText(contentJson: unknown): string {
  if (!contentJson || typeof contentJson !== "object") return "";
  try {
    return extractText(contentJson as TiptapNode).trim();
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

// ---------------------------------------------------------------------------
// PDF layout helpers
// ---------------------------------------------------------------------------

const MARGIN = 50;
const PAGE_WIDTH = 595.28; // A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const GRAY_LIGHT = "#f5f5f5";
const GRAY_TEXT = "#555555";
const PRIMARY = "#1a56db";

function checkPageBreak(doc: PDFKit.PDFDocument, needed = 60): void {
  const remaining = doc.page.height - doc.page.margins.bottom - (doc as unknown as { y: number }).y;
  if (remaining < needed) {
    doc.addPage();
  }
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string): void {
  checkPageBreak(doc, 80);
  doc.moveDown(0.8);
  doc
    .fillColor(PRIMARY)
    .font("Helvetica-Bold")
    .fontSize(13)
    .text(title.toUpperCase(), MARGIN, undefined, { width: CONTENT_WIDTH });
  // Underline
  const y = (doc as unknown as { y: number }).y + 2;
  doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_WIDTH, y).strokeColor(PRIMARY).lineWidth(0.5).stroke();
  doc.moveDown(0.5);
  doc.fillColor("#000000").font("Helvetica").fontSize(10);
}

function labelValue(doc: PDFKit.PDFDocument, label: string, value: string): void {
  const currentY = (doc as unknown as { y: number }).y;
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(GRAY_TEXT)
    .text(label + " :", MARGIN, currentY, { continued: true, width: 150 });
  doc
    .font("Helvetica")
    .fillColor("#000000")
    .text(" " + (value || "—"), { width: CONTENT_WIDTH - 150 });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");

  if (!patientId) {
    return new Response(JSON.stringify({ error: "patientId requis" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 1. Authenticate via session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Non authentifié" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Resolve practitioner record
  const { data: practitioner, error: practError } = await supabase
    .from("practitioners")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (practError || !practitioner) {
    return new Response(JSON.stringify({ error: "Praticien introuvable" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Verify ownership: patient must belong to this practitioner
  const { data: patient, error: patError } = await supabase
    .from("patients")
    .select("id, profile_id, full_name, email, phone, date_of_birth, created_at")
    .eq("id", patientId)
    .eq("practitioner_id", practitioner.id)
    .single();

  if (patError || !patient) {
    return new Response(JSON.stringify({ error: "Patient introuvable ou accès refusé" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 4. Fetch appointments
  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, start_at, end_at, type, status")
    .eq("practitioner_id", practitioner.id)
    .eq("patient_id", patientId)
    .order("start_at", { ascending: false });

  const appointmentList = appointments ?? [];
  const appointmentIds = appointmentList.map((a) => a.id as string);

  // 5. Fetch private notes
  const { data: privateNotes } = appointmentIds.length
    ? await supabase
        .from("private_notes")
        .select("id, appointment_id, content_json, created_at")
        .eq("practitioner_id", practitioner.id)
        .in("appointment_id", appointmentIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  // 6. Fetch shared notes
  const { data: sharedNotes } = appointmentIds.length
    ? await supabase
        .from("shared_notes")
        .select("id, appointment_id, content_json, created_at, is_visible_to_patient")
        .eq("practitioner_id", practitioner.id)
        .in("appointment_id", appointmentIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  // 7. Log access (HDS)
  await logAccess(user.id, "export_data", "patient", patientId);

  // 8. Generate PDF
  const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: true });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  // ---- Header ----
  doc
    .fillColor(PRIMARY)
    .font("Helvetica-Bold")
    .fontSize(20)
    .text("PratiFlow", MARGIN, MARGIN, { align: "left" });

  doc
    .fillColor(GRAY_TEXT)
    .font("Helvetica")
    .fontSize(10)
    .text("Dossier Patient — Document confidentiel", MARGIN, undefined, { align: "left" });

  doc
    .fillColor(GRAY_TEXT)
    .text(`Exporté le ${formatDate(new Date().toISOString())}`, { align: "right" });

  // Separator line
  const headerBottom = (doc as unknown as { y: number }).y + 8;
  doc
    .moveTo(MARGIN, headerBottom)
    .lineTo(MARGIN + CONTENT_WIDTH, headerBottom)
    .strokeColor(PRIMARY)
    .lineWidth(1)
    .stroke();

  doc.moveDown(1.2);

  // ---- Patient info ----
  sectionTitle(doc, "Informations du patient");

  const fullName = (patient.full_name as string | null) || "—";
  const email = (patient.email as string | null) || "—";
  const phone = (patient.phone as string | null) || "—";
  const dob = patient.date_of_birth ? formatDate(patient.date_of_birth as string) : "—";
  const since = patient.created_at ? formatDate(patient.created_at as string) : "—";

  // Info box background
  const infoBoxY = (doc as unknown as { y: number }).y;
  doc
    .rect(MARGIN, infoBoxY, CONTENT_WIDTH, 90)
    .fill(GRAY_LIGHT);

  doc.fillColor("#000000");
  const infoTextY = infoBoxY + 10;
  labelValue(doc, "Nom complet", fullName);
  labelValue(doc, "Email", email);
  labelValue(doc, "Téléphone", phone);
  labelValue(doc, "Date de naissance", dob);
  labelValue(doc, "Patient depuis", since);
  void infoTextY;

  // ---- Appointments ----
  sectionTitle(doc, `Historique des rendez-vous (${appointmentList.length})`);

  if (appointmentList.length === 0) {
    doc.fillColor(GRAY_TEXT).fontSize(10).text("Aucun rendez-vous enregistré.", MARGIN);
  } else {
    // Table header
    const colWidths = [110, 60, 120, 80, 125];
    const colHeaders = ["Date", "Heure", "Type", "Statut", "Fin"];
    const colX = colWidths.reduce<number[]>((acc, w, i) => {
      acc.push(i === 0 ? MARGIN : acc[i - 1] + colWidths[i - 1]);
      return acc;
    }, []);

    const drawTableHeader = () => {
      const rowY = (doc as unknown as { y: number }).y;
      doc.rect(MARGIN, rowY, CONTENT_WIDTH, 18).fill(PRIMARY);
      colHeaders.forEach((h, i) => {
        doc
          .fillColor("#ffffff")
          .font("Helvetica-Bold")
          .fontSize(9)
          .text(h, colX[i] + 4, rowY + 4, { width: colWidths[i] - 8, lineBreak: false });
      });
      doc.moveDown(0);
      (doc as unknown as { y: number }).y = rowY + 18;
    };

    drawTableHeader();

    appointmentList.forEach((appt, idx) => {
      checkPageBreak(doc, 22);
      const rowY = (doc as unknown as { y: number }).y;

      // Alternating row background
      if (idx % 2 === 1) {
        doc.rect(MARGIN, rowY, CONTENT_WIDTH, 18).fill(GRAY_LIGHT);
      }

      const startDate = appt.start_at ? formatDate(appt.start_at as string) : "—";
      const startTime = appt.start_at
        ? new Date(appt.start_at as string).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        : "—";
      const endTime = appt.end_at
        ? new Date(appt.end_at as string).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        : "—";
      const type = String(appt.type ?? "—");
      const status = String(appt.status ?? "—");

      const cells = [startDate, startTime, type, status, endTime];
      cells.forEach((cell, i) => {
        doc
          .fillColor("#000000")
          .font("Helvetica")
          .fontSize(9)
          .text(cell, colX[i] + 4, rowY + 4, { width: colWidths[i] - 8, lineBreak: false });
      });

      (doc as unknown as { y: number }).y = rowY + 18;
    });

    doc.moveDown(0.5);
  }

  // ---- Private notes ----
  const privateNoteList = privateNotes ?? [];
  sectionTitle(doc, `Notes privées (${privateNoteList.length})`);

  if (privateNoteList.length === 0) {
    doc.fillColor(GRAY_TEXT).fontSize(10).text("Aucune note privée.", MARGIN);
  } else {
    privateNoteList.forEach((note) => {
      checkPageBreak(doc, 50);
      const noteText = tiptapToText(note.content_json);
      const dateStr = note.created_at ? formatDateTime(note.created_at as string) : "—";

      doc
        .fillColor(GRAY_TEXT)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(dateStr, MARGIN, undefined, { width: CONTENT_WIDTH });

      const noteY = (doc as unknown as { y: number }).y;
      doc
        .rect(MARGIN, noteY, CONTENT_WIDTH, 4)
        .fill(GRAY_LIGHT);
      (doc as unknown as { y: number }).y = noteY + 6;

      doc
        .fillColor("#000000")
        .font("Helvetica")
        .fontSize(10)
        .text(noteText || "(note vide)", MARGIN, undefined, {
          width: CONTENT_WIDTH,
          align: "left",
        });

      doc.moveDown(0.6);
    });
  }

  // ---- Shared notes ----
  const sharedNoteList = sharedNotes ?? [];
  sectionTitle(doc, `Notes partagées (${sharedNoteList.length})`);

  if (sharedNoteList.length === 0) {
    doc.fillColor(GRAY_TEXT).fontSize(10).text("Aucune note partagée.", MARGIN);
  } else {
    sharedNoteList.forEach((note) => {
      checkPageBreak(doc, 50);
      const noteText = tiptapToText(note.content_json);
      const dateStr = note.created_at ? formatDateTime(note.created_at as string) : "—";
      const visible = note.is_visible_to_patient ? "Visible par le patient" : "Non visible";

      doc
        .fillColor(GRAY_TEXT)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(`${dateStr} — ${visible}`, MARGIN, undefined, { width: CONTENT_WIDTH });

      const noteY = (doc as unknown as { y: number }).y;
      doc
        .rect(MARGIN, noteY, CONTENT_WIDTH, 4)
        .fill(GRAY_LIGHT);
      (doc as unknown as { y: number }).y = noteY + 6;

      doc
        .fillColor("#000000")
        .font("Helvetica")
        .fontSize(10)
        .text(noteText || "(note vide)", MARGIN, undefined, {
          width: CONTENT_WIDTH,
          align: "left",
        });

      doc.moveDown(0.6);
    });
  }

  // ---- Footer on all pages ----
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    const footerY = doc.page.height - doc.page.margins.bottom - 20;
    doc
      .moveTo(MARGIN, footerY)
      .lineTo(MARGIN + CONTENT_WIDTH, footerY)
      .strokeColor("#cccccc")
      .lineWidth(0.5)
      .stroke();
    doc
      .fillColor(GRAY_TEXT)
      .font("Helvetica")
      .fontSize(8)
      .text(
        `Document confidentiel — PratiFlow — Exporté le ${formatDate(new Date().toISOString())} — Page ${i + 1}/${totalPages}`,
        MARGIN,
        footerY + 4,
        { width: CONTENT_WIDTH, align: "center" }
      );
  }

  doc.end();

  await new Promise<void>((resolve) => doc.on("end", resolve));

  const pdfBuffer = Buffer.concat(chunks);
  const safeFileName = `dossier-patient-${patientId}-${new Date().toISOString().substring(0, 10)}.pdf`;

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFileName}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
