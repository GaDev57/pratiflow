import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingWidget } from "./booking-widget";
import { resolveTheme, getLogoShapeClass } from "@/lib/booking-themes";

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

  // Fetch practitioner by slug
  const { data: practitioner } = await supabase
    .from("practitioners")
    .select("*, profiles!inner(full_name, avatar_url)")
    .eq("slug", slug)
    .single();

  if (!practitioner) notFound();

  // Fetch availability rules
  const { data: rules } = await supabase
    .from("availability_rules")
    .select("day_of_week, start_time, end_time, is_active")
    .eq("practitioner_id", practitioner.id)
    .eq("is_active", true);

  // Fetch exceptions (future only)
  const today = new Date().toISOString().substring(0, 10);
  const { data: exceptions } = await supabase
    .from("availability_exceptions")
    .select("date, start_time, end_time")
    .eq("practitioner_id", practitioner.id)
    .gte("date", today);

  const profile = practitioner.profiles as {
    full_name: string;
    avatar_url: string | null;
  };
  const services = (practitioner.services ?? []) as Service[];
  const address = practitioner.address as string | null;
  const heroImage = practitioner.hero_image_url as string | null;
  const sessionDurations = practitioner.session_durations as number[];
  const logoUrl = practitioner.logo_url as string | null;
  const logoShape = (practitioner.logo_shape as string) ?? "round";
  const customColor = practitioner.custom_primary_color as string | null;
  const theme = resolveTheme((practitioner.booking_theme as string) ?? "default", customColor);
  const logoClasses = getLogoShapeClass(logoShape);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero section */}
      <section
        className="relative flex min-h-[400px] items-center justify-center bg-cover bg-center"
        style={{
          backgroundImage: heroImage
            ? `url(${heroImage})`
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
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {profile.full_name}
          </h1>
          <p className="mt-3 text-xl text-white/90">
            {practitioner.specialty}
          </p>
          <a
            href="#booking"
            className="mt-6 inline-block rounded-full px-8 py-3 text-sm font-semibold shadow-md transition"
            style={{ backgroundColor: "rgba(255,255,255,0.9)", color: theme.primary }}
          >
            Prendre rendez-vous
          </a>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4">
        {/* About section */}
        {practitioner.bio && (
          <section className="py-16">
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
              <div className={profile.avatar_url ? "md:col-span-2" : "md:col-span-3"}>
                <h2 className="text-2xl font-bold">À propos</h2>
                <p className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground">
                  {practitioner.bio}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Services / Approaches section */}
        {services.length > 0 && (
          <section className="border-t py-16">
            <h2 className="text-center text-2xl font-bold">Mes approches</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service, index) => (
                <div
                  key={index}
                  className="rounded-xl border bg-card p-6 shadow-sm transition hover:shadow-md"
                >
                  <h3 className="text-lg font-semibold">{service.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {service.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Practical info section */}
        <section className="border-t py-16">
          <h2 className="text-center text-2xl font-bold">
            Informations pratiques
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold">Tarifs</h3>
              <p className="mt-2 text-2xl font-bold">
                {practitioner.consultation_price}€
              </p>
              <p className="text-sm text-muted-foreground">par séance</p>
            </div>
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold">Durées de séance</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {sessionDurations.map((d) => (
                  <span
                    key={d}
                    className="rounded-full bg-muted px-3 py-1 text-sm font-medium"
                  >
                    {d} min
                  </span>
                ))}
              </div>
            </div>
            {address && (
              <div className="rounded-xl border bg-card p-6">
                <h3 className="font-semibold">Adresse</h3>
                <p className="mt-2 text-sm text-muted-foreground">{address}</p>
              </div>
            )}
          </div>
        </section>

        {/* Booking widget section */}
        <section id="booking" className="border-t py-16">
          <h2 className="mb-8 text-center text-2xl font-bold">
            Prendre rendez-vous
          </h2>
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
      </div>

      {/* Footer */}
      <footer
        className="py-8 text-center text-sm text-white/80"
        style={{ background: theme.gradient }}
      >
        <p className="font-medium text-white">
          {profile.full_name} — {practitioner.specialty}
        </p>
        <p className="mt-1">
          Propulsé par{" "}
          <span className="font-semibold text-white">PratiFlow</span>
        </p>
      </footer>
    </div>
  );
}
