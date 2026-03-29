import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, SUBSCRIPTION_PLANS, type PlanKey } from "@/lib/stripe";

/**
 * Creates a Stripe Checkout session for practitioner subscription.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = (await request.json()) as { plan: PlanKey };

    if (plan === "free") {
      return NextResponse.json({ error: "Free plan does not require payment" }, { status: 400 });
    }

    const planConfig = SUBSCRIPTION_PLANS[plan];
    if (!planConfig || !("priceId" in planConfig) || !planConfig.priceId) {
      return NextResponse.json(
        { error: "Stripe price ID not configured for this plan" },
        { status: 503 }
      );
    }

    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "http://localhost:3000");

    // Get or create Stripe customer
    const { data: practitioner } = await supabase
      .from("practitioners")
      .select("id, stripe_account_id")
      .eq("profile_id", user.id)
      .single();

    let customerId = practitioner?.stripe_account_id as string | null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;

      await supabase
        .from("practitioners")
        .update({ stripe_account_id: customerId })
        .eq("profile_id", user.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      metadata: {
        user_id: user.id,
        plan,
      },
      success_url: `${appUrl}/dashboard/settings?subscription=success`,
      cancel_url: `${appUrl}/dashboard/settings?subscription=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[STRIPE/SUBSCRIPTION]", error);
    return NextResponse.json(
      { error: "Failed to create subscription session" },
      { status: 500 }
    );
  }
}
