"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Props {
  userId: string;
  fullName: string;
}

export function PatientOnboarding({ userId, fullName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

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

    // Create patient record
    const { error: patientError } = await supabase
      .from("patients")
      .insert({
        profile_id: userId,
        date_of_birth: dateOfBirth || null,
      });

    if (patientError) {
      setError("Erreur lors de la création du profil patient.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Complétez votre profil</CardTitle>
        <CardDescription>
          Quelques informations pour finaliser votre inscription
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
            <Label htmlFor="dob">Date de naissance</Label>
            <Input
              id="dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
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
