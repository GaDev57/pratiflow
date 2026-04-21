import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PrivateNotesSection } from "./private-notes";
import { SharedNotesSection } from "./shared-notes";
import { SharedMediaSection } from "./shared-media";
import { MessagingSection } from "./messaging";
import { SendDocumentButton } from "./send-document-button";
import { SentDocumentsSection } from "./sent-documents";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PatientDetailPage({ params }: Props) {
  const { id: patientId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.user_metadata?.role !== "practitioner") redirect("/dashboard");

  // Verify this practitioner has access
  const { data: practitioner } = await supabase
    .from("practitioners")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!practitioner) redirect("/onboarding");

  // Fetch patient (with optional profile for auth-linked patients)
  const { data: patient } = await supabase
    .from("patients")
    .select("id, profile_id, date_of_birth, full_name, phone, profiles(full_name, phone, avatar_url)")
    .eq("id", patientId)
    .single();

  if (!patient) notFound();

  // Support both managed patients (fields on patients) and auth-linked (via profiles)
  const linkedProfile = patient.profiles as unknown as {
    full_name: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;

  const profile = {
    full_name: (patient.full_name as string) || linkedProfile?.full_name || "Sans nom",
    phone: (patient.phone as string) || linkedProfile?.phone || null,
    avatar_url: linkedProfile?.avatar_url || null,
  };

  // Fetch appointments for this patient with this practitioner
  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, start_at, end_at, type, status")
    .eq("practitioner_id", practitioner.id)
    .eq("patient_id", patientId)
    .order("start_at", { ascending: false });

  // Fetch private notes
  const { data: privateNotes } = await supabase
    .from("private_notes")
    .select("id, appointment_id, content_json, created_at, updated_at")
    .eq("practitioner_id", practitioner.id)
    .in(
      "appointment_id",
      (appointments ?? []).map((a) => a.id as string)
    )
    .order("created_at", { ascending: false });

  // Fetch shared notes
  const { data: sharedNotes } = await supabase
    .from("shared_notes")
    .select(
      "id, appointment_id, content_json, is_visible_to_patient, created_at, updated_at"
    )
    .eq("practitioner_id", practitioner.id)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  // Fetch shared media
  const { data: sharedMedia } = await supabase
    .from("shared_media")
    .select("id, file_path, file_type, file_name, size_bytes, is_visible_to_patient, uploader_id, created_at")
    .eq("practitioner_id", practitioner.id)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  // Fetch sent questionnaires with responses and field definitions
  const { data: sentQuestionnaires } = await supabase
    .from("questionnaire_responses")
    .select("id, responses, submitted_at, created_at, document_templates!inner(title, template_type, questionnaire_fields)")
    .eq("practitioner_id", practitioner.id)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/dashboard/patients"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Patients
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{profile.full_name}</h1>
          <div className="mt-1 flex gap-4 text-sm text-muted-foreground">
            {profile.phone && <span>{profile.phone}</span>}
            {patient.date_of_birth && (
              <span>
                Né(e) le{" "}
                {new Date(
                  (patient.date_of_birth as string) + "T12:00:00"
                ).toLocaleDateString("fr-FR")}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/api/pdf/patient-dossier?patientId=${patientId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
            Exporter PDF
          </a>
          <SendDocumentButton
            practitionerId={practitioner.id as string}
            patientId={patientId}
          />
          <div className="text-right text-sm text-muted-foreground">
            <p>{(appointments ?? []).length} séance(s)</p>
          </div>
        </div>
      </div>

      {/* Session history */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Historique des séances</h2>
        {(appointments ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune séance.</p>
        ) : (
          <div className="space-y-2">
            {(appointments ?? []).map((apt) => {
              const start = new Date(apt.start_at as string);
              const end = new Date(apt.end_at as string);
              const statusColors: Record<string, string> = {
                confirmed: "text-blue-600",
                completed: "text-green-600",
                cancelled: "text-red-500",
                pending: "text-yellow-600",
                no_show: "text-gray-500",
              };
              return (
                <div
                  key={apt.id as string}
                  className="flex items-center gap-4 rounded-md border px-4 py-2 text-sm"
                >
                  <span className="w-40 font-medium">
                    {start.toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    {start.toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" - "}
                    {end.toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {(apt.type as string) === "teleconsultation"
                      ? "Téléconsultation"
                      : "En cabinet"}
                  </span>
                  <span
                    className={`text-xs font-medium ${statusColors[apt.status as string] ?? ""}`}
                  >
                    {apt.status as string}
                  </span>
                  <a
                    href={`/api/pdf/receipt?appointmentId=${apt.id as string}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-xs text-primary hover:underline"
                  >
                    Reçu PDF
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Private notes */}
      <PrivateNotesSection
        practitionerId={practitioner.id as string}
        appointments={(appointments ?? []) as { id: string; start_at: string }[]}
        initialNotes={
          (privateNotes ?? []) as {
            id: string;
            appointment_id: string;
            content_json: Record<string, unknown>;
            created_at: string;
            updated_at: string;
          }[]
        }
      />

      {/* Shared notes */}
      <SharedNotesSection
        practitionerId={practitioner.id as string}
        patientId={patientId}
        appointments={(appointments ?? []) as { id: string; start_at: string }[]}
        initialNotes={
          (sharedNotes ?? []) as {
            id: string;
            appointment_id: string;
            content_json: Record<string, unknown>;
            is_visible_to_patient: boolean;
            created_at: string;
          }[]
        }
      />

      {/* Sent documents (questionnaires) */}
      <SentDocumentsSection
        sentQuestionnaires={
          ((sentQuestionnaires ?? []) as unknown as {
            id: string;
            responses: Record<string, string | string[] | number | boolean>;
            submitted_at: string | null;
            created_at: string;
            document_templates: {
              title: string;
              template_type: string;
              questionnaire_fields: {
                id: string;
                type: string;
                label: string;
                required: boolean;
                options?: string[];
              }[];
            };
          }[])
        }
      />

      {/* Shared media */}
      <SharedMediaSection
        practitionerId={practitioner.id as string}
        patientId={patientId}
        initialMedia={
          (sharedMedia ?? []) as {
            id: string;
            file_path: string;
            file_type: string;
            file_name: string;
            size_bytes: number;
            is_visible_to_patient: boolean;
            created_at: string;
          }[]
        }
      />

      {/* Messaging */}
      <MessagingSection
        currentUserId={user.id}
        patientId={patientId}
        patientName={profile.full_name}
        hasAuthAccount={!!patient.profile_id}
      />
    </div>
  );
}
