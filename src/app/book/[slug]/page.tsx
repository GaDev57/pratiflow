import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingWidget } from "./booking-widget";
import { resolveTheme, getLogoShapeClass, getFontClasses, DEFAULT_SECTION_ORDER } from "@/lib/booking-themes";
import type { Testimonial, FaqItem, SocialLinks } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

interface Service {
  title: string;
  description: string;
}

export default async function BookingPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: practitioner } = await supabase
    .from("practitioners")
    .select("*, profiles!inner(full_name, avatar_url)")
    .eq("slug", slug)
    .single();

  if (!practitioner) notFound();

  const { data: rules } = await supabase
    .from("availability_rules")
    .select("day_of_week, start_time, end_time, is_active")
    .eq("practitioner_id", practitioner.id)
    .eq("is_active", true);

  const today = new Date().toISOString().substring(0, 10);
  const { data: exceptions } = await supabase
    .from("availability_exceptions")
    .select("date, start_time, end_time")
    .eq("practitioner_id", practitioner.id)
    .gte("date", today);

  // --- Data extraction ---
  const profile = practitioner.profiles as { full_name: string; avatar_url: string | null };
  const services = (practitioner.services ?? []) as Service[];
  const address = practitioner.address as string | null;
  const rawHeroImage = practitioner.hero_image_url as string | null;
  const heroImage = rawHeroImage?.startsWith("http") ? rawHeroImage : null;
  const sessionDurations = practitioner.session_durations as number[];
  const logoUrl = practitioner.logo_url as string | null;
  const logoShape = (practitioner.logo_shape as string) ?? "round";
  const customColor = practitioner.custom_primary_color as string | null;
  const theme = resolveTheme((practitioner.booking_theme as string) ?? "default", customColor);
  const logoClasses = getLogoShapeClass(logoShape);

  // Level 2
  const testimonials = (practitioner.testimonials ?? []) as Testimonial[];
  const faq = (practitioner.faq ?? []) as FaqItem[];
  const socialLinks = (practitioner.social_links ?? {}) as SocialLinks;
  const galleryImages = (practitioner.gallery_images ?? []) as string[];

  // Level 3
  const fonts = getFontClasses((practitioner.font_pair as string) ?? "modern");
  const sectionOrder = (practitioner.section_order as string[]) ?? [...DEFAULT_SECTION_ORDER];
  const hiddenSections = (practitioner.hidden_sections as string[]) ?? [];
  const ctaText = (practitioner.cta_text as string) || "Prendre rendez-vous";
  const layout = (practitioner.layout_variant as string) ?? "classic";

  const layoutConfig = {
    compact: { heroHeight: "min-h-[300px]", container: "max-w-3xl", sectionPadding: "py-10", headingGap: "" },
    modern:  { heroHeight: "min-h-[350px]", container: "max-w-4xl", sectionPadding: "py-12", headingGap: "space-y-2" },
    classic: { heroHeight: "min-h-[400px]", container: "max-w-5xl", sectionPadding: "py-16", headingGap: "" },
  };
  const lc = layoutConfig[layout as keyof typeof layoutConfig] ?? layoutConfig.classic;

  const isVisible = (id: string) => !hiddenSections.includes(id);

  // --- Section renderers ---
  const sectionMap: Record<string, React.ReactNode> = {
    hero: (
      <section
        key="hero"
        className={`relative flex items-center justify-center bg-cover bg-center ${lc.heroHeight}`}
        style={{
          background: heroImage
            ? `url(${heroImage}) center/cover no-repeat, ${theme.gradient}`
            : theme.gradient,
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 text-center text-white">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`Logo ${profile.full_name}`}
              className={`mx-auto mb-6 ${logoClasses.size} ${logoClasses.container} border-4 border-white/80 bg-white/20 object-contain p-2 shadow-lg`}
            />
          ) : profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="mx-auto mb-6 h-32 w-32 rounded-full border-4 border-white/80 object-cover shadow-lg"
            />
          ) : null}
          <h1 className={`text-4xl font-bold tracking-tight sm:text-5xl ${fonts.heading}`}>
            {profile.full_name}
          </h1>
          <p className="mt-3 text-xl text-white/90">{practitioner.specialty}</p>
          {/* Social links in hero */}
          {Object.values(socialLinks).some(Boolean) && (
            <div className="mt-4 flex justify-center gap-3">
              {socialLinks.website && (
                <a href={socialLinks.website} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white/20 px-3 py-1 text-xs text-white hover:bg-white/30">Site web</a>
              )}
              {socialLinks.instagram && (
                <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white/20 px-3 py-1 text-xs text-white hover:bg-white/30">Instagram</a>
              )}
              {socialLinks.linkedin && (
                <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white/20 px-3 py-1 text-xs text-white hover:bg-white/30">LinkedIn</a>
              )}
              {socialLinks.doctolib && (
                <a href={socialLinks.doctolib} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white/20 px-3 py-1 text-xs text-white hover:bg-white/30">Doctolib</a>
              )}
            </div>
          )}
          <a
            href="#booking"
            className="mt-6 inline-block rounded-full px-8 py-3 text-sm font-semibold shadow-md transition hover:opacity-90"
            style={{ backgroundColor: "rgba(255,255,255,0.9)", color: theme.primary }}
          >
            {ctaText}
          </a>
        </div>
      </section>
    ),

    about: practitioner.bio ? (
      <section key="about" className={lc.sectionPadding}>
        <div className="grid items-center gap-10 md:grid-cols-3">
          {profile.avatar_url && (
            <div className="flex justify-center md:col-span-1">
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="h-60 w-60 rounded-full border-[6px] border-muted object-cover"
              />
            </div>
          )}
          <div className={`${profile.avatar_url ? "md:col-span-2" : "md:col-span-3"} ${lc.headingGap}`}>
            <h2 className={`text-2xl font-bold ${fonts.heading}`}>À propos</h2>
            <p className={`mt-4 whitespace-pre-line leading-relaxed text-muted-foreground ${fonts.body}`}>
              {practitioner.bio}
            </p>
          </div>
        </div>
      </section>
    ) : null,

    services: services.length > 0 ? (
      <section key="services" className={`border-t ${lc.sectionPadding}`}>
        <h2 className={`text-center text-2xl font-bold ${fonts.heading}`}>Mes approches</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <div key={index} className="rounded-xl border bg-card p-6 shadow-sm transition hover:shadow-md">
              <h3 className={`text-lg font-semibold ${fonts.heading}`}>{service.title}</h3>
              <p className={`mt-2 text-sm leading-relaxed text-muted-foreground ${fonts.body}`}>{service.description}</p>
            </div>
          ))}
        </div>
      </section>
    ) : null,

    testimonials: testimonials.length > 0 ? (
      <section key="testimonials" className={`border-t ${lc.sectionPadding}`}>
        <h2 className={`text-center text-2xl font-bold ${fonts.heading}`}>Ce que disent mes patients</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="mb-3 text-amber-400">
                {"★".repeat(t.rating)}{"☆".repeat(5 - t.rating)}
              </div>
              <p className={`text-sm italic leading-relaxed text-muted-foreground ${fonts.body}`}>
                &ldquo;{t.text}&rdquo;
              </p>
              <p className="mt-3 text-sm font-semibold">— {t.author}</p>
            </div>
          ))}
        </div>
      </section>
    ) : null,

    faq: faq.length > 0 ? (
      <section key="faq" className={`border-t ${lc.sectionPadding}`}>
        <h2 className={`text-center text-2xl font-bold ${fonts.heading}`}>Questions fréquentes</h2>
        <div className="mx-auto mt-10 max-w-2xl space-y-4">
          {faq.map((f, i) => (
            <details key={i} className="group rounded-xl border bg-card">
              <summary className={`cursor-pointer list-none px-6 py-4 font-semibold ${fonts.heading}`}>
                <span className="flex items-center justify-between">
                  {f.question}
                  <span className="ml-2 text-muted-foreground transition group-open:rotate-180">▾</span>
                </span>
              </summary>
              <p className={`px-6 pb-4 text-sm leading-relaxed text-muted-foreground ${fonts.body}`}>
                {f.answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    ) : null,

    info: (
      <section key="info" className={`border-t ${lc.sectionPadding}`}>
        <h2 className={`text-center text-2xl font-bold ${fonts.heading}`}>Informations pratiques</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold">Tarifs</h3>
            <p className="mt-2 text-2xl font-bold">{practitioner.consultation_price}€</p>
            <p className="text-sm text-muted-foreground">par séance</p>
          </div>
          <div className="rounded-xl border bg-card p-6">
            <h3 className="font-semibold">Durées de séance</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {sessionDurations.map((d) => (
                <span key={d} className="rounded-full bg-muted px-3 py-1 text-sm font-medium">{d} min</span>
              ))}
            </div>
          </div>
          {address && (
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold">Adresse</h3>
              <p className="mt-2 text-sm text-muted-foreground">{address}</p>
              <iframe
                className="mt-3 h-32 w-full rounded-lg border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(address)}`}
                allowFullScreen
              />
            </div>
          )}
        </div>
      </section>
    ),

    gallery: galleryImages.length > 0 ? (
      <section key="gallery" className={`border-t ${lc.sectionPadding}`}>
        <h2 className={`text-center text-2xl font-bold ${fonts.heading}`}>Le cabinet en images</h2>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {galleryImages.map((url, i) => (
            <div key={i} className="aspect-square overflow-hidden rounded-xl">
              <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover transition hover:scale-105" />
            </div>
          ))}
        </div>
      </section>
    ) : null,

    booking: (
      <section key="booking" id="booking" className={`border-t ${lc.sectionPadding}`}>
        <h2 className={`mb-8 text-center text-2xl font-bold ${fonts.heading}`}>{ctaText}</h2>
        <div className="mx-auto max-w-lg">
          <BookingWidget
            practitionerId={practitioner.id}
            practitionerName={profile.full_name}
            sessionDurations={sessionDurations}
            rules={rules ?? []}
            exceptions={exceptions ?? []}
            timezone={practitioner.timezone as string}
          />
        </div>
      </section>
    ),
  };

  // --- Render sections in configured order ---
  const orderedSections = sectionOrder
    .filter((id) => isVisible(id) && sectionMap[id])
    .map((id) => sectionMap[id]);

  return (
    <div className={`min-h-screen bg-background ${fonts.body}`}>
      {/* Hero is always first if visible */}
      {sectionMap.hero}

      <div className={`mx-auto px-4 ${lc.container}`}>
        {orderedSections.filter((node) => {
          // Skip hero (rendered above) and booking (rendered separately or in order)
          const key = (node as React.ReactElement)?.key;
          return key !== "hero";
        })}
      </div>

      {/* Footer */}
      <footer
        className="py-8 text-center text-sm text-white/80"
        style={{ background: theme.gradient }}
      >
        <p className="font-medium text-white">
          {profile.full_name} — {practitioner.specialty}
        </p>
        {Object.values(socialLinks).some(Boolean) && (
          <div className="mt-2 flex justify-center gap-3">
            {socialLinks.website && <a href={socialLinks.website} target="_blank" rel="noopener noreferrer" className="hover:text-white">Site web</a>}
            {socialLinks.instagram && <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-white">Instagram</a>}
            {socialLinks.linkedin && <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-white">LinkedIn</a>}
            {socialLinks.doctolib && <a href={socialLinks.doctolib} target="_blank" rel="noopener noreferrer" className="hover:text-white">Doctolib</a>}
          </div>
        )}
        <p className="mt-2">
          Propulsé par <span className="font-semibold text-white">PratiFlow</span>
        </p>
      </footer>
    </div>
  );
}
