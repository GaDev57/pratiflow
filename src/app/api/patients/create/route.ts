import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.user_metadata?.role !== "practitioner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { fullName, email, phone, dateOfBirth } = await request.json();

  if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
    return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
  }

  // Get practitioner record for the current user
  const { data: practitioner, error: practError } = await supabase
    .from("practitioners")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (practError || !practitioner) {
    return NextResponse.json(
      { error: "Profil praticien introuvable" },
      { status: 404 }
    );
  }

  // Create a managed patient profile (no auth.users entry — practitioner-managed)
  const profileId = randomUUID();

  const { error: profileError } = await supabase.from("profiles").insert({
    id: profileId,
    role: "patient",
    full_name: fullName.trim(),
    phone: phone || null,
  });

  if (profileError) {
    console.error("[PATIENTS/CREATE] Profile insert error:", profileError.message);
    return NextResponse.json(
      { error: "Erreur lors de la création du profil : " + profileError.message },
      { status: 500 }
    );
  }

  // Create the patient record linked to the practitioner
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .insert({
      profile_id: profileId,
      practitioner_id: practitioner.id,
      date_of_birth: dateOfBirth || null,
    })
    .select("id")
    .single();

  if (patientError) {
    console.error("[PATIENTS/CREATE] Patient insert error:", patientError.message);
    return NextResponse.json(
      { error: "Erreur lors de la création du patient : " + patientError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    patientId: patient.id,
    profileId: profileId,
    fullName: fullName.trim(),
  });
}
