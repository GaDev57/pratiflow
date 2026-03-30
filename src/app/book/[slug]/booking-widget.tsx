"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getAvailableSlots,
  getAvailableDates,
  type AvailabilityRule,
  type AvailabilityException,
  type ExistingAppointment,
} from "@/lib/slots";

interface Props {
  practitionerId: string;
  practitionerName: string;
  sessionDurations: number[];
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
  timezone: string;
}

type Step = "config" | "date" | "slot" | "form" | "success";

export function BookingWidget({
  practitionerId,
  practitionerName,
  sessionDurations,
  rules,
  exceptions,
  timezone,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("config");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Config
  const [duration, setDuration] = useState(sessionDurations[0] ?? 30);
  const [type, setType] = useState<"in_person" | "teleconsultation">(
    "in_person"
  );

  // Date selection
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Slot selection
  const [slots, setSlots] = useState<{ start: string; end: string }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{
    start: string;
    end: string;
  } | null>(null);

  // Patient form
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [motif, setMotif] = useState("");

  // Compute available dates when month changes
  useEffect(() => {
    const dates = getAvailableDates(
      currentMonth.year,
      currentMonth.month,
      rules,
      exceptions
    );
    setAvailableDates(dates);
  }, [currentMonth, rules, exceptions]);

  // Fetch slots when date is selected (including Google Calendar busy periods)
  useEffect(() => {
    if (!selectedDate) return;

    async function fetchSlots() {
      const supabase = createClient();
      const dayStart = selectedDate + "T00:00:00";
      const dayEnd = selectedDate + "T23:59:59";

      // Fetch existing appointments and Google Calendar busy periods in parallel
      const [appointmentsRes, gcalRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("start_at, end_at, status")
          .eq("practitioner_id", practitionerId)
          .gte("start_at", dayStart)
          .lte("start_at", dayEnd)
          .neq("status", "cancelled"),
        fetch(
          `/api/google-calendar/busy?practitionerId=${practitionerId}&date=${selectedDate}`
        ).then((r) => r.json()).catch(() => ({ busyPeriods: [] })),
      ]);

      let available = getAvailableSlots(
        selectedDate!,
        duration,
        rules,
        exceptions,
        (appointmentsRes.data as ExistingAppointment[]) ?? [],
        timezone
      );

      // Filter out slots that overlap with Google Calendar busy periods
      const busyPeriods = (gcalRes.busyPeriods ?? []) as {
        start: number;
        end: number;
      }[];
      if (busyPeriods.length > 0) {
        available = available.filter((slot) => {
          const slotStartMin =
            parseInt(slot.start.substring(11, 13)) * 60 +
            parseInt(slot.start.substring(14, 16));
          const slotEndMin =
            parseInt(slot.end.substring(11, 13)) * 60 +
            parseInt(slot.end.substring(14, 16));
          return !busyPeriods.some(
            (bp) => slotStartMin < bp.end && slotEndMin > bp.start
          );
        });
      }

      setSlots(available);
    }

    fetchSlots();
  }, [selectedDate, duration, practitionerId, rules, exceptions, timezone]);

  async function handleBook() {
    if (!selectedSlot || !patientName || !patientEmail) return;
    setLoading(true);
    setError(null);

    // Create patient + appointment via server API (no auth required)
    const res = await fetch("/api/booking/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        practitionerId,
        patientName,
        patientEmail,
        patientPhone,
        startAt: selectedSlot.start,
        endAt: selectedSlot.end,
        type,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erreur lors de la réservation. Veuillez réessayer.");
      setLoading(false);
      return;
    }

    // Trigger server-side notifications + Google Calendar sync
    await fetch("/api/booking/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        practitionerId,
        patientEmail,
        patientPhone,
        patientName,
        practitionerName,
        date: new Date(selectedSlot.start).toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        time: new Date(selectedSlot.start).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        startDateTime: selectedSlot.start,
        endDateTime: selectedSlot.end,
        duration,
        type,
      }),
    });

    setStep("success");
    setLoading(false);
  }

  // Navigation helpers
  function prevMonth() {
    setCurrentMonth((prev) => {
      if (prev.month === 0)
        return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  }

  function nextMonth() {
    setCurrentMonth((prev) => {
      if (prev.month === 11)
        return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  }

  // Step: Config (duration + type)
  if (step === "config") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Choisissez votre consultation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Type de consultation</Label>
            <div className="flex gap-3">
              <button
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
          <div className="space-y-2">
            <Label>Durée</Label>
            <Select
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
          <Button className="w-full" onClick={() => setStep("date")}>
            Choisir une date
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Step: Date picker
  if (step === "date") {
    const monthName = new Date(
      currentMonth.year,
      currentMonth.month
    ).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

    // Build calendar grid
    const firstDay = new Date(
      currentMonth.year,
      currentMonth.month,
      1
    ).getDay();
    const daysInMonth = new Date(
      currentMonth.year,
      currentMonth.month + 1,
      0
    ).getDate();
    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = Array(firstDay).fill(null);

    for (let d = 1; d <= daysInMonth; d++) {
      currentWeek.push(d);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={prevMonth}>
              ←
            </Button>
            <CardTitle className="text-base capitalize">{monthName}</CardTitle>
            <Button variant="ghost" size="sm" onClick={nextMonth}>
              →
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"].map((d) => (
              <div key={d} className="py-1 font-medium">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weeks.flat().map((day, i) => {
              if (day === null) return <div key={i} />;

              const dateStr = `${currentMonth.year}-${String(
                currentMonth.month + 1
              ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isAvailable = availableDates.includes(dateStr);

              return (
                <button
                  key={i}
                  disabled={!isAvailable}
                  onClick={() => {
                    setSelectedDate(dateStr);
                    setStep("slot");
                  }}
                  className={`rounded-md py-2 text-sm ${
                    isAvailable
                      ? "hover:bg-primary hover:text-primary-foreground font-medium"
                      : "text-muted-foreground/30"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <Button
            variant="ghost"
            className="mt-4 w-full"
            onClick={() => setStep("config")}
          >
            ← Retour
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Step: Time slot selection
  if (step === "slot") {
    const dateLabel = selectedDate
      ? new Date(selectedDate + "T12:00:00").toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : "";

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base capitalize">{dateLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          {slots.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucun créneau disponible pour cette date.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => {
                const time = slot.start.substring(11, 16);
                const isSelected = selectedSlot?.start === slot.start;
                return (
                  <button
                    key={slot.start}
                    onClick={() => setSelectedSlot(slot)}
                    className={`rounded-md border py-2 text-sm ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:border-primary"
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => {
                setSelectedSlot(null);
                setStep("date");
              }}
            >
              ← Retour
            </Button>
            {selectedSlot && (
              <Button className="flex-1" onClick={() => setStep("form")}>
                Continuer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step: Patient info form
  if (step === "form") {
    const timeLabel = selectedSlot
      ? selectedSlot.start.substring(11, 16)
      : "";
    const dateLabel = selectedDate
      ? new Date(selectedDate + "T12:00:00").toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : "";

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vos informations</CardTitle>
          <p className="text-sm text-muted-foreground capitalize">
            {dateLabel} à {timeLabel} — {duration} min (
            {type === "teleconsultation" ? "téléconsultation" : "en cabinet"})
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Nom complet</Label>
            <Input
              id="name"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Jean Dupont"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={patientEmail}
              onChange={(e) => setPatientEmail(e.target.value)}
              placeholder="vous@exemple.fr"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone (optionnel)</Label>
            <Input
              id="phone"
              type="tel"
              value={patientPhone}
              onChange={(e) => setPatientPhone(e.target.value)}
              placeholder="+33 6 12 34 56 78"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="motif">Motif de consultation</Label>
            <Input
              id="motif"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Première consultation, suivi..."
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setStep("slot")}
            >
              ← Retour
            </Button>
            <Button
              className="flex-1"
              onClick={handleBook}
              disabled={loading || !patientName || !patientEmail}
            >
              {loading ? "Réservation..." : "Confirmer le rendez-vous"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step: Success
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold">Rendez-vous confirmé !</h2>
        <p className="mt-2 text-muted-foreground">
          Un email de confirmation vous a été envoyé.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => router.push("/dashboard")}
        >
          Aller au tableau de bord
        </Button>
      </CardContent>
    </Card>
  );
}
