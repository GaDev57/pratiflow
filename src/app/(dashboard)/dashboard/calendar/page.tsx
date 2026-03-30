import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "./calendar-view";

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.user_metadata?.role !== "practitioner") redirect("/dashboard");

  const { data: practitioner } = await supabase
    .from("practitioners")
    .select("id, timezone, session_durations")
    .eq("profile_id", user.id)
    .single();

  if (!practitioner) redirect("/onboarding");

  // Fetch this week's appointments
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "id, start_at, end_at, type, status, jitsi_room_url, patients!inner(id, full_name, profiles(full_name))"
    )
    .eq("practitioner_id", practitioner.id)
    .gte("start_at", startOfWeek.toISOString())
    .lte("start_at", endOfWeek.toISOString())
    .order("start_at");

  // Fetch patients for appointment creation modal
  const { data: directPatients } = await supabase
    .from("patients")
    .select("id, full_name, profiles(full_name)")
    .eq("practitioner_id", practitioner.id);

  // Helper: resolve patient name (managed or profile-linked)
  function getPatientName(p: { full_name?: unknown; profiles?: unknown }): string {
    const prof = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    return (p.full_name as string) || (prof as { full_name: string } | null)?.full_name || "Sans nom";
  }

  // Also get patients from appointments (not directly linked)
  const patientIds = new Set<string>();
  const patientsList: { id: string; name: string }[] = [];

  for (const dp of directPatients ?? []) {
    patientIds.add(dp.id);
    patientsList.push({ id: dp.id, name: getPatientName(dp) });
  }

  for (const apt of appointments ?? []) {
    const patient = apt.patients as unknown as {
      id: string;
      full_name?: string | null;
      profiles?: { full_name: string } | null;
    };
    if (!patientIds.has(patient.id)) {
      patientIds.add(patient.id);
      patientsList.push({ id: patient.id, name: getPatientName(patient) });
    }
  }

  patientsList.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendrier</h1>
          <p className="text-muted-foreground">Vue agenda de la semaine</p>
        </div>
      </div>
      <CalendarView
        appointments={appointments ?? []}
        practitionerId={practitioner.id}
        timezone={(practitioner.timezone as string) ?? "Europe/Paris"}
        patients={patientsList}
        sessionDurations={(practitioner.session_durations as number[]) ?? [30, 45, 60]}
      />
    </div>
  );
}
