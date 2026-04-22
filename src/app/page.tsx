import Link from "next/link";
import {
  Calendar,
  FolderOpen,
  Video,
  CreditCard,
  UserPlus,
  Settings,
  Users,
  Check,
  ArrowRight,
  Shield,
  Heart,
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Agenda intelligent",
    description:
      "Synchronisez votre calendrier, definissez vos creneaux et laissez vos patients reserver en ligne 24h/24.",
    color: "bg-teal-50 text-teal-700",
    border: "border-teal-200",
  },
  {
    icon: FolderOpen,
    title: "Dossiers patients collaboratifs",
    description:
      "Notes enrichies, documents partages, historique complet. Tout le suivi patient dans un espace securise.",
    color: "bg-sky-50 text-sky-700",
    border: "border-sky-200",
  },
  {
    icon: Video,
    title: "Teleconsultation WhatsApp",
    description:
      "Lancez un appel video WhatsApp avec votre patient directement depuis son dossier. Simple, rapide, sans installation.",
    color: "bg-emerald-50 text-emerald-700",
    border: "border-emerald-200",
  },
  {
    icon: CreditCard,
    title: "Paiements securises",
    description:
      "Encaissez vos consultations en ligne via Stripe. Recus PDF automatiques pour vos patients.",
    color: "bg-teal-50 text-teal-700",
    border: "border-teal-200",
  },
];

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Creez votre profil",
    description:
      "Inscrivez-vous en 2 minutes. Renseignez votre specialite, vos coordonnees et votre photo.",
  },
  {
    number: "02",
    icon: Settings,
    title: "Configurez vos disponibilites",
    description:
      "Definissez vos creneaux horaires, la duree de vos seances et synchronisez Google Calendar.",
  },
  {
    number: "03",
    icon: Users,
    title: "Recevez vos premiers patients",
    description:
      "Partagez votre lien de reservation. Vos patients reservent, paient et sont notifies automatiquement.",
  },
];

