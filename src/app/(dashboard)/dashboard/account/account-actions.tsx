"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

interface Props {
  isPatient: boolean;
}

export function AccountActions({ isPatient }: Props) {
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentUpdating, setConsentUpdating] = useState(false);

  async function updateConsent() {
    setConsentUpdating(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({ gdpr_consent_at: new Date().toISOString() })
      .eq("id", user.id);

    setConsentUpdating(false);
    router.refresh();
  }

  async function withdrawConsent() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({ gdpr_consent_at: null })
      .eq("id", user.id);

    router.refresh();
  }

  async function handleDeleteAccount() {
    if (confirmation !== "SUPPRIMER MON COMPTE") {
      setError("Le texte de confirmation ne correspond pas.");
      return;
    }

    setDeleting(true);
    setError(null);

    const res = await fetch("/api/gdpr/anonymize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erreur lors de la suppression.");
      setDeleting(false);
      return;
    }

    // Sign out and redirect
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/?deleted=true");
  }

  return (
    <>
      {/* Consent management */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Gestion du consentement</h2>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={updateConsent}
            disabled={consentUpdating}
          >
            {consentUpdating
              ? "Mise à jour..."
              : "Renouveler mon consentement"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={withdrawConsent}
          >
            Retirer mon consentement
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:underline">
            Consulter la politique de confidentialité →
          </Link>
        </p>
      </section>

      {/* Data portability */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Portabilité des données</h2>
        <p className="text-sm text-muted-foreground">
          Téléchargez une copie de toutes vos données personnelles au format
          JSON.
        </p>
        <a
          href="/api/gdpr/export"
          download
          className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
        >
          Exporter mes données
        </a>
      </section>

      {/* Account deletion */}
      {isPatient && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-destructive">
            Suppression du compte
          </h2>
          <p className="text-sm text-muted-foreground">
            Cette action est irréversible. Toutes vos données personnelles
            seront anonymisées ou supprimées conformément au RGPD.
          </p>

          {!showDelete ? (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive"
              onClick={() => setShowDelete(true)}
            >
              Supprimer mon compte
            </Button>
          ) : (
            <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-sm">
                  Tapez{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    SUPPRIMER MON COMPTE
                  </code>{" "}
                  pour confirmer
                </Label>
                <Input
                  id="confirm"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder="SUPPRIMER MON COMPTE"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteAccount}
                  disabled={
                    deleting || confirmation !== "SUPPRIMER MON COMPTE"
                  }
                >
                  {deleting
                    ? "Suppression en cours..."
                    : "Confirmer la suppression"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDelete(false);
                    setConfirmation("");
                    setError(null);
                  }}
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
}
