"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/rich-text-editor";

interface QuestionnaireField {
  id: string;
  type: "text" | "textarea" | "radio" | "checkbox" | "scale" | "boolean";
  label: string;
  required: boolean;
  options?: string[];
}

interface Props {
  practitionerId: string;
  template?: {
    id: string;
    title: string;
    template_type: string;
    content_json: Record<string, unknown>;
    file_path: string | null;
    is_questionnaire: boolean;
    questionnaire_fields: QuestionnaireField[];
  };
}

const FIELD_TYPES: { value: QuestionnaireField["type"]; label: string }[] = [
  { value: "text", label: "Texte court" },
  { value: "textarea", label: "Texte long" },
  { value: "radio", label: "Choix unique" },
  { value: "checkbox", label: "Choix multiples" },
  { value: "scale", label: "Échelle (1-10)" },
  { value: "boolean", label: "Oui / Non" },
];

export function TemplateEditor({ practitionerId, template }: Props) {
  const router = useRouter();
  const isEdit = !!template;

  const [title, setTitle] = useState(template?.title ?? "");
  const [templateType, setTemplateType] = useState(
    template?.template_type ?? "rich_text"
  );
  const [contentJson, setContentJson] = useState<Record<string, unknown>>(
    template?.content_json ?? {}
  );
  const [fields, setFields] = useState<QuestionnaireField[]>(
    template?.questionnaire_fields ?? []
  );
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addField() {
    setFields([
      ...fields,
      {
        id: crypto.randomUUID().substring(0, 8),
        type: "text",
        label: "",
        required: false,
      },
    ]);
  }

  function updateField(index: number, updates: Partial<QuestionnaireField>) {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  }

  function removeField(index: number) {
    setFields(fields.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    let filePath: string | null = template?.file_path ?? null;

    // Upload PDF if provided
    if (templateType === "pdf" && pdfFile) {
      const safeName = pdfFile.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-");
      const path = `${practitionerId}/templates/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("shared-media")
        .upload(path, pdfFile);
      if (uploadError) {
        setError("Erreur lors de l'upload du PDF");
        setLoading(false);
        return;
      }
      filePath = path;
    }

    const record = {
      practitioner_id: practitionerId,
      title: title.trim(),
      category_id: null,
      template_type: templateType,
      content_json: templateType === "rich_text" ? contentJson : {},
      file_path: filePath,
      file_type: templateType === "pdf" ? "application/pdf" : null,
      is_questionnaire: templateType === "questionnaire",
      questionnaire_fields: templateType === "questionnaire" ? fields : [],
    };

    if (isEdit) {
      const { error: updateError } = await supabase
        .from("document_templates")
        .update(record)
        .eq("id", template.id);
      if (updateError) {
        setError("Erreur lors de la mise à jour : " + updateError.message);
        setLoading(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from("document_templates")
        .insert(record);
      if (insertError) {
        setError("Erreur lors de la création : " + insertError.message);
        setLoading(false);
        return;
      }
    }

    router.push("/dashboard/templates");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label>Titre *</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nom du modèle"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Type de modèle</Label>
        <div className="flex gap-3">
          {[
            { value: "rich_text", label: "Texte riche" },
            { value: "pdf", label: "PDF" },
            { value: "questionnaire", label: "Questionnaire" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTemplateType(opt.value)}
              className={`flex-1 rounded-lg border p-3 text-sm ${
                templateType === opt.value
                  ? "border-primary bg-primary/5 font-medium"
                  : "hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rich text editor */}
      {templateType === "rich_text" && (
        <div className="space-y-2">
          <Label>Contenu</Label>
          <RichTextEditor
            content={
              Object.keys(contentJson).length > 0
                ? JSON.stringify(contentJson)
                : undefined
            }
            onChange={setContentJson}
            placeholder="Rédigez votre modèle de document..."
          />
        </div>
      )}

      {/* PDF upload */}
      {templateType === "pdf" && (
        <div className="space-y-2">
          <Label>Fichier PDF</Label>
          {template?.file_path && !pdfFile && (
            <p className="text-sm text-muted-foreground">
              PDF existant. Chargez un nouveau fichier pour le remplacer.
            </p>
          )}
          <Input
            type="file"
            accept=".pdf"
            onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
          />
        </div>
      )}

      {/* Questionnaire builder */}
      {templateType === "questionnaire" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Champs du questionnaire</Label>
            <Button type="button" variant="ghost" size="sm" onClick={addField}>
              + Ajouter un champ
            </Button>
          </div>

          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucun champ. Cliquez sur &quot;+ Ajouter un champ&quot; pour commencer.
            </p>
          )}

          {fields.map((field, index) => (
            <div key={field.id} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Champ {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeField(index)}
                  className="text-xs text-destructive hover:underline"
                >
                  Supprimer
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Libellé *</Label>
                  <Input
                    value={field.label}
                    onChange={(e) =>
                      updateField(index, { label: e.target.value })
                    }
                    placeholder="Question ou libellé"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={field.type}
                    onChange={(e) =>
                      updateField(index, {
                        type: e.target.value as QuestionnaireField["type"],
                      })
                    }
                  >
                    {FIELD_TYPES.map((ft) => (
                      <option key={ft.value} value={ft.value}>
                        {ft.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {(field.type === "radio" || field.type === "checkbox") && (
                <div className="space-y-1">
                  <Label className="text-xs">Options (une par ligne)</Label>
                  <Textarea
                    value={(field.options ?? []).join("\n")}
                    onChange={(e) =>
                      updateField(index, {
                        options: e.target.value.split("\n").filter(Boolean),
                      })
                    }
                    placeholder={"Option 1\nOption 2\nOption 3"}
                    rows={3}
                  />
                </div>
              )}

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) =>
                    updateField(index, { required: e.target.checked })
                  }
                  className="rounded"
                />
                Obligatoire
              </label>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/dashboard/templates")}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={loading || !title.trim()}>
          {loading
            ? "Enregistrement..."
            : isEdit
              ? "Mettre à jour"
              : "Créer le modèle"}
        </Button>
      </div>
    </form>
  );
}
