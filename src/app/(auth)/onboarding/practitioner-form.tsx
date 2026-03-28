"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SPECIALTIES = [
  "Psychologue",
  "Psychiatre",
  "Thérapeute",
  "Kinésithérapeute",
  "Ostéopathe",
  "Médecin généraliste",
  "Coach bien-être",
  "Nutritionniste",
  "Diététicien(ne)",
  "Sophrologue",
  "Hypnothérapeute",
  "Autre",
];

interface Props {
  userId: string;
  fullName: string;
}

export function PractitionerOnboarding({ userId, fullName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [specialty, setSpecialty] = useState("");
  const [rppsNumber, setRppsNumber] = useState("");
  const [bio, setBio] = useState("");
  const [price, setPrice] = useState("60");
  const [phone, setPhone] = useState("");

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const slug = generateSlug(fullName) + "-" + Date.now().toString(36);

    // Update profile (already created by trigger on signup)
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        phone: phone || null,
        gdpr_consent_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileError) {
      setError("Erreur lors de la mise à jour du profil.");
      setLoading(false);
      return;
    }

    // Create practitioner record
    const { error: practitionerError } = await supabase
      .from("practitioners")
      .insert({
        profile_id: userId,
        slug,
        specialty,
        rpps_number: rppsNumber || null,
        bio: bio || null,
        consultation_price: parseFloat(price),
        session_durations: [30, 45, 60],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

    if (practitionerError) {
      setError("Erreur lors de la création du profil praticien.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Configurez votre cabinet</CardTitle>
        <CardDescription>
          Complétez votre profil pour commencer à recevoir des rendez-vous
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="specialty">Spécialité</Label>
            <Select
              id="specialty"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              required
            >
              <option value="">Sélectionnez votre spécialité</option>
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rpps">Numéro RPPS (optionnel)</Label>
            <Input
              id="rpps"
              type="text"
              placeholder="Ex: 12345678901"
              value={rppsNumber}
              onChange={(e) => setRppsNumber(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+33 6 12 34 56 78"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Présentation</Label>
            <Textarea
              id="bio"
              placeholder="Décrivez votre pratique, votre approche..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Tarif de consultation (EUR)</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enregistrement..." : "Commencer"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
