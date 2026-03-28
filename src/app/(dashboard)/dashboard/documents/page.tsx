import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PatientDocuments } from "./patient-documents";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.user_metadata?.role !== "patient") redirect("/dashboard");

  const { data: patient } = await supabase
    .from("patients")
    .select("id, practitioner_id")
    .eq("profile_id", user.id)
    .single();

  if (!patient) redirect("/onboarding");

  // Shared notes visible to patient
  const { data: sharedNotes } = await supabase
    .from("shared_notes")
    .select(
      "id, content_json, created_at, appointments!inner(start_at), practitioners!inner(profiles!inner(full_name))"
    )
    .eq("patient_id", patient.id)
    .eq("is_visible_to_patient", true)
    .order("created_at", { ascending: false });

  // Shared media visible to patient
  const { data: sharedMedia } = await supabase
    .from("shared_media")
    .select("id, file_path, file_type, file_name, size_bytes, created_at")
    .eq("patient_id", patient.id)
    .eq("is_visible_to_patient", true)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Mes documents</h1>
        <p className="text-muted-foreground">
          Notes et fichiers partagés par votre praticien
        </p>
      </div>

      <PatientDocuments
        patientId={patient.id as string}
        notes={(sharedNotes ?? []) as Record<string, unknown>[]}
        media={(sharedMedia ?? []) as Record<string, unknown>[]}
      />
    </div>
  );
}
