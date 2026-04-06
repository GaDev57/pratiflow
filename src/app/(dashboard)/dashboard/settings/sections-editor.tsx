"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Testimonial, FaqItem, SocialLinks } from "@/lib/supabase/types";

interface Props {
  practitionerId: string;
  initialTestimonials: Testimonial[];
  initialFaq: FaqItem[];
  initialSocialLinks: SocialLinks;
  initialGalleryImages: string[];
}

export function SectionsEditor({
  practitionerId,
  initialTestimonials,
  initialFaq,
  initialSocialLinks,
  initialGalleryImages,
}: Props) {
  const router = useRouter();
  const [testimonials, setTestimonials] = useState<Testimonial[]>(initialTestimonials);
  const [faq, setFaq] = useState<FaqItem[]>(initialFaq);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(initialSocialLinks);
  const [galleryImages, setGalleryImages] = useState<string[]>(initialGalleryImages);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  // --- Testimonials ---
  function addTestimonial() {
    setTestimonials([...testimonials, { text: "", author: "", rating: 5 }]);
  }
  function updateTestimonial(i: number, updates: Partial<Testimonial>) {
    setTestimonials(testimonials.map((t, idx) => (idx === i ? { ...t, ...updates } : t)));
  }
  function removeTestimonial(i: number) {
    setTestimonials(testimonials.filter((_, idx) => idx !== i));
  }

  // --- FAQ ---
  function addFaq() {
    setFaq([...faq, { question: "", answer: "" }]);
  }
  function updateFaq(i: number, updates: Partial<FaqItem>) {
    setFaq(faq.map((f, idx) => (idx === i ? { ...f, ...updates } : f)));
  }
  function removeFaq(i: number) {
    setFaq(faq.filter((_, idx) => idx !== i));
  }

  // --- Gallery ---
  const handleGalleryUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image max 5 Mo" });
      return;
    }
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `gallery/${practitionerId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("public-assets").upload(path, file, { upsert: true });
    if (error) {
      setMessage({ type: "error", text: "Erreur upload: " + error.message });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("public-assets").getPublicUrl(path);
    setGalleryImages([...galleryImages, urlData.publicUrl]);
    setUploading(false);
  }, [practitionerId, galleryImages]);

  function removeGalleryImage(i: number) {
    setGalleryImages(galleryImages.filter((_, idx) => idx !== i));
  }

  // --- Save ---
  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("practitioners")
      .update({
        testimonials: testimonials.filter((t) => t.text.trim() && t.author.trim()),
        faq: faq.filter((f) => f.question.trim() && f.answer.trim()),
        social_links: socialLinks,
        gallery_images: galleryImages,
      })
      .eq("id", practitionerId);

    if (error) {
      setMessage({ type: "error", text: "Erreur: " + error.message });
    } else {
      setMessage({ type: "success", text: "Sections enregistrées" });
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <div className="space-y-8">
      {/* Testimonials */}
      <div className="space-y-3 rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Témoignages patients</h3>
          <Button type="button" variant="ghost" size="sm" onClick={addTestimonial}>
            + Ajouter
          </Button>
        </div>
        {testimonials.map((t, i) => (
          <div key={i} className="flex gap-3 rounded-lg border p-3">
            <div className="flex-1 space-y-2">
              <Textarea
                value={t.text}
                onChange={(e) => updateTestimonial(i, { text: e.target.value })}
                placeholder="&quot;Grâce à ses séances, j'ai retrouvé confiance en moi...&quot;"
                rows={2}
              />
              <div className="flex gap-2">
                <Input
                  value={t.author}
                  onChange={(e) => updateTestimonial(i, { author: e.target.value })}
                  placeholder="Prénom du patient"
                  className="flex-1"
                />
                <select
                  value={t.rating}
                  onChange={(e) => updateTestimonial(i, { rating: Number(e.target.value) })}
                  className="rounded-md border bg-background px-2 text-sm"
                >
                  {[5, 4, 3, 2, 1].map((r) => (
                    <option key={r} value={r}>{"★".repeat(r)}{"☆".repeat(5 - r)}</option>
                  ))}
                </select>
              </div>
            </div>
            <button type="button" onClick={() => removeTestimonial(i)} className="self-start text-sm text-destructive hover:underline">×</button>
          </div>
        ))}
        {testimonials.length === 0 && (
          <p className="text-sm text-muted-foreground">Ajoutez des témoignages pour rassurer vos futurs patients.</p>
        )}
      </div>

      {/* FAQ */}
      <div className="space-y-3 rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Questions fréquentes (FAQ)</h3>
          <Button type="button" variant="ghost" size="sm" onClick={addFaq}>
            + Ajouter
          </Button>
        </div>
        {faq.map((f, i) => (
          <div key={i} className="flex gap-3 rounded-lg border p-3">
            <div className="flex-1 space-y-2">
              <Input
                value={f.question}
                onChange={(e) => updateFaq(i, { question: e.target.value })}
                placeholder="Comment se déroule une première séance ?"
              />
              <Textarea
                value={f.answer}
                onChange={(e) => updateFaq(i, { answer: e.target.value })}
                placeholder="La première séance dure environ 1h et permet de..."
                rows={2}
              />
            </div>
            <button type="button" onClick={() => removeFaq(i)} className="self-start text-sm text-destructive hover:underline">×</button>
          </div>
        ))}
        {faq.length === 0 && (
          <p className="text-sm text-muted-foreground">Ajoutez les questions les plus courantes de vos patients.</p>
        )}
      </div>

      {/* Social Links */}
      <div className="space-y-3 rounded-lg border p-6">
        <h3 className="font-medium">Liens et réseaux sociaux</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Site web</Label>
            <Input
              value={socialLinks.website ?? ""}
              onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value || undefined })}
              placeholder="https://mon-cabinet.fr"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Instagram</Label>
            <Input
              value={socialLinks.instagram ?? ""}
              onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value || undefined })}
              placeholder="https://instagram.com/mon_cabinet"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">LinkedIn</Label>
            <Input
              value={socialLinks.linkedin ?? ""}
              onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value || undefined })}
              placeholder="https://linkedin.com/in/mon-profil"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Doctolib</Label>
            <Input
              value={socialLinks.doctolib ?? ""}
              onChange={(e) => setSocialLinks({ ...socialLinks, doctolib: e.target.value || undefined })}
              placeholder="https://doctolib.fr/mon-profil"
            />
          </div>
        </div>
      </div>

      {/* Gallery */}
      <div className="space-y-3 rounded-lg border p-6">
        <h3 className="font-medium">Galerie photos du cabinet</h3>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {galleryImages.map((url, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border">
              <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeGalleryImage(i)}
                className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white opacity-0 transition group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
          <label
            className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50"
          >
            <div className="text-center text-xs text-muted-foreground">
              <p className="text-2xl">+</p>
              <p>Photo</p>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleGalleryUpload(f); }}
            />
          </label>
        </div>
        {uploading && <p className="text-sm text-muted-foreground">Upload en cours...</p>}
        <p className="text-xs text-muted-foreground">Photos de votre cabinet, salle d&apos;attente, espace de consultation. Max 5 Mo par image.</p>
      </div>

      {/* Save */}
      {message && (
        <p className={`text-sm ${message.type === "error" ? "text-destructive" : "text-green-600"}`}>{message.text}</p>
      )}
      <Button onClick={handleSave} disabled={saving || uploading}>
        {saving ? "Enregistrement..." : "Enregistrer les sections"}
      </Button>
    </div>
  );
}
