"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface QuestionnaireField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
}

interface SentQuestionnaire {
  id: string;
  responses: Record<string, string | string[] | number | boolean>;
  submitted_at: string | null;
  created_at: string;
  document_templates: {
    title: string;
    template_type: string;
    questionnaire_fields: QuestionnaireField[];
  };
}

interface Props {
  sentQuestionnaires: SentQuestionnaire[];
}

export function SentDocumentsSection({ sentQuestionnaires }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(sentQuestionnaires);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  if (items.length === 0) return null;

  async function handleDelete(id: string) {
    setDeleting(id);
    const supabase = createClient();
    await supabase.from("questionnaire_responses").delete().eq("id", id);
    setItems(items.filter((q) => q.id !== id));
    setDeleting(null);
    router.refresh();
  }

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id);
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Documents envoyés</h2>
      <div className="space-y-2">
        {items.map((q) => {
          const isExpanded = expandedId === q.id;
          const fields = q.document_templates.questionnaire_fields ?? [];
          const hasResponses =
            q.submitted_at && Object.keys(q.responses).length > 0;

          return (
            <div key={q.id} className="rounded-md border">
              {/* Header row */}
              <div className="flex items-center gap-4 px-4 py-3 text-sm">
                <span className="text-lg">
                  {q.document_templates.template_type === "questionnaire"
                    ? "📋"
                    : q.document_templates.template_type === "pdf"
                      ? "📄"
                      : "📝"}
                </span>
                <div className="flex-1">
                  <p className="font-medium">
                    {q.document_templates.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Envoyé le{" "}
                    {new Date(q.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {q.submitted_at ? (
                  <span className="rounded-full border border-green-300 bg-green-100 px-2 py-0.5 text-xs text-green-800">
                    Rempli
                  </span>
                ) : (
                  <span className="rounded-full border border-yellow-300 bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                    En attente
                  </span>
                )}

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => toggleExpand(q.id)}
                  >
                    {isExpanded ? "Fermer" : "Voir"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive"
                    onClick={() => handleDelete(q.id)}
                    disabled={deleting === q.id}
                  >
                    {deleting === q.id ? "..." : "Suppr."}
                  </Button>
                </div>
              </div>

              {/* Expanded: show questionnaire fields & responses */}
              {isExpanded && (
                <div className="border-t bg-muted/20 px-4 py-4">
                  {fields.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucun champ défini dans ce questionnaire.
                    </p>
                  ) : hasResponses ? (
                    <div className="space-y-3">
                      {fields.map((field) => (
                        <div key={field.id}>
                          <p className="text-sm font-medium">{field.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatResponse(q.responses[field.id], field)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Le patient n&apos;a pas encore rempli ce questionnaire.
                      </p>
                      <p className="text-xs font-medium text-muted-foreground">
                        Questions :
                      </p>
                      {fields.map((field, i) => (
                        <div key={field.id} className="text-sm">
                          <span className="text-muted-foreground">
                            {i + 1}.{" "}
                          </span>
                          {field.label}
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({fieldTypeLabel(field.type)})
                          </span>
                          {field.required && (
                            <span className="text-destructive"> *</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function formatResponse(
  value: string | string[] | number | boolean | undefined,
  field: QuestionnaireField
): string {
  if (value === undefined || value === null || value === "") return "— Non renseigné";
  if (field.type === "boolean") return value ? "Oui" : "Non";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function fieldTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    text: "texte court",
    textarea: "texte long",
    radio: "choix unique",
    checkbox: "choix multiples",
    scale: "échelle",
    boolean: "oui/non",
  };
  return labels[type] ?? type;
}
