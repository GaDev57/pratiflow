"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { RichTextEditor, RichTextViewer } from "@/components/rich-text-editor";

interface SharedNote {
  id: string;
  appointment_id: string;
  content_json: Record<string, unknown>;
  is_visible_to_patient: boolean;
  created_at: string;
}

interface Props {
  practitionerId: string;
  patientId: string;
  appointments: { id: string; start_at: string }[];
  initialNotes: SharedNote[];
}

export function SharedNotesSection({
  practitionerId,
  patientId,
  appointments,
  initialNotes,
}: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState<SharedNote[]>(initialNotes);
  const [selectedAppointment, setSelectedAppointment] = useState(
    appointments[0]?.id ?? ""
  );
  const [editorContent, setEditorContent] = useState<Record<string, unknown>>(
    {}
  );
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  async function saveNote() {
    if (!selectedAppointment) return;
    setSaving(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("shared_notes")
      .insert({
        appointment_id: selectedAppointment,
        practitioner_id: practitionerId,
        patient_id: patientId,
        content_json: editorContent,
        is_visible_to_patient: false,
      })
      .select()
      .single();

    if (!error && data) {
      setNotes([data as unknown as SharedNote, ...notes]);
      setEditorContent({});
      setShowEditor(false);
    }
    setSaving(false);
  }

  async function toggleVisibility(noteId: string, current: boolean) {
    const supabase = createClient();
    await supabase
      .from("shared_notes")
      .update({ is_visible_to_patient: !current })
      .eq("id", noteId);

    setNotes(
      notes.map((n) =>
        n.id === noteId ? { ...n, is_visible_to_patient: !current } : n
      )
    );
    router.refresh();
  }

  async function deleteNote(noteId: string) {
    const supabase = createClient();
    await supabase.from("shared_notes").delete().eq("id", noteId);
    setNotes(notes.filter((n) => n.id !== noteId));
    router.refresh();
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Notes partagées</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowEditor(!showEditor)}
        >
          {showEditor ? "Annuler" : "Nouvelle note partagée"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Vous décidez quelles notes sont visibles par le patient.
      </p>

      {showEditor && (
        <div className="space-y-3 rounded-lg border bg-blue-50/50 p-4">
          <div className="space-y-1">
            <label className="text-xs font-medium">Séance associée</label>
            <Select
              value={selectedAppointment}
              onChange={(e) => setSelectedAppointment(e.target.value)}
            >
              {appointments.map((apt) => (
                <option key={apt.id} value={apt.id}>
                  {new Date(apt.start_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </option>
              ))}
            </Select>
          </div>
          <RichTextEditor
            onChange={setEditorContent}
            placeholder="Exercices, recommandations, suivi..."
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={saveNote} disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer (masqué)"}
            </Button>
            <p className="text-xs text-muted-foreground self-center">
              La note sera créée masquée. Rendez-la visible ci-dessous.
            </p>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune note partagée.
        </p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const apt = appointments.find(
              (a) => a.id === note.appointment_id
            );
            return (
              <div
                key={note.id}
                className={`rounded-lg border p-4 ${
                  note.is_visible_to_patient
                    ? "border-blue-200 bg-blue-50/30"
                    : ""
                }`}
              >
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Séance du{" "}
                    {apt
                      ? new Date(apt.start_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto py-0 text-xs"
                      onClick={() =>
                        toggleVisibility(note.id, note.is_visible_to_patient)
                      }
                    >
                      {note.is_visible_to_patient
                        ? "✓ Visible — Masquer"
                        : "Masqué — Rendre visible"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto py-0 text-xs text-destructive"
                      onClick={() => deleteNote(note.id)}
                    >
                      Suppr.
                    </Button>
                  </div>
                </div>
                <RichTextViewer content={note.content_json} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
