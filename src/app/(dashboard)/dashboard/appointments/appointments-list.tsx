"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface Props {
  appointments: Record<string, unknown>[];
  patientId: string;
  showActions?: boolean;
}

export function AppointmentsList({
  appointments,
  patientId,
  showActions,
}: Props) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState<string | null>(null);

  async function cancelAppointment(appointmentId: string) {
    setCancelling(appointmentId);
    const supabase = createClient();
    await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appointmentId);

    router.refresh();
    setCancelling(null);
  }

  if (appointments.length === 0) {
    return (
      <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
        Aucun rendez-vous.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((apt) => {
        const practitioners = apt.practitioners as Record<string, unknown>;
        const profiles = (practitioners?.profiles ?? {}) as Record<string, unknown>;
        const practitionerName = (profiles.full_name ?? "Praticien") as string;
        const specialty = (practitioners?.specialty ?? "") as string;
        const start = new Date(apt.start_at as string);
        const end = new Date(apt.end_at as string);
        const isUpcoming = start > new Date();
        const isTeleconsultation =
          (apt.type as string) === "teleconsultation" &&
          (apt.status as string) === "confirmed";

        return (
          <div
            key={apt.id as string}
            className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
          >
            <div className="flex-1">
              <p className="font-medium">{practitionerName}</p>
              <p className="text-xs text-muted-foreground">
                {specialty}
              </p>
              <p className="mt-1 text-sm">
                {start.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}{" "}
                à{" "}
                {start.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                -{" "}
                {end.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {apt.type === "teleconsultation"
                  ? "Téléconsultation"
                  : "En cabinet"}
              </p>
            </div>

            {showActions && isUpcoming && (
              <div className="flex gap-2">
                {isTeleconsultation && (
                  <span className="inline-flex items-center rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white">
                    WhatsApp
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  disabled={cancelling === (apt.id as string)}
                  onClick={() => cancelAppointment(apt.id as string)}
                >
                  {cancelling === (apt.id as string) ? "Annulation..." : "Annuler"}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
