import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const { fullName, phone, dateOfBirth } = await request.json();

  if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
    return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
  }

  // Call the SECURITY DEFINER function that handles auth.users + profiles + patients creation
  const { data, error } = await supabase.rpc(
    "create_patient_for_practitioner",
    {
      p_full_name: fullName.trim(),
      p_phone: phone || null,
      p_date_of_birth: dateOfBirth || null,
    }
  );

  if (error) {
    console.error("[PATIENTS/CREATE] RPC error:", error.message);
    return NextResponse.json(
      { error: "Erreur lors de la création du patient : " + error.message },
      { status: 500 }
    );
  }

  const result = data as { patient_id: string; profile_id: string; full_name: string };

  return NextResponse.json({
    patientId: result.patient_id,
    profileId: result.profile_id,
    fullName: result.full_name,
  });
}
