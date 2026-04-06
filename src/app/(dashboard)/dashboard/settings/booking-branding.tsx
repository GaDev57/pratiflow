"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  BOOKING_THEMES as THEMES,
  LOGO_SHAPES,
  generateGradient,
  type LogoShape,
} from "@/lib/booking-themes";

interface Props {
  practitionerId: string;
  initialTheme: string;
  initialLogoUrl: string;
  initialCustomColor: string;
  initialLogoShape: string;
}

export function BookingBranding({
  practitionerId,
  initialTheme,
  initialLogoUrl,
  initialCustomColor,
  initialLogoShape,
}: Props) {
  const router = useRouter();
  const [theme, setTheme] = useState(initialTheme || "default");
  const [customColor, setCustomColor] = useState(initialCustomColor || "");
  const [useCustomColor, setUseCustomColor] = useState(!!initialCustomColor);
  const [logoShape, setLogoShape] = useState<LogoShape>((initialLogoShape as LogoShape) || "round");
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl || "");
  const [logoPreview, setLogoPreview] = useState(initialLogoUrl || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Seules les images sont acceptées (PNG, JPG, SVG)" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Le fichier ne doit pas dépasser 2 Mo" });
      return;
    }

    setUploading(true);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `logos/${practitionerId}.${ext}`;

    const { error } = await supabase.storage
      .from("public-assets")
      .upload(path, file, { upsert: true });

    if (error) {
      if (error.message.includes("not found") || error.message.includes("Bucket")) {
        setMessage({ type: "error", text: "Le bucket 'public-assets' n'existe pas. Créez-le dans Supabase." });
      } else {
        setMessage({ type: "error", text: "Erreur upload : " + error.message });
      }
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("public-assets").getPublicUrl(path);
    setLogoUrl(urlData.publicUrl);
    setUploading(false);
    setMessage({ type: "success", text: "Logo uploadé" });
  }, [practitionerId]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function selectPreset(presetId: string) {
    setTheme(presetId);
    setUseCustomColor(false);
    setCustomColor("");
  }

  function handleCustomColorChange(color: string) {
    setCustomColor(color);
    setUseCustomColor(true);
    setTheme("custom");
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("practitioners")
      .update({
        booking_theme: useCustomColor ? "custom" : theme,
        logo_url: logoUrl || null,
        custom_primary_color: useCustomColor ? customColor : null,
        custom_secondary_color: null,
        logo_shape: logoShape,
      })
      .eq("id", practitionerId);

    if (error) {
      setMessage({ type: "error", text: "Erreur : " + error.message });
    } else {
      setMessage({ type: "success", text: "Personnalisation enregistrée" });
      router.refresh();
    }
    setSaving(false);
  }

  // Resolve current gradient for preview
  const previewGradient = useCustomColor && customColor
    ? generateGradient(customColor)
    : (THEMES.find((t) => t.id === theme) ?? THEMES[0]).gradient;
  const previewPrimary = useCustomColor && customColor
    ? customColor
    : (THEMES.find((t) => t.id === theme) ?? THEMES[0]).primary;

  // Logo shape classes for preview
  const shapeClass = LOGO_SHAPES.find((s) => s.id === logoShape) ?? LOGO_SHAPES[0];
  const logoSizeClass = logoShape === "rectangle" ? "h-14 w-24" : "h-14 w-14";

  return (
    <div className="space-y-6 rounded-lg border p-6">
      {/* Logo upload */}
      <div className="space-y-3">
        <h3 className="font-medium">Logo du cabinet</h3>
        <div className="flex items-start gap-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex h-32 w-32 flex-shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed transition ${
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onClick={() => document.getElementById("logo-input")?.click()}
          >
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="h-full w-full rounded-xl object-contain p-2" />
            ) : (
              <div className="text-center text-xs text-muted-foreground">
                <p className="text-2xl">+</p>
                <p>Glisser ou cliquer</p>
              </div>
            )}
          </div>
          <input
            id="logo-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileInput}
          />
          <div className="text-sm text-muted-foreground">
            <p>Glissez-déposez votre logo ou cliquez pour le sélectionner.</p>
            <p className="mt-1">Formats : PNG, JPG, SVG. Max 2 Mo.</p>
            {logoUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-destructive"
                onClick={() => { setLogoUrl(""); setLogoPreview(""); }}
              >
                Supprimer le logo
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Logo shape selector */}
      <div className="space-y-3">
        <h3 className="font-medium">Forme du logo</h3>
        <div className="flex gap-3">
          {LOGO_SHAPES.map((shape) => (
            <button
              key={shape.id}
              onClick={() => setLogoShape(shape.id)}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition ${
                logoShape === shape.id
                  ? "border-primary bg-primary/5"
                  : "border-transparent hover:border-muted-foreground/25"
              }`}
            >
              <div
                className={`${shape.className} border-2 border-muted-foreground/30 bg-muted ${
                  shape.id === "rectangle" ? "h-10 w-16" : "h-12 w-12"
                }`}
              />
              <span className="text-xs font-medium">{shape.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color: presets + custom picker */}
      <div className="space-y-3">
        <h3 className="font-medium">Couleur du thème</h3>

        {/* Presets */}
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => selectPreset(t.id)}
              className={`group flex flex-col items-center gap-1.5 rounded-lg p-2 transition ${
                !useCustomColor && theme === t.id ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted"
              }`}
            >
              <div
                className="h-10 w-10 rounded-full shadow-sm"
                style={{ background: t.gradient }}
              />
              <span className="text-[10px] font-medium leading-tight">{t.name}</span>
            </button>
          ))}
        </div>

        {/* Custom color picker */}
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <div className="relative">
            <input
              type="color"
              value={customColor || "#667260"}
              onChange={(e) => handleCustomColorChange(e.target.value)}
              className="h-10 w-10 cursor-pointer rounded-full border-0 bg-transparent p-0"
            />
          </div>
          <div className="flex-1">
            <Label className="text-sm">Couleur personnalisée</Label>
            <div className="flex items-center gap-2">
              <Input
                value={customColor}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^#[0-9a-fA-F]{0,6}$/.test(val)) {
                    setCustomColor(val);
                    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                      setUseCustomColor(true);
                      setTheme("custom");
                    }
                  }
                }}
                placeholder="#667260"
                className="w-28 font-mono text-sm"
              />
              {useCustomColor && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Actif
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <h3 className="font-medium">Aperçu</h3>
        <div
          className="flex h-36 items-center justify-center rounded-lg"
          style={{ background: previewGradient }}
        >
          <div className="flex items-center gap-4 text-white">
            {logoPreview && (
              <img
                src={logoPreview}
                alt="Logo"
                className={`${shapeClass.className} ${logoSizeClass} border-2 border-white/60 bg-white/20 object-contain p-1`}
              />
            )}
            <div>
              <p className="text-lg font-bold">Votre nom</p>
              <p className="text-sm text-white/80">Votre spécialité</p>
              <span
                className="mt-2 inline-block rounded-full px-4 py-1.5 text-xs font-semibold"
                style={{ backgroundColor: "rgba(255,255,255,0.9)", color: previewPrimary }}
              >
                Prendre rendez-vous
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages + Save */}
      {message && (
        <p className={`text-sm ${message.type === "error" ? "text-destructive" : "text-green-600"}`}>
          {message.text}
        </p>
      )}
      <Button onClick={save} disabled={saving || uploading}>
        {saving ? "Enregistrement..." : "Enregistrer la personnalisation"}
      </Button>
    </div>
  );
}
