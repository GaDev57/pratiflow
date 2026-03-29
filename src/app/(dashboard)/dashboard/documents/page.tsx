import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PatientDocuments } from "./patient-documents";
import { QuestionnaireForm } from "./questionnaire-form";

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

  // Questionnaires assigned to this patient
  const { data: questionnaires } = await supabase
    .from("questionnaire_responses")
    .select(
      "id, responses, submitted_at, created_at, document_templates!inner(title, questionnaire_fields)"
    )
    .eq("patient_id", patient.id)
    .order("created_at", { ascending: false });

  const questionnaireList = ((questionnaires ?? []) as unknown as {
    id: string;
    responses: Record<string, string | string[] | number | boolean>;
    submitted_at: string | null;
    created_at: string;
    document_templates: {
      title: string;
      questionnaire_fields: {
        id: string;
        type: "text" | "textarea" | "radio" | "checkbox" | "scale" | "boolean";
        label: string;
        required: boolean;
        options?: string[];
      }[];
    };
  }[]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Mes documents</h1>
        <p className="text-muted-foreground">
          Notes, fichiers et questionnaires partagés par votre praticien
        </p>
      </div>

      {/* Questionnaires to fill */}
      {questionnaireList.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Questionnaires</h2>
          {questionnaireList.map((q) => (
            <QuestionnaireForm
              key={q.id}
              responseId={q.id}
              templateTitle={q.document_templates.title}
              fields={q.document_templates.questionnaire_fields}
              existingResponses={q.responses}
              isSubmitted={!!q.submitted_at}
            />
          ))}
        </section>
      )}

      <PatientDocuments
        patientId={patient.id as string}
        notes={(sharedNotes ?? []) as Record<string, unknown>[]}
        media={(sharedMedia ?? []) as Record<string, unknown>[]}
      />
    </div>
  );
}
