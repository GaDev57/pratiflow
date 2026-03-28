import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountActions } from "./account-actions";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, gdpr_consent_at, role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as string) ?? user.user_metadata?.role;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Mon compte</h1>
        <p className="text-muted-foreground">
          Gérez vos informations personnelles et vos données
        </p>
      </div>

      {/* Profile info */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Informations personnelles</h2>
        <div className="rounded-lg border p-4 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nom</span>
            <span>{profile?.full_name as string}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span>{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Téléphone</span>
            <span>{(profile?.phone as string) || "Non renseigné"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rôle</span>
            <span>
              {role === "practitioner" ? "Praticien" : "Patient"}
            </span>
          </div>
        </div>
      </section>

      {/* RGPD Consent */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Consentement RGPD</h2>
        <div className="rounded-lg border p-4 text-sm">
          {profile?.gdpr_consent_at ? (
            <p className="text-green-600">
              ✓ Consentement enregistré le{" "}
              {new Date(
                profile.gdpr_consent_at as string
              ).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          ) : (
            <p className="text-yellow-600">
              Consentement non enregistré. Veuillez mettre à jour vos
              préférences.
            </p>
          )}
        </div>
      </section>

      {/* Data actions */}
      <AccountActions isPatient={role === "patient"} />
    </div>
  );
}
