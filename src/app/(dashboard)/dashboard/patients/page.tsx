import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function PatientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.user_metadata?.role !== "practitioner") redirect("/dashboard");

  const { data: practitioner } = await supabase
    .from("practitioners")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!practitioner) redirect("/onboarding");

  // Get patients linked to this practitioner via appointments
  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "patient_id, start_at, status, patients!inner(id, profile_id, profiles!inner(full_name, phone))"
    )
    .eq("practitioner_id", practitioner.id)
    .order("start_at", { ascending: false });

  // Deduplicate patients and get latest appointment info
  const patientsMap = new Map<
    string,
    {
      patientId: string;
      name: string;
      phone: string | null;
      lastAppointment: string;
      totalAppointments: number;
    }
  >();

  for (const apt of appointments ?? []) {
    const patient = apt.patients as unknown as {
      id: string;
      profile_id: string;
      profiles: { full_name: string; phone: string | null };
    };
    const existing = patientsMap.get(patient.id);
    if (existing) {
      existing.totalAppointments++;
    } else {
      patientsMap.set(patient.id, {
        patientId: patient.id,
        name: patient.profiles.full_name,
        phone: patient.profiles.phone,
        lastAppointment: apt.start_at as string,
        totalAppointments: 1,
      });
    }
  }

  const patients = Array.from(patientsMap.values());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Patients</h1>
        <p className="text-muted-foreground">
          {patients.length} patient{patients.length !== 1 ? "s" : ""}
        </p>
      </div>

      {patients.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">
            Aucun patient pour le moment. Vos patients apparaîtront ici
            après leur premier rendez-vous.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <div className="grid grid-cols-4 gap-4 border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
            <div>Nom</div>
            <div>Téléphone</div>
            <div>Dernier RDV</div>
            <div>Total séances</div>
          </div>
          {patients.map((patient) => (
            <Link
              key={patient.patientId}
              href={`/dashboard/patients/${patient.patientId}`}
              className="grid grid-cols-4 gap-4 border-b px-4 py-3 text-sm hover:bg-muted/30 last:border-0"
            >
              <div className="font-medium">{patient.name}</div>
              <div className="text-muted-foreground">
                {patient.phone || "—"}
              </div>
              <div className="text-muted-foreground">
                {new Date(patient.lastAppointment).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
              <div className="text-muted-foreground">
                {patient.totalAppointments}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
