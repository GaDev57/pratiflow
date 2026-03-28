import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppointmentsList } from "./appointments-list";

export default async function AppointmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = user.user_metadata?.role as string;

  if (role === "practitioner") {
    redirect("/dashboard/calendar");
  }

  // Patient view
  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!patient) redirect("/onboarding");

  const { data: upcoming } = await supabase
    .from("appointments")
    .select(
      "id, start_at, end_at, type, status, jitsi_room_url, practitioners!inner(id, profiles!inner(full_name), specialty)"
    )
    .eq("patient_id", patient.id)
    .gte("start_at", new Date().toISOString())
    .neq("status", "cancelled")
    .order("start_at");

  const { data: past } = await supabase
    .from("appointments")
    .select(
      "id, start_at, end_at, type, status, practitioners!inner(id, profiles!inner(full_name), specialty)"
    )
    .eq("patient_id", patient.id)
    .lt("start_at", new Date().toISOString())
    .order("start_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Mes rendez-vous</h1>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">À venir</h2>
        <AppointmentsList
          appointments={upcoming ?? []}
          patientId={patient.id}
          showActions
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Historique</h2>
        <AppointmentsList appointments={past ?? []} patientId={patient.id} />
      </section>
    </div>
  );
}
