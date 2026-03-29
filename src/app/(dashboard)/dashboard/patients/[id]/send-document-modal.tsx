"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Props {
  practitionerId: string;
  patientId: string;
  onClose: () => void;
}

interface Template {
  id: string;
  title: string;
  template_type: string;
  is_questionnaire: boolean;
}

export function SendDocumentModal({
  practitionerId,
  patientId,
  onClose,
}: Props) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("document_templates")
        .select("id, title, template_type, is_questionnaire")
        .eq("practitioner_id", practitionerId)
        .order("title");
      setTemplates((data ?? []) as Template[]);
    }
    load();
  }, [practitionerId]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  async function handleSend() {
    if (!selectedTemplate) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();

    if (selectedTemplate.is_questionnaire) {
      const { error: insertError } = await supabase
        .from("questionnaire_responses")
        .insert({
          template_id: selectedTemplate.id,
          patient_id: patientId,
          practitioner_id: practitionerId,
          responses: {},
        });

      if (insertError) {
        setError("Erreur lors de l'envoi du questionnaire : " + insertError.message);
        setLoading(false);
        return;
      }
    } else {
      const { data: fullTemplate } = await supabase
        .from("document_templates")
        .select("content_json, file_path")
        .eq("id", selectedTemplate.id)
        .single();

      if (selectedTemplate.template_type === "pdf" && fullTemplate?.file_path) {
        const { error: mediaError } = await supabase
          .from("shared_media")
          .insert({
            patient_id: patientId,
            practitioner_id: practitionerId,
            uploader_id: (await supabase.auth.getUser()).data.user?.id,
            file_path: fullTemplate.file_path as string,
            file_type: "application/pdf",
            file_name: selectedTemplate.title + ".pdf",
            size_bytes: 0,
            is_visible_to_patient: true,
          });

        if (mediaError) {
          setError("Erreur lors du partage du PDF : " + mediaError.message);
          setLoading(false);
          return;
        }
      } else {
        const { data: latestApt } = await supabase
          .from("appointments")
          .select("id")
          .eq("practitioner_id", practitionerId)
          .eq("patient_id", patientId)
          .order("start_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!latestApt) {
          setError(
            "Créez d'abord un rendez-vous avec ce patient pour partager un document texte."
          );
          setLoading(false);
          return;
        }

        const { error: noteError } = await supabase
          .from("shared_notes")
          .insert({
            appointment_id: latestApt.id,
            practitioner_id: practitionerId,
            patient_id: patientId,
            content_json: fullTemplate?.content_json ?? {},
            is_visible_to_patient: true,
          });

        if (noteError) {
          setError("Erreur lors du partage du document : " + noteError.message);
          setLoading(false);
          return;
        }
      }
    }

    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">Envoyer un document</h2>

        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Modèle *</Label>
            <Select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
            >
              <option value="">Choisir un modèle</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.title}{" "}
                  {tpl.is_questionnaire
                    ? "(Questionnaire)"
                    : tpl.template_type === "pdf"
                      ? "(PDF)"
                      : "(Texte)"}
                </option>
              ))}
            </Select>
          </div>

          {templates.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucun modèle disponible. Créez-en un dans la section Modèles.
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" className="flex-1" onClick={onClose}>
              Annuler
            </Button>
            <Button
              className="flex-1"
              onClick={handleSend}
              disabled={loading || !selectedTemplateId}
            >
              {loading ? "Envoi..." : "Envoyer au patient"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
