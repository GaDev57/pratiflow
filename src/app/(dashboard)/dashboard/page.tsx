import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = user.user_metadata?.role as string;
  const fullName = user.user_metadata?.full_name as string;

  if (role === "practitioner") {
    return <PractitionerDashboard userId={user.id} fullName={fullName} />;
  }

  return <PatientDashboard userId={user.id} fullName={fullName} />;
}

async function PractitionerDashboard({
  userId,
  fullName,
}: {
  userId: string;
  fullName: string;
}) {
  const supabase = await createClient();

  const { data: practitioner } = await supabase
    .from("practitioners")
    .select("id, slug, consultation_price")
    .eq("profile_id", userId)
    .single();

  if (!practitioner) redirect("/onboarding");

  // Today's appointments
  const today = new Date().toISOString().substring(0, 10);
  const { data: todayApts, count: todayCount } = await supabase
    .from("appointments")
    .select("id, start_at, end_at, type, status, patients!inner(profiles!inner(full_name))", {
      count: "exact",
    })
    .eq("practitioner_id", practitioner.id)
    .gte("start_at", `${today}T00:00:00`)
    .lte("start_at", `${today}T23:59:59`)
    .neq("status", "cancelled")
    .order("start_at");

  // This week count
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const { count: weekCount } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("practitioner_id", practitioner.id)
    .gte("start_at", startOfWeek.toISOString())
    .lte("start_at", endOfWeek.toISOString())
    .neq("status", "cancelled");

  // This month revenue
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const { count: monthAptsCount } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("practitioner_id", practitioner.id)
    .gte("start_at", `${monthStart}T00:00:00`)
    .in("status", ["confirmed", "completed"]);

  const monthRevenue =
    (monthAptsCount ?? 0) * Number(practitioner.consultation_price);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bonjour, {fullName}</h1>
          <p className="text-muted-foreground">
            Votre page de réservation :{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              /book/{practitioner.slug}
            </code>
          </p>
        </div>
        <Link
          href="/dashboard/settings"
          className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
        >
          Paramètres
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="RDV aujourd'hui" value={String(todayCount ?? 0)} />
        <StatCard title="RDV cette semaine" value={String(weekCount ?? 0)} />
        <StatCard title="CA du mois" value={`${monthRevenue}€`} />
        <StatCard
          title="Patients"
          value="—"
        />
      </div>

      <div className="rounded-lg border p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Aujourd&apos;hui</h2>
          <Link
            href="/dashboard/calendar"
            className="text-sm text-primary hover:underline"
          >
            Voir le calendrier →
          </Link>
        </div>
        {(todayApts?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun rendez-vous aujourd&apos;hui.
          </p>
        ) : (
          <div className="space-y-2">
            {todayApts?.map((apt) => {
              const start = new Date(apt.start_at as string);
              const end = new Date(apt.end_at as string);
              const patients = apt.patients as unknown as Record<string, unknown>;
              const profiles = (patients?.profiles ?? {}) as Record<string, unknown>;
              const patientName = (profiles?.full_name as string) ?? "Patient";
              return (
                <div
                  key={apt.id as string}
                  className="flex items-center gap-4 rounded-md border px-4 py-2"
                >
                  <span className="text-sm font-medium">
                    {start.toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    -{" "}
                    {end.toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-sm">{patientName}</span>
                  <span className="text-xs text-muted-foreground">
                    {apt.type === "teleconsultation"
                      ? "Téléconsultation"
                      : "En cabinet"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

async function PatientDashboard({
  userId,
  fullName,
}: {
  userId: string;
  fullName: string;
}) {
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("profile_id", userId)
    .single();

  if (!patient) redirect("/onboarding");

  const { data: upcoming } = await supabase
    .from("appointments")
    .select(
      "id, start_at, end_at, type, status, jitsi_room_url, practitioners!inner(profiles!inner(full_name), specialty)"
    )
    .eq("patient_id", patient.id)
    .gte("start_at", new Date().toISOString())
    .neq("status", "cancelled")
    .order("start_at")
    .limit(5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bonjour, {fullName}</h1>
        <p className="text-muted-foreground">Voici votre espace patient</p>
      </div>

      <div className="rounded-lg border p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Prochains rendez-vous</h2>
          <Link
            href="/dashboard/appointments"
            className="text-sm text-primary hover:underline"
          >
            Tout voir →
          </Link>
        </div>
        {(upcoming?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun rendez-vous à venir.
          </p>
        ) : (
          <div className="space-y-2">
            {upcoming?.map((apt) => {
              const start = new Date(apt.start_at as string);
              const practitioners = apt.practitioners as unknown as Record<string, unknown>;
              const pProfiles = (practitioners?.profiles ?? {}) as Record<string, unknown>;
              const pracName = (pProfiles?.full_name as string) ?? "Praticien";
              return (
                <div
                  key={apt.id as string}
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {pracName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {start.toLocaleDateString("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}{" "}
                      à{" "}
                      {start.toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {apt.type === "teleconsultation" &&
                    apt.jitsi_room_url && (
                      <Link
                        href={apt.jitsi_room_url as string}
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                      >
                        Rejoindre
                      </Link>
                    )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-semibold">Documents partagés</h2>
        <p className="text-sm text-muted-foreground">
          Aucun document partagé pour le moment.
        </p>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
