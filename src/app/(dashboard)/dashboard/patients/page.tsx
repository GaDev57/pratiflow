import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PatientsHeader } from "./patients-header";

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

  // Get patients directly linked to this practitioner
  const { data: directPatients } = await supabase
    .from("patients")
    .select("id, profile_id, date_of_birth, profiles!inner(full_name, phone)")
    .eq("practitioner_id", practitioner.id);

  // Get patients linked via appointments
  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "patient_id, start_at, status, patients!inner(id, profile_id, profiles!inner(full_name, phone))"
    )
    .eq("practitioner_id", practitioner.id)
    .order("start_at", { ascending: false });

  // Build patients map: merge direct patients + appointment-based patients
  const patientsMap = new Map<
    string,
    {
      patientId: string;
      name: string;
      phone: string | null;
      lastAppointment: string | null;
      totalAppointments: number;
    }
  >();

  // Add directly linked patients first
  for (const dp of directPatients ?? []) {
    const profile = dp.profiles as unknown as { full_name: string; phone: string | null };
    patientsMap.set(dp.id, {
      patientId: dp.id,
      name: profile.full_name,
      phone: profile.phone,
      lastAppointment: null,
      totalAppointments: 0,
    });
  }

  // Merge appointment data
  for (const apt of appointments ?? []) {
    const patient = apt.patients as unknown as {
      id: string;
      profile_id: string;
      profiles: { full_name: string; phone: string | null };
    };
    const existing = patientsMap.get(patient.id);
    if (existing) {
      existing.totalAppointments++;
      if (!existing.lastAppointment) {
        existing.lastAppointment = apt.start_at as string;
      }
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
      <PatientsHeader count={patients.length} />

      {patients.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">
            Aucun patient pour le moment. Cliquez sur &quot;+ Nouveau patient&quot;
            pour créer votre première fiche patient.
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
                {patient.lastAppointment
                  ? new Date(patient.lastAppointment).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "Aucun"}
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
