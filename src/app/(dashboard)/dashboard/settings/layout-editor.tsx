"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FONT_PAIRS, LAYOUT_VARIANTS, ALL_SECTIONS, DEFAULT_SECTION_ORDER } from "@/lib/booking-themes";

interface Props {
  practitionerId: string;
  initialFontPair: string;
  initialSectionOrder: string[];
  initialHiddenSections: string[];
  initialCtaText: string;
  initialLayoutVariant: string;
}

export function LayoutEditor({
  practitionerId,
  initialFontPair,
  initialSectionOrder,
  initialHiddenSections,
  initialCtaText,
  initialLayoutVariant,
}: Props) {
  const router = useRouter();
  const [fontPair, setFontPair] = useState(initialFontPair || "modern");
  const [sectionOrder, setSectionOrder] = useState<string[]>(
    initialSectionOrder.length > 0 ? initialSectionOrder : [...DEFAULT_SECTION_ORDER]
  );
  const [hiddenSections, setHiddenSections] = useState<string[]>(initialHiddenSections);
  const [ctaText, setCtaText] = useState(initialCtaText || "Prendre rendez-vous");
  const [layoutVariant, setLayoutVariant] = useState(initialLayoutVariant || "classic");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function toggleSection(sectionId: string) {
    const section = ALL_SECTIONS.find((s) => s.id === sectionId);
    if (section && "alwaysVisible" in section && section.alwaysVisible) return;
    setHiddenSections((prev) =>
      prev.includes(sectionId) ? prev.filter((s) => s !== sectionId) : [...prev, sectionId]
    );
  }

  function moveSection(index: number, direction: "up" | "down") {
    const newOrder = [...sectionOrder];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setSectionOrder(newOrder);
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("practitioners")
      .update({
        font_pair: fontPair,
        section_order: sectionOrder,
        hidden_sections: hiddenSections,
        cta_text: ctaText.trim() || "Prendre rendez-vous",
        layout_variant: layoutVariant,
      })
      .eq("id", practitionerId);

    if (error) {
      setMessage({ type: "error", text: "Erreur: " + error.message });
    } else {
      setMessage({ type: "success", text: "Mise en page enregistrée" });
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6 rounded-lg border p-6">
      {/* Layout variant */}
      <div className="space-y-3">
        <h3 className="font-medium">Template de page</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {LAYOUT_VARIANTS.map((v) => (
            <button
              key={v.id}
              onClick={() => setLayoutVariant(v.id)}
              className={`rounded-lg border-2 p-4 text-left transition ${
                layoutVariant === v.id ? "border-primary bg-primary/5" : "border-transparent hover:border-muted-foreground/25"
              }`}
            >
              <p className="font-medium">{v.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{v.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div className="space-y-3">
        <h3 className="font-medium">Typographie</h3>
        <div className="grid gap-3 sm:grid-cols-5">
          {FONT_PAIRS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFontPair(f.id)}
              className={`rounded-lg border-2 p-3 text-center transition ${
                fontPair === f.id ? "border-primary bg-primary/5" : "border-transparent hover:border-muted-foreground/25"
              }`}
            >
              <p className={`text-lg font-bold ${f.heading}`}>Aa</p>
              <p className="mt-1 text-[10px] font-medium">{f.name}</p>
              <p className="text-[9px] text-muted-foreground">{f.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* CTA Text */}
      <div className="space-y-2">
        <Label>Texte du bouton principal</Label>
        <Input
          value={ctaText}
          onChange={(e) => setCtaText(e.target.value)}
          placeholder="Prendre rendez-vous"
        />
        <p className="text-xs text-muted-foreground">
          Exemples : &quot;Réserver ma séance&quot;, &quot;Me contacter&quot;, &quot;Prendre RDV&quot;
        </p>
      </div>

      {/* Section order + visibility */}
      <div className="space-y-3">
        <h3 className="font-medium">Ordre et visibilité des sections</h3>
        <div className="space-y-1">
          {sectionOrder.map((sectionId, index) => {
            const section = ALL_SECTIONS.find((s) => s.id === sectionId);
            if (!section) return null;
            const isHidden = hiddenSections.includes(sectionId);
            const isLocked = "alwaysVisible" in section && section.alwaysVisible;
            return (
              <div
                key={sectionId}
                className={`flex items-center gap-3 rounded-lg border p-3 ${isHidden ? "opacity-50" : ""}`}
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveSection(index, "up")}
                    disabled={index === 0}
                    className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(index, "down")}
                    disabled={index === sectionOrder.length - 1}
                    className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                <span className="flex-1 text-sm font-medium">{section.name}</span>
                {isLocked ? (
                  <span className="text-xs text-muted-foreground">Toujours visible</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleSection(sectionId)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      isHidden
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {isHidden ? "Masqué" : "Visible"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Save */}
      {message && (
        <p className={`text-sm ${message.type === "error" ? "text-destructive" : "text-green-600"}`}>{message.text}</p>
      )}
      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Enregistrement..." : "Enregistrer la mise en page"}
      </Button>
    </div>
  );
}
