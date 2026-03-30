import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AvailabilityManager } from "./availability-manager";
import { SubscriptionManager } from "./subscription-manager";
import { GoogleCalendarSection } from "./google-calendar-section";
import { PublicPageEditor } from "./public-page-editor";
import { BookingBranding } from "./booking-branding";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.user_metadata?.role !== "practitioner") redirect("/dashboard");

  // Fetch practitioner
  const { data: practitioner } = await supabase
    .from("practitioners")
    .select("*")
    .eq("profile_id", user.id)
    .single();

  if (!practitioner) redirect("/onboarding");

  // Fetch existing rules
  const { data: rules } = await supabase
    .from("availability_rules")
    .select("*")
    .eq("practitioner_id", practitioner.id)
    .order("day_of_week");

  // Fetch exceptions
  const { data: exceptions } = await supabase
    .from("availability_exceptions")
    .select("*")
    .eq("practitioner_id", practitioner.id)
    .gte("date", new Date().toISOString().substring(0, 10))
    .order("date");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez vos disponibilités et votre profil public
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Profil public</h2>
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          <p>
            Votre page de réservation :{" "}
            <a
              href={`/book/${practitioner.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded bg-muted px-1.5 py-0.5 font-mono hover:underline"
            >
              /book/{practitioner.slug} ↗
            </a>
          </p>
          <p className="mt-1">
            Spécialité : {practitioner.specialty} — Tarif : {practitioner.consultation_price}€
          </p>
        </div>
        <PublicPageEditor
          practitionerId={practitioner.id as string}
          initialBio={(practitioner.bio as string) ?? ""}
          initialAddress={(practitioner.address as string) ?? ""}
          initialServices={
            ((practitioner.services as { title: string; description: string }[]) ?? [])
          }
          initialHeroImage={(practitioner.hero_image_url as string) ?? ""}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Personnalisation de la page de réservation</h2>
        <BookingBranding
          practitionerId={practitioner.id as string}
          initialTheme={(practitioner.booking_theme as string) ?? "default"}
          initialLogoUrl={(practitioner.logo_url as string) ?? ""}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Disponibilités</h2>
        <AvailabilityManager
          practitionerId={practitioner.id}
          initialRules={rules ?? []}
          initialExceptions={exceptions ?? []}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Google Calendar</h2>
        <GoogleCalendarSection
          isConnected={!!practitioner.google_calendar_token}
          practitionerId={practitioner.id}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Abonnement</h2>
        <SubscriptionManager
          currentPlan={practitioner.subscription_plan as string}
        />
      </section>
    </div>
  );
}
