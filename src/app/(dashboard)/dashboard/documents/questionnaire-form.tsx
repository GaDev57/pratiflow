"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface QuestionnaireField {
  id: string;
  type: "text" | "textarea" | "radio" | "checkbox" | "scale" | "boolean";
  label: string;
  required: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
}

interface Props {
  responseId: string;
  templateTitle: string;
  fields: QuestionnaireField[];
  existingResponses: Record<string, string | string[] | number | boolean>;
  isSubmitted: boolean;
}

export function QuestionnaireForm({
  responseId,
  templateTitle,
  fields,
  existingResponses,
  isSubmitted,
}: Props) {
  const router = useRouter();
  const [responses, setResponses] = useState<
    Record<string, string | string[] | number | boolean>
  >(existingResponses);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function updateResponse(
    fieldId: string,
    value: string | string[] | number | boolean
  ) {
    setResponses({ ...responses, [fieldId]: value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    await supabase
      .from("questionnaire_responses")
      .update({
        responses,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", responseId);

    setSuccess(true);
    setLoading(false);
    router.refresh();
  }

  if (isSubmitted || success) {
    return (
      <div className="rounded-lg border p-6">
        <h3 className="text-lg font-semibold">{templateTitle}</h3>
        <p className="mt-2 text-sm text-green-600">
          Questionnaire soumis avec succès.
        </p>
        <div className="mt-4 space-y-3">
          {fields.map((field) => (
            <div key={field.id}>
              <p className="text-sm font-medium">{field.label}</p>
              <p className="text-sm text-muted-foreground">
                {formatResponse(responses[field.id], field)}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-lg border p-6"
    >
      <h3 className="text-lg font-semibold">{templateTitle}</h3>

      {fields.map((field) => (
        <div key={field.id} className="space-y-2">
          <Label>
            {field.label}
            {field.required && <span className="text-destructive"> *</span>}
          </Label>

          {field.type === "text" && (
            <Input
              value={(responses[field.id] as string) ?? ""}
              onChange={(e) => updateResponse(field.id, e.target.value)}
              required={field.required}
            />
          )}

          {field.type === "textarea" && (
            <Textarea
              value={(responses[field.id] as string) ?? ""}
              onChange={(e) => updateResponse(field.id, e.target.value)}
              required={field.required}
              rows={4}
            />
          )}

          {field.type === "radio" && (
            <div className="space-y-1">
              {(field.options ?? []).map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={field.id}
                    value={opt}
                    checked={responses[field.id] === opt}
                    onChange={() => updateResponse(field.id, opt)}
                    required={field.required}
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}

          {field.type === "checkbox" && (
            <div className="space-y-1">
              {(field.options ?? []).map((opt) => {
                const current = (responses[field.id] as string[]) ?? [];
                return (
                  <label key={opt} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={current.includes(opt)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...current, opt]
                          : current.filter((v) => v !== opt);
                        updateResponse(field.id, next);
                      }}
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          )}

          {field.type === "scale" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">1</span>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => updateResponse(field.id, n)}
                  className={`h-8 w-8 rounded-full border text-sm ${
                    responses[field.id] === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:border-primary"
                  }`}
                >
                  {n}
                </button>
              ))}
              <span className="text-xs text-muted-foreground">10</span>
            </div>
          )}

          {field.type === "boolean" && (
            <div className="flex gap-3">
              {["Oui", "Non"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => updateResponse(field.id, opt === "Oui")}
                  className={`flex-1 rounded-lg border p-2 text-sm ${
                    responses[field.id] === (opt === "Oui")
                      ? "border-primary bg-primary/5 font-medium"
                      : "hover:bg-muted"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <Button type="submit" disabled={loading}>
        {loading ? "Envoi..." : "Soumettre le questionnaire"}
      </Button>
    </form>
  );
}

function formatResponse(
  value: string | string[] | number | boolean | undefined,
  field: QuestionnaireField
): string {
  if (value === undefined || value === null) return "—";
  if (field.type === "boolean") return value ? "Oui" : "Non";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}
