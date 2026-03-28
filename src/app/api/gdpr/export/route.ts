import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAccess } from "@/lib/access-log";

/**
 * RGPD Data portability — Export all patient data as JSON.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Log the export
  await logAccess(user.id, "export_data", "profile", user.id);

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch patient record
  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("profile_id", user.id)
    .single();

  if (!patient) {
    return NextResponse.json({ profile, patient: null });
  }

  // Fetch appointments
  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, start_at, end_at, type, status, created_at")
    .eq("patient_id", patient.id)
    .order("start_at", { ascending: false });

  // Fetch shared notes (visible only)
  const { data: sharedNotes } = await supabase
    .from("shared_notes")
    .select("id, content_json, created_at")
    .eq("patient_id", patient.id)
    .eq("is_visible_to_patient", true);

  // Fetch shared media (visible only)
  const { data: sharedMedia } = await supabase
    .from("shared_media")
    .select("id, file_name, file_type, size_bytes, created_at")
    .eq("patient_id", patient.id)
    .eq("is_visible_to_patient", true);

  // Fetch messages
  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, content, created_at")
    .eq("patient_id", patient.id)
    .order("created_at");

  const exportData = {
    exported_at: new Date().toISOString(),
    profile,
    patient: {
      date_of_birth: patient.date_of_birth,
      created_at: patient.created_at,
    },
    appointments: appointments ?? [],
    shared_notes: sharedNotes ?? [],
    shared_media: sharedMedia ?? [],
    messages: messages ?? [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="pratiflow-export-${new Date().toISOString().substring(0, 10)}.json"`,
    },
  });
}
