import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PatientMessaging } from "./patient-messaging";

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = user.user_metadata?.role as string;

  // For practitioners, redirect to patients list (messaging is per-patient)
  if (role === "practitioner") {
    redirect("/dashboard/patients");
  }

  // Patient: get their patient record and practitioner
  const { data: patient } = await supabase
    .from("patients")
    .select(
      "id, practitioner_id, practitioners!inner(profile_id, profiles!inner(full_name))"
    )
    .eq("profile_id", user.id)
    .single();

  if (!patient || !patient.practitioner_id) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-muted-foreground">
          Vous n&apos;avez pas encore de praticien associé. Prenez un
          rendez-vous pour commencer à échanger.
        </p>
      </div>
    );
  }

  const practitioners = patient.practitioners as unknown as {
    profile_id: string;
    profiles: { full_name: string };
  };

  // Fetch messages
  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, content, read_at, created_at")
    .eq("patient_id", patient.id)
    .order("created_at", { ascending: true });

  // Count unread
  const { count: unreadCount } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patient.id)
    .eq("recipient_id", user.id)
    .is("read_at", null);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-muted-foreground">
          Conversation avec {practitioners.profiles.full_name}
          {(unreadCount ?? 0) > 0 && (
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {unreadCount} non lu{(unreadCount ?? 0) > 1 ? "s" : ""}
            </span>
          )}
        </p>
      </div>

      <PatientMessaging
        currentUserId={user.id}
        patientId={patient.id as string}
        recipientId={practitioners.profile_id}
        practitionerName={practitioners.profiles.full_name}
        initialMessages={
          (messages ?? []) as {
            id: string;
            sender_id: string;
            content: string;
            read_at: string | null;
            created_at: string;
          }[]
        }
      />
    </div>
  );
}
