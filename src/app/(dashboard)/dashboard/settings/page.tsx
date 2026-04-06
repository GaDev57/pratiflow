import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AvailabilityManager } from "./availability-manager";
import { SubscriptionManager } from "./subscription-manager";
import { GoogleCalendarSection } from "./google-calendar-section";
import { PublicPageEditor } from "./public-page-editor";
import { BookingBranding } from "./booking-branding";
import { SectionsEditor } from "./sections-editor";
import { LayoutEditor } from "./layout-editor";
import type { Testimonial, FaqItem, SocialLinks } from "@/lib/supabase/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.user_metadata?.role !== "practitioner") redirect("/dashboard");

  const { data: practitioner } = await supabase
    .from("practitioners")
    .select("*")
    .eq("profile_id", user.id)
    .single();

  if (!practitioner) redirect("/onboarding");

  const { data: rules } = await supabase
    .from("availability_rules")
    .select("*")
    .eq("practitioner_id", practitioner.id)
    .order("day_of_week");

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

      {/* Public profile */}
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

      {/* Branding (colors, logo, shape) */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Personnalisation visuelle</h2>
        <BookingBranding
          practitionerId={practitioner.id as string}
          initialTheme={(practitioner.booking_theme as string) ?? "default"}
          initialLogoUrl={(practitioner.logo_url as string) ?? ""}
          initialCustomColor={(practitioner.custom_primary_color as string) ?? ""}
          initialLogoShape={(practitioner.logo_shape as string) ?? "round"}
        />
      </section>

      {/* Sections: testimonials, FAQ, social, gallery */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Sections de la page</h2>
        <p className="text-sm text-muted-foreground">
          Ajoutez des témoignages, une FAQ, vos réseaux sociaux et des photos de votre cabinet.
        </p>
        <SectionsEditor
          practitionerId={practitioner.id as string}
          initialTestimonials={(practitioner.testimonials as Testimonial[]) ?? []}
          initialFaq={(practitioner.faq as FaqItem[]) ?? []}
          initialSocialLinks={(practitioner.social_links as SocialLinks) ?? {}}
          initialGalleryImages={(practitioner.gallery_images as string[]) ?? []}
        />
      </section>

      {/* Layout: fonts, sections order, CTA, template */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Mise en page</h2>
        <p className="text-sm text-muted-foreground">
          Choisissez le template, la typographie, l&apos;ordre des sections et le texte du bouton.
        </p>
        <LayoutEditor
          practitionerId={practitioner.id as string}
          initialFontPair={(practitioner.font_pair as string) ?? "modern"}
          initialSectionOrder={(practitioner.section_order as string[]) ?? []}
          initialHiddenSections={(practitioner.hidden_sections as string[]) ?? []}
          initialCtaText={(practitioner.cta_text as string) ?? "Prendre rendez-vous"}
          initialLayoutVariant={(practitioner.layout_variant as string) ?? "classic"}
        />
      </section>

      {/* Availability */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Disponibilités</h2>
        <AvailabilityManager
          practitionerId={practitioner.id}
          initialRules={rules ?? []}
          initialExceptions={exceptions ?? []}
        />
      </section>

      {/* Google Calendar */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Google Calendar</h2>
        <GoogleCalendarSection
          isConnected={!!practitioner.google_calendar_token}
          practitionerId={practitioner.id}
        />
      </section>

      {/* Subscription */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Abonnement</h2>
        <SubscriptionManager
          currentPlan={practitioner.subscription_plan as string}
        />
      </section>
    </div>
  );
}
