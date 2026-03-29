"use client";

import { useState } from "react";
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
  const [services, setServices] = useState<Service[]>(initialServices);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
      <div className="space-y-2">
        <Label>Image héro (URL)</Label>
        <Input
          value={heroImage}
          onChange={(e) => setHeroImage(e.target.value)}
          placeholder="https://exemple.com/image.jpg"
        />
        <p className="text-xs text-muted-foreground">
          Image de fond pour la section héro de votre page publique
        </p>
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
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
        {saved && (
          <span className="text-sm text-green-600">Modifications sauvegardées</span>
        )}
      </div>
    </div>
  );
}
