"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface Patient {
  id: string;
  name: string;
}

interface Props {
  practitionerId: string;
  patients: Patient[];
  sessionDurations: number[];
  onClose: () => void;
}

export function CreateAppointmentModal({
  practitionerId,
  patients,
  sessionDurations,
  onClose,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [patientId, setPatientId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(sessionDurations[0] ?? 30);
  const [type, setType] = useState<"in_person" | "teleconsultation">("in_person");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId || !date || !time) return;

    setLoading(true);
    setError(null);

    // Use consistent ISO format for both start and end
    const startDate = new Date(`${date}T${time}:00`);
    const endDate = new Date(startDate.getTime() + duration * 60000);
    const startAt = startDate.toISOString();
    const endAt = endDate.toISOString();

    const jitsiRoom =
      type === "teleconsultation"
        ? `pratiflow-${crypto.randomUUID().substring(0, 8)}`
        : null;

    const supabase = createClient();
    const { error: insertError } = await supabase.from("appointments").insert({
      practitioner_id: practitionerId,
      patient_id: patientId,
      start_at: startAt,
      end_at: endAt,
      type,
      status: "confirmed",
      jitsi_room_url: jitsiRoom ? `/room/${jitsiRoom}` : null,
    });

    if (insertError) {
      setError(
        insertError.message.includes("overlap")
          ? "Ce créneau chevauche un rendez-vous existant."
          : "Erreur lors de la création du rendez-vous : " + insertError.message
      );
      setLoading(false);
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">Nouveau rendez-vous</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="patient">Patient *</Label>
            <Select
              id="patient"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              required
            >
              <option value="">Sélectionner un patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Heure *</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Durée</Label>
            <Select
              id="duration"
              value={String(duration)}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              {sessionDurations.map((d) => (
                <option key={d} value={d}>
                  {d} minutes
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setType("in_person")}
                className={`flex-1 rounded-lg border p-3 text-sm ${
                  type === "in_person"
                    ? "border-primary bg-primary/5 font-medium"
                    : "hover:bg-muted"
                }`}
              >
                En cabinet
              </button>
              <button
                type="button"
                onClick={() => setType("teleconsultation")}
                className={`flex-1 rounded-lg border p-3 text-sm ${
                  type === "teleconsultation"
                    ? "border-primary bg-primary/5 font-medium"
                    : "hover:bg-muted"
                }`}
              >
                Téléconsultation
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={onClose}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || !patientId || !date || !time}
            >
              {loading ? "Création..." : "Créer le rendez-vous"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
