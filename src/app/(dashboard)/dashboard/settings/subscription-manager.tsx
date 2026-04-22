"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const PLANS = [
  {
    key: "free",
    name: "Gratuit",
    price: "0€",
    period: "",
    features: [
      "5 rendez-vous / mois",
      "Page de réservation publique",
      "Calendrier basique",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: "29€",
    period: "/mois",
    features: [
      "Rendez-vous illimités",
      "Téléconsultation WhatsApp",
      "Rappels SMS + email",
      "Google Calendar sync",
      "Dossier patient collaboratif",
    ],
  },
  {
    key: "premium",
    name: "Premium",
    price: "59€",
    period: "/mois",
    features: [
      "Tout Pro +",
      "Paiement patient en ligne",
      "Reçus PDF automatiques",
      "Support prioritaire",
    ],
  },
];

interface Props {
  currentPlan: string;
}

export function SubscriptionManager({ currentPlan }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  async function subscribe(plan: string) {
    if (plan === "free" || plan === currentPlan) return;
    setLoading(plan);

    try {
      const res = await fetch("/api/stripe/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();
      if (data.url) {
        const redirectUrl = data.url;
        window.location.assign(redirectUrl);
      }
    } catch {
      setLoading(null);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {PLANS.map((plan) => {
        const isCurrent = plan.key === currentPlan;
        return (
          <div
            key={plan.key}
            className={`rounded-lg border p-4 ${
              isCurrent ? "border-primary bg-primary/5" : ""
            }`}
          >
            <h3 className="font-semibold">{plan.name}</h3>
            <p className="mt-1 text-2xl font-bold">
              {plan.price}
              <span className="text-sm font-normal text-muted-foreground">
                {plan.period}
              </span>
            </p>
            <ul className="mt-3 space-y-1">
              {plan.features.map((f) => (
                <li key={f} className="text-xs text-muted-foreground">
                  ✓ {f}
                </li>
              ))}
            </ul>
            <Button
              className="mt-4 w-full"
              variant={isCurrent ? "outline" : "default"}
              size="sm"
              disabled={isCurrent || loading === plan.key}
              onClick={() => subscribe(plan.key)}
            >
              {isCurrent
                ? "Plan actuel"
                : loading === plan.key
                  ? "Redirection..."
                  : "Choisir"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
