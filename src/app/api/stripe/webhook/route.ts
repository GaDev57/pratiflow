import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";

// Use service role client for webhook (no user session)
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[STRIPE/WEBHOOK] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getServiceClient();

  switch (event.type) {
    // ---- Payment for appointment ----
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode === "payment" && session.metadata?.appointment_id) {
        // Update appointment with payment intent
        await supabase
          .from("appointments")
          .update({
            stripe_payment_intent_id: session.payment_intent as string,
            status: "confirmed",
          })
          .eq("id", session.metadata.appointment_id);

        // Create notification for practitioner
        const { data: appointment } = await supabase
          .from("appointments")
          .select("practitioner_id, practitioners!inner(profile_id)")
          .eq("id", session.metadata.appointment_id)
          .single();

        if (appointment) {
          const practitioner = appointment.practitioners as unknown as {
            profile_id: string;
          };
          await supabase.from("notifications").insert({
            user_id: practitioner.profile_id,
            type: "payment_received",
            title: "Paiement reçu",
            body: `Un paiement de ${(session.amount_total ?? 0) / 100}€ a été reçu pour un rendez-vous.`,
            related_id: session.metadata.appointment_id,
          });
        }
      }

      // ---- Subscription activated ----
      if (session.mode === "subscription" && session.metadata?.plan) {
        await supabase
          .from("practitioners")
          .update({
            subscription_plan: session.metadata.plan,
          })
          .eq("profile_id", session.metadata.user_id);
      }
      break;
    }

    // ---- Subscription cancelled ----
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      // Find practitioner by stripe customer ID and downgrade to free
      await supabase
        .from("practitioners")
        .update({ subscription_plan: "free" })
        .eq("stripe_account_id", customerId);
      break;
    }

    // ---- Payment failed ----
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      // Notify practitioner
      const { data: practitioner } = await supabase
        .from("practitioners")
        .select("profile_id")
        .eq("stripe_account_id", customerId)
        .single();

      if (practitioner) {
        await supabase.from("notifications").insert({
          user_id: practitioner.profile_id as string,
          type: "payment_received",
          title: "Échec de paiement",
          body: "Le paiement de votre abonnement a échoué. Veuillez mettre à jour votre moyen de paiement.",
        });
      }
      break;
    }

    // ---- Refund processed ----
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      console.log(
        `[STRIPE/WEBHOOK] Refund processed for charge ${charge.id}: ${(charge.amount_refunded ?? 0) / 100}€`
      );
      break;
    }
  }

  return NextResponse.json({ received: true });
}
