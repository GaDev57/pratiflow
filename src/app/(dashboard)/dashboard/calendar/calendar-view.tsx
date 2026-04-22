"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { CreateAppointmentModal } from "./create-appointment-modal";

interface Appointment {
  id: string;
  start_at: string;
  end_at: string;
  type: string;
  status: string;
  patients: Record<string, unknown>;
}

interface Patient {
  id: string;
  name: string;
}

interface Props {
  appointments: Record<string, unknown>[];
  practitionerId: string;
  timezone: string;
  patients?: Patient[];
  sessionDurations?: number[];
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-100 border-blue-300 text-blue-800",
  pending: "bg-yellow-100 border-yellow-300 text-yellow-800",
  completed: "bg-green-100 border-green-300 text-green-800",
  cancelled: "bg-red-100 border-red-300 text-red-800 line-through opacity-50",
  no_show: "bg-gray-100 border-gray-300 text-gray-800",
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmé",
  pending: "En attente",
  completed: "Terminé",
  cancelled: "Annulé",
  no_show: "Absent",
};

export function CalendarView({
  appointments,
  practitionerId,
  timezone,
  patients = [],
  sessionDurations = [30, 45, 60],
}: Props) {
  const router = useRouter();
  const [weekOffset, setWeekOffset] = useState(0);
  const [loadedAppointments, setLoadedAppointments] =
    useState<Record<string, unknown>[]>(appointments);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Calculate week dates
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1 + weekOffset * 7);
  startOfWeek.setHours(0, 0, 0, 0);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  async function changeWeek(offset: number) {
    const newOffset = weekOffset + offset;
    setWeekOffset(newOffset);

    const newStart = new Date(now);
    newStart.setDate(now.getDate() - now.getDay() + 1 + newOffset * 7);
    newStart.setHours(0, 0, 0, 0);
    const newEnd = new Date(newStart);
    newEnd.setDate(newStart.getDate() + 6);
    newEnd.setHours(23, 59, 59, 999);

    const supabase = createClient();
    const { data } = await supabase
      .from("appointments")
      .select(
        "id, start_at, end_at, type, status, jitsi_room_url, patients!inner(id, full_name, profiles(full_name))"
      )
      .eq("practitioner_id", practitionerId)
      .gte("start_at", newStart.toISOString())
      .lte("start_at", newEnd.toISOString())
      .order("start_at");

    setLoadedAppointments((data as Record<string, unknown>[]) ?? []);
  }

  async function updateStatus(appointmentId: string, status: string) {
    const supabase = createClient();
    await supabase
      .from("appointments")
      .update({ status })
      .eq("id", appointmentId);

    setLoadedAppointments((prev) =>
      prev.map((a) => ((a.id as string) === appointmentId ? { ...a, status } : a))
    );
    router.refresh();
  }

  const weekLabel = `${weekDays[0].toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  })} — ${weekDays[6].toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;

  return (
    <div className="space-y-4">
      {/* Week navigation + create button */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => changeWeek(-1)}>
          ← Semaine précédente
        </Button>
        <span className="text-sm font-medium">{weekLabel}</span>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            + Nouveau RDV
          </Button>
          <Button variant="ghost" size="sm" onClick={() => changeWeek(1)}>
            Semaine suivante →
          </Button>
        </div>
      </div>

      {showCreateModal && (
        <CreateAppointmentModal
          practitionerId={practitionerId}
          patients={patients}
          sessionDurations={sessionDurations}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Days */}
      <div className="space-y-4">
        {weekDays.map((day) => {
          const dayStr = day.toISOString().substring(0, 10);
          const dayAppointments = loadedAppointments.filter(
            (a) => (a.start_at as string).substring(0, 10) === dayStr
          );
          const isToday =
            day.toDateString() === new Date().toDateString();

          return (
            <div key={dayStr} className="rounded-lg border">
              <div
                className={`border-b px-4 py-2 text-sm font-medium capitalize ${
                  isToday ? "bg-primary/5" : "bg-muted/50"
                }`}
              >
                {day.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
                {isToday && (
                  <span className="ml-2 text-xs text-primary">
                    Aujourd&apos;hui
                  </span>
                )}
              </div>

              {dayAppointments.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  Aucun rendez-vous
                </div>
              ) : (
                <div className="divide-y">
                  {dayAppointments.map((apt) => {
                    const startTime = new Date(apt.start_at as string).toLocaleTimeString(
                      "fr-FR",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: timezone,
                      }
                    );
                    const endTime = new Date(apt.end_at as string).toLocaleTimeString(
                      "fr-FR",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: timezone,
                      }
                    );
                    const aptPatients = apt.patients as Record<string, unknown> | undefined;
                    const profiles = Array.isArray(aptPatients?.profiles) ? aptPatients.profiles[0] : aptPatients?.profiles;
                    const prof = profiles as Record<string, unknown> | undefined;
                    const patientName = (aptPatients?.full_name as string) || (prof?.full_name as string) || "Patient";
                    const patientId = (aptPatients?.id as string) ?? "";
                    const jitsiUrl = apt.jitsi_room_url as string | null;
                    const isTeleconsultation = (apt.type as string) === "teleconsultation";
                    const isConfirmed = (apt.status as string) === "confirmed";

                    return (
                      <div
                        key={apt.id as string}
                        className="flex items-center gap-4 px-4 py-3"
                      >
                        <div className="w-24 text-sm font-medium">
                          {startTime} - {endTime}
                        </div>
                        <div className="flex-1">
                          <Link
                            href={`/dashboard/patients/${patientId}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {patientName}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {isTeleconsultation
                              ? "Téléconsultation"
                              : "En cabinet"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs ${
                            STATUS_COLORS[apt.status as string] ?? ""
                          }`}
                        >
                          {STATUS_LABELS[apt.status as string] ?? (apt.status as string)}
                        </span>
                        <div className="flex gap-1">
                          {isTeleconsultation && isConfirmed && (
                            <span className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white">
                              WhatsApp
                            </span>
                          )}
                          {isConfirmed && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs"
                                onClick={() =>
                                  updateStatus(apt.id as string, "completed")
                                }
                              >
                                Terminer
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-destructive"
                                onClick={() =>
                                  updateStatus(apt.id as string, "cancelled")
                                }
                              >
                                Annuler
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
