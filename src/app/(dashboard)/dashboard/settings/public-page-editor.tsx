"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Service {
  title: string;
  description: string;
}

interface Props {
  practitionerId: string;
  initialBio: string;
  initialAddress: string;
  initialServices: Service[];
  initialHeroImage: string;
}

export function PublicPageEditor({
  practitionerId,
  initialBio,
  initialAddress,
  initialServices,
  initialHeroImage,
}: Props) {
  const router = useRouter();
  const [bio, setBio] = useState(initialBio);
  const [address, setAddress] = useState(initialAddress);
  const [heroImage, setHeroImage] = useState(initialHeroImage);
  const [heroPreview, setHeroPreview] = useState(initialHeroImage);
  const [services, setServices] = useState<Service[]>(initialServices);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleHeroFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("Seules les images sont acceptées (PNG, JPG, WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Le fichier ne doit pas dépasser 5 Mo");
      return;
    }

    setUploading(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (e) => setHeroPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `heroes/${practitionerId}.${ext}`;

    const { error } = await supabase.storage
      .from("public-assets")
      .upload(path, file, { upsert: true });

    if (error) {
      setUploadError("Erreur upload : " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("public-assets").getPublicUrl(path);
    setHeroImage(urlData.publicUrl);
    setUploading(false);
  }, [practitionerId]);

  function handleHeroDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleHeroFile(file);
  }

  function addService() {
    setServices([...services, { title: "", description: "" }]);
  }

  function updateService(index: number, updates: Partial<Service>) {
    setServices(
      services.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  }

  function removeService(index: number) {
    setServices(services.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    const supabase = createClient();
    await supabase
      .from("practitioners")
      .update({
        bio,
        address: address || null,
        hero_image_url: heroImage || null,
        services: services.filter((s) => s.title.trim()),
      })
      .eq("id", practitionerId);

    setSaving(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-6">
      {/* Hero image upload */}
      <div className="space-y-2">
        <Label>Image de couverture</Label>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleHeroDrop}
          onClick={() => document.getElementById("hero-input")?.click()}
          className={`relative flex h-48 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition ${
            dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
          }`}
        >
          {heroPreview ? (
            <>
              <img src={heroPreview} alt="Aperçu héro" className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition hover:opacity-100">
                <span className="rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-gray-800">
                  Changer l&apos;image
                </span>
              </div>
            </>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              <p className="text-3xl">+</p>
              <p>Glissez ou cliquez pour ajouter une image de couverture</p>
              <p className="mt-1 text-xs">PNG, JPG, WebP — Max 5 Mo — Recommandé : 1920x600</p>
            </div>
          )}
        </div>
        <input
          id="hero-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleHeroFile(f); }}
        />
        {heroImage && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => { setHeroImage(""); setHeroPreview(""); }}
          >
            Supprimer l&apos;image
          </Button>
        )}
        {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
        {uploading && <p className="text-sm text-muted-foreground">Upload en cours...</p>}
      </div>

      <div className="space-y-2">
        <Label>Biographie</Label>
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={5}
          placeholder="Décrivez votre parcours, votre approche thérapeutique..."
        />
      </div>

      <div className="space-y-2">
        <Label>Adresse du cabinet</Label>
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="12 rue de la Paix, 75002 Paris"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Approches / Services</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addService}>
            + Ajouter
          </Button>
        </div>

        {services.map((service, index) => (
          <div key={index} className="flex gap-3 rounded-lg border p-3">
            <div className="flex-1 space-y-2">
              <Input
                value={service.title}
                onChange={(e) =>
                  updateService(index, { title: e.target.value })
                }
                placeholder="Titre (ex: Hypnose Ericksonienne)"
              />
              <Textarea
                value={service.description}
                onChange={(e) =>
                  updateService(index, { description: e.target.value })
                }
                placeholder="Description courte de l'approche..."
                rows={2}
              />
            </div>
            <button
              type="button"
              onClick={() => removeService(index)}
              className="self-start text-sm text-destructive hover:underline"
            >
              ×
            </button>
          </div>
        ))}

        {services.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucune approche définie. Ajoutez vos services pour enrichir votre
            page publique.
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving || uploading}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
        {saved && (
          <span className="text-sm text-green-600">Modifications sauvegardées</span>
        )}
      </div>
    </div>
  );
}
