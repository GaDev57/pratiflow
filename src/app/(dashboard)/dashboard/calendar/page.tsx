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
    .select("id, timezone")
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
      "id, start_at, end_at, type, status, patients!inner(id, profiles!inner(full_name))"
    )
    .eq("practitioner_id", practitioner.id)
    .gte("start_at", startOfWeek.toISOString())
    .lte("start_at", endOfWeek.toISOString())
    .order("start_at");

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
      />
    </div>
  );
}
