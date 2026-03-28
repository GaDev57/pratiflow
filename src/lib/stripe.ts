import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeInstance = new Stripe(key, {
      typescript: true,
    });
  }
  return stripeInstance;
}

export const SUBSCRIPTION_PLANS = {
  free: {
    name: "Gratuit",
    price: 0,
    features: [
      "5 rendez-vous / mois",
      "Page de réservation publique",
      "Calendrier basique",
    ],
    limits: { appointmentsPerMonth: 5 },
  },
  pro: {
    name: "Pro",
    price: 29,
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
    features: [
      "Rendez-vous illimités",
      "Téléconsultation Jitsi",
      "Rappels SMS + email",
      "Google Calendar sync",
      "Dossier patient collaboratif",
    ],
    limits: { appointmentsPerMonth: Infinity },
  },
  premium: {
    name: "Premium",
    price: 59,
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID ?? "",
    features: [
      "Tout Pro +",
      "Paiement patient en ligne",
      "Reçus PDF automatiques",
      "Support prioritaire",
      "Multi-cabinets (bientôt)",
    ],
    limits: { appointmentsPerMonth: Infinity },
  },
} as const;

export type PlanKey = keyof typeof SUBSCRIPTION_PLANS;
