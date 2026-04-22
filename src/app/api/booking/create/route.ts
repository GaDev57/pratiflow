import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(request: Request) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Service non configuré" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const {
    practitionerId,
    patientName,
    patientEmail,
    patientPhone,
    startAt,
    endAt,
    type,
  } = body;

  if (!practitionerId || !patientName || !patientEmail || !startAt || !endAt) {
    return NextResponse.json(
      { error: "Champs requis manquants" },
      { status: 400 }
    );
  }

  // Check practitioner exists
  const { data: practitioner, error: practError } = await supabase
    .from("practitioners")
    .select("id")
    .eq("id", practitionerId)
    .single();

  if (practError || !practitioner) {
    return NextResponse.json(
      { error: "Praticien introuvable" },
      { status: 404 }
    );
  }

  // Find or create managed patient for this practitioner
  const { data: existingPatient } = await supabase
    .from("patients")
    .select("id")
    .eq("practitioner_id", practitionerId)
    .eq("email", patientEmail)
    .single();

  let patientId: string;

  if (existingPatient) {
    patientId = existingPatient.id;
  } else {
    const { data: newPatient, error: patientError } = await supabase
      .from("patients")
      .insert({
        practitioner_id: practitionerId,
        full_name: patientName.trim(),
        email: patientEmail.trim(),
        phone: patientPhone || null,
      })
      .select("id")
      .single();

    if (patientError || !newPatient) {
      console.error("[BOOKING/CREATE] Patient insert error:", patientError?.message);
      return NextResponse.json(
        { error: "Erreur lors de la création du patient" },
        { status: 500 }
      );
    }
    patientId = newPatient.id;
  }

  // Create appointment
  const { error: insertError } = await supabase.from("appointments").insert({
    practitioner_id: practitionerId,
    patient_id: patientId,
    start_at: startAt,
    end_at: endAt,
    type: type || "in_person",
    status: "confirmed",
    jitsi_room_url: null,
  });

  if (insertError) {
    console.error("[BOOKING/CREATE] Appointment insert error:", insertError.message);
    const msg = insertError.message.includes("overlap")
      ? "Ce créneau est déjà pris. Veuillez en choisir un autre."
      : "Erreur lors de la création du rendez-vous";
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  return NextResponse.json({ patientId });
}
