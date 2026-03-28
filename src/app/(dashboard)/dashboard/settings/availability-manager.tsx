"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const DAYS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

interface Rule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface Exception {
  id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

interface Props {
  practitionerId: string;
  initialRules: Rule[];
  initialExceptions: Exception[];
}

export function AvailabilityManager({
  practitionerId,
  initialRules,
  initialExceptions,
}: Props) {
  const router = useRouter();
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [exceptions, setExceptions] = useState<Exception[]>(initialExceptions);
  const [loading, setLoading] = useState(false);

  // New rule form state
  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("12:00");

  // New exception form state
  const [newExDate, setNewExDate] = useState("");
  const [newExReason, setNewExReason] = useState("");

  async function addRule() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("availability_rules")
      .insert({
        practitioner_id: practitionerId,
        day_of_week: newDay,
        start_time: newStart,
        end_time: newEnd,
        is_active: true,
      })
      .select()
      .single();

    if (!error && data) {
      setRules([...rules, data as Rule]);
    }
    setLoading(false);
    router.refresh();
  }

  async function toggleRule(ruleId: string, isActive: boolean) {
    const supabase = createClient();
    await supabase
      .from("availability_rules")
      .update({ is_active: !isActive })
      .eq("id", ruleId);

    setRules(
      rules.map((r) =>
        r.id === ruleId ? { ...r, is_active: !isActive } : r
      )
    );
  }

  async function deleteRule(ruleId: string) {
    const supabase = createClient();
    await supabase.from("availability_rules").delete().eq("id", ruleId);
    setRules(rules.filter((r) => r.id !== ruleId));
  }

  async function addException() {
    if (!newExDate) return;
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("availability_exceptions")
      .insert({
        practitioner_id: practitionerId,
        date: newExDate,
        start_time: null,
        end_time: null,
        reason: newExReason || null,
      })
      .select()
      .single();

    if (!error && data) {
      setExceptions([...exceptions, data as Exception]);
      setNewExDate("");
      setNewExReason("");
    }
    setLoading(false);
  }

  async function deleteException(exId: string) {
    const supabase = createClient();
    await supabase.from("availability_exceptions").delete().eq("id", exId);
    setExceptions(exceptions.filter((e) => e.id !== exId));
  }

  return (
    <div className="space-y-6">
      {/* Existing rules */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Plages horaires récurrentes</h3>
        {rules.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucune plage configurée. Ajoutez vos créneaux ci-dessous.
          </p>
        )}
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center gap-3 rounded-md border p-3"
            >
              <span
                className={`flex-1 text-sm ${
                  rule.is_active ? "" : "text-muted-foreground line-through"
                }`}
              >
                {DAYS[rule.day_of_week]} : {rule.start_time} - {rule.end_time}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleRule(rule.id, rule.is_active)}
              >
                {rule.is_active ? "Désactiver" : "Activer"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => deleteRule(rule.id)}
              >
                Supprimer
              </Button>
            </div>
          ))}
        </div>

        {/* Add rule form */}
        <div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/50 p-4">
          <div className="space-y-1">
            <Label className="text-xs">Jour</Label>
            <Select
              value={String(newDay)}
              onChange={(e) => setNewDay(Number(e.target.value))}
              className="w-36"
            >
              {DAYS.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Début</Label>
            <Input
              type="time"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              className="w-28"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Fin</Label>
            <Input
              type="time"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
              className="w-28"
            />
          </div>
          <Button onClick={addRule} disabled={loading} size="sm">
            Ajouter
          </Button>
        </div>
      </div>

      {/* Exceptions */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Jours bloqués / congés</h3>
        {exceptions.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucune exception configurée.
          </p>
        )}
        <div className="space-y-2">
          {exceptions.map((ex) => (
            <div
              key={ex.id}
              className="flex items-center gap-3 rounded-md border p-3"
            >
              <span className="flex-1 text-sm">
                {new Date(ex.date + "T12:00:00").toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                {ex.reason && (
                  <span className="text-muted-foreground"> — {ex.reason}</span>
                )}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => deleteException(ex.id)}
              >
                Supprimer
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/50 p-4">
          <div className="space-y-1">
            <Label className="text-xs">Date</Label>
            <Input
              type="date"
              value={newExDate}
              onChange={(e) => setNewExDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Raison (optionnel)</Label>
            <Input
              type="text"
              placeholder="Congés, formation..."
              value={newExReason}
              onChange={(e) => setNewExReason(e.target.value)}
              className="w-48"
            />
          </div>
          <Button onClick={addException} disabled={loading} size="sm">
            Bloquer
          </Button>
        </div>
      </div>
    </div>
  );
}