const plans = [
  {
    key: "free",
    name: "Gratuit",
    price: "0",
    priceYearly: null,
    yearlyDiscount: null,
    period: "",
    description: "Pour decouvrir PratiFlow",
    features: [
      "5 rendez-vous / mois",
      "Page de reservation publique",
      "Calendrier basique",
    ],
    cta: "Commencer gratuitement",
    featured: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: "9",
    priceYearly: "99",
    yearlyDiscount: "1 mois offert",
    period: "/mois",
    description: "Pour les praticiens actifs",
    features: [
      "Rendez-vous illimites",
      "Teleconsultation WhatsApp",
      "Rappels SMS + email",
      "Google Calendar sync",
      "Dossier patient collaboratif",
    ],
    cta: "Essayer Pro",
    featured: true,
  },
  {
    key: "premium",
    name: "Premium",
    price: "19",
    priceYearly: "199",
    yearlyDiscount: "2 mois offerts",
    period: "/mois",
    description: "Pour les cabinets exigeants",
    features: [
      "Tout Pro +",
      "Paiement patient en ligne",
      "Recus PDF automatiques",
      "Support prioritaire",
      "Multi-cabinets (bientot)",
    ],
    cta: "Choisir Premium",
    featured: false,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ── Navigation ── */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600">
              <Heart className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">
              PratiFlow
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
            >
              Creer un compte
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        {/* Background decorations */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-teal-100/60 blur-3xl animate-pulse-soft" />
          <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-sky-100/50 blur-3xl animate-pulse-soft stagger-4" />
          <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-100/30 blur-3xl animate-pulse-soft stagger-2" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
            <div className="animate-fade-in-up mb-6 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-sm font-medium text-teal-800">
              <Shield className="h-3.5 w-3.5" />
              Conforme HDS &amp; RGPD
            </div>

            {/* Headline */}
            <h1 className="animate-fade-in-up stagger-1 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Votre cabinet,{" "}
              <span className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 bg-clip-text text-transparent animate-gradient">
                simplifie
              </span>
            </h1>

            {/* Subtitle */}
            <p className="animate-fade-in-up stagger-2 mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Agenda en ligne, dossiers patients, messagerie praticien/patient,
              teleconsultation et paiements en ligne — tout ce dont les coachs
              et praticiens en bien-etre ont besoin, dans une seule plateforme
              securisee.
            </p>

            {/* CTA Buttons */}
            <div className="animate-fade-in-up stagger-3 mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 rounded-xl bg-teal-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-600/20 transition-all hover:bg-teal-700 hover:shadow-xl hover:shadow-teal-600/30"
              >
                Commencer gratuitement
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="#fonctionnalites"
                className="inline-flex items-center gap-2 rounded-xl border border-border px-7 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Decouvrir
              </Link>
            </div>

            {/* Social proof */}
            <p className="animate-fade-in-up stagger-4 mt-8 text-sm text-muted-foreground">
              Psychologues, kinesitherapeutes, osteopathes, medecins generalistes, sophrologues...
            </p>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section
        id="fonctionnalites"
        className="border-t border-border/50 bg-muted/30 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="animate-fade-in-up text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Tout pour gerer votre activite
            </h2>
            <p className="animate-fade-in-up stagger-1 mt-4 text-lg text-muted-foreground">
              Des outils conçus pour les professionnels de sante et du bien-etre.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:gap-8">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`animate-fade-in-up stagger-${i + 2} group rounded-2xl border ${feature.border} bg-background p-8 transition-all hover:-translate-y-1 hover:shadow-lg`}
              >
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.color}`}
                >
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="animate-fade-in-up text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Pret en 3 etapes
            </h2>
            <p className="animate-fade-in-up stagger-1 mt-4 text-lg text-muted-foreground">
              De l&apos;inscription a votre premier patient, en quelques minutes.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className={`animate-fade-in-up stagger-${i + 2} relative text-center`}
              >
                {/* Connector line for desktop */}
                {i < steps.length - 1 && (
                  <div className="absolute top-10 left-[calc(50%+2rem)] hidden h-px w-[calc(100%-4rem)] bg-gradient-to-r from-teal-300 to-teal-100 sm:block" />
                )}

                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-teal-200 bg-teal-50 transition-colors hover:border-teal-400 hover:bg-teal-100">
                  <step.icon className="h-8 w-8 text-teal-700" />
                </div>
                <span className="mt-4 block text-xs font-bold uppercase tracking-widest text-teal-600">
                  Etape {step.number}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section
        id="tarifs"
        className="border-t border-border/50 bg-muted/30 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="animate-fade-in-up text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Un tarif adapte a chaque pratique
            </h2>
            <p className="animate-fade-in-up stagger-1 mt-4 text-lg text-muted-foreground">
              Commencez gratuitement, evoluez quand vous le souhaitez.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-3 lg:gap-8">
            {plans.map((plan, i) => (
              <div
                key={plan.key}
                className={`animate-fade-in-up stagger-${i + 2} relative flex flex-col rounded-2xl border p-8 transition-all hover:-translate-y-1 hover:shadow-lg ${
                  plan.featured
                    ? "border-teal-400 bg-background shadow-md ring-1 ring-teal-400/20"
                    : "border-border bg-background"
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-teal-600 px-4 py-1 text-xs font-semibold text-white">
                    Populaire
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground">
                    {plan.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                  <div className="mt-6 flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-foreground">
                      {plan.price}&euro;
                    </span>
                    {plan.period && (
                      <span className="text-muted-foreground">
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground h-5">
                    {plan.priceYearly ? (
                      <>ou {plan.priceYearly}&euro;/an <span className="text-teal-600 font-medium">({plan.yearlyDiscount})</span></>
                    ) : "\u00A0"}
                  </p>
                </div>

                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-8">
                  <Link
                    href="/register"
                    className={`block w-full rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
                      plan.featured
                        ? "bg-teal-600 text-white hover:bg-teal-700"
                        : "border border-border bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Tous les prix sont HT. Aucun engagement, resiliable a tout moment.
          </p>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 px-8 py-16 text-center shadow-2xl sm:px-16 sm:py-20">
            {/* Decorative blobs */}
            <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

            <h2 className="relative text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Pret a simplifier votre quotidien ?
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-lg text-teal-100">
              Rejoignez les praticiens qui ont choisi PratiFlow pour gerer leur
              cabinet en toute serenite.
            </p>
            <div className="relative mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-teal-800 shadow-lg transition-all hover:bg-teal-50 hover:shadow-xl"
              >
                Creer mon compte gratuit
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-muted/30 py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-between">
            {/* Logo & tagline */}
            <div className="text-center sm:text-left">
              <Link href="/" className="flex items-center gap-2 justify-center sm:justify-start">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-600">
                  <Heart className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-base font-semibold text-foreground">
                  PratiFlow
                </span>
              </Link>
              <p className="mt-2 text-sm text-muted-foreground">
                Gestion de cabinet pour praticiens de sante et bien-etre.
              </p>
            </div>

            {/* Links */}
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm">
              <Link
                href="/login"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Connexion
              </Link>
              <Link
                href="/register"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Inscription
              </Link>
              <Link
                href="/privacy"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Politique de confidentialite
              </Link>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-8 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} PratiFlow. Tous droits reserves.
            Hebergement HDS — Donnees chiffrees AES-256.
          </div>
        </div>
      </footer>
    </div>
  );
}
