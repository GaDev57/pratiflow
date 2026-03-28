"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { RichTextEditor, RichTextViewer } from "@/components/rich-text-editor";

interface Note {
  id: string;
  appointment_id: string;
  content_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface Props {
  practitionerId: string;
  appointments: { id: string; start_at: string }[];
  initialNotes: Note[];
}

export function PrivateNotesSection({
  practitionerId,
  appointments,
  initialNotes,
}: Props) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [selectedAppointment, setSelectedAppointment] = useState(
    appointments[0]?.id ?? ""
  );
  const [editorContent, setEditorContent] = useState<Record<string, unknown>>(
    {}
  );
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  async function saveNote() {
    if (!selectedAppointment || !editorContent) return;
    setSaving(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("private_notes")
      .insert({
        appointment_id: selectedAppointment,
        practitioner_id: practitionerId,
        content_json: editorContent,
      })
      .select()
      .single();

    if (!error && data) {
      setNotes([data as unknown as Note, ...notes]);
      setEditorContent({});
      setShowEditor(false);
    }
    setSaving(false);
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Notes privées</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowEditor(!showEditor)}
        >
          {showEditor ? "Annuler" : "Nouvelle note"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Ces notes ne sont visibles que par vous.
      </p>

      {showEditor && (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
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
            placeholder="Vos observations, notes cliniques..."
          />
          <Button size="sm" onClick={saveNote} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      )}

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune note privée.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const apt = appointments.find(
              (a) => a.id === note.appointment_id
            );
            return (
              <div key={note.id} className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Séance du{" "}
                    {apt
                      ? new Date(apt.start_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </span>
                  <span>
                    {new Date(note.updated_at).toLocaleDateString("fr-FR")}
                  </span>
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
