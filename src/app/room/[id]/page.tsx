import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JitsiRoom } from "./jitsi-room";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RoomPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?redirect=/room/${id}`);

  // Find appointment with this jitsi room URL
  const { data: appointment } = await supabase
    .from("appointments")
    .select(
      "id, start_at, end_at, status, type, practitioner_id, patient_id, practitioners!inner(profile_id, profiles!inner(full_name)), patients(id, profile_id, full_name, profiles(full_name))"
    )
    .or(`jitsi_room_url.eq./room/${id},jitsi_room_url.eq.${id}`)
    .single();

  if (!appointment) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Salle introuvable</h1>
          <p className="mt-2 text-muted-foreground">
            Cette consultation n&apos;existe pas ou a été annulée.
          </p>
        </div>
      </div>
    );
  }

  // Verify user is participant
  const practitioner = appointment.practitioners as unknown as {
    profile_id: string;
    profiles: { full_name: string };
  };
  const patientData = appointment.patients as unknown as {
    id: string;
    profile_id: string | null;
    full_name: string | null;
    profiles: { full_name: string } | null;
  };
  const patientName = patientData.full_name || patientData.profiles?.full_name || "Patient";

  const isPractitioner = practitioner.profile_id === user.id;
  const isPatient = patientData.profile_id === user.id;

  if (!isPractitioner && !isPatient) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Accès refusé</h1>
          <p className="mt-2 text-muted-foreground">
            Vous n&apos;êtes pas autorisé à rejoindre cette consultation.
          </p>
        </div>
      </div>
    );
  }

  // Check time window (-10min before start, until end)
  const now = new Date();
  const start = new Date(appointment.start_at as string);
  const end = new Date(appointment.end_at as string);
  const windowStart = new Date(start.getTime() - 10 * 60 * 1000);

  const isTooEarly = now < windowStart;
  const isTooLate = now > end;

  if (isTooEarly) {
    const minutesUntil = Math.ceil(
      (windowStart.getTime() - now.getTime()) / 60000
    );
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Consultation pas encore ouverte</h1>
          <p className="mt-2 text-muted-foreground">
            La salle ouvrira 10 minutes avant le rendez-vous.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Rendez-vous à{" "}
            {start.toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            ({minutesUntil} min restantes)
          </p>
        </div>
      </div>
    );
  }

  if (isTooLate) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Consultation terminée</h1>
          <p className="mt-2 text-muted-foreground">
            Ce rendez-vous est terminé.
          </p>
        </div>
      </div>
    );
  }

  const displayName = isPractitioner
    ? practitioner.profiles.full_name
    : patientName;

  return (
    <JitsiRoom
      roomName={`pratiflow-${appointment.id}`}
      displayName={displayName}
      appointmentId={appointment.id as string}
      isPractitioner={isPractitioner}
      patientName={patientName}
      practitionerName={practitioner.profiles.full_name}
    />
  );
}
