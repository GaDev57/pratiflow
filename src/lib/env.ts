/**
 * Server-side environment variable access with validation.
 * Uses getters to validate lazily (at runtime, not at import/build time).
 * NEXT_PUBLIC_* vars are inlined at build time by Next.js — they don't need runtime validation.
 */

function required(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const env = {
  // Required for core functionality — validated lazily on first access
  get SUPABASE_SERVICE_ROLE_KEY() { return required("SUPABASE_SERVICE_ROLE_KEY"); },
  get STRIPE_SECRET_KEY() { return required("STRIPE_SECRET_KEY"); },
  get STRIPE_WEBHOOK_SECRET() { return required("STRIPE_WEBHOOK_SECRET"); },

  // Site URL
  get NEXT_PUBLIC_SITE_URL() { return optional("NEXT_PUBLIC_SITE_URL"); },

  // Stripe price IDs
  get STRIPE_PRO_PRICE_ID() { return optional("STRIPE_PRO_PRICE_ID"); },
  get STRIPE_PREMIUM_PRICE_ID() { return optional("STRIPE_PREMIUM_PRICE_ID"); },

  // Optional — graceful degradation when missing
  get RESEND_API_KEY() { return optional("RESEND_API_KEY"); },
  get TWILIO_ACCOUNT_SID() { return optional("TWILIO_ACCOUNT_SID"); },
  get TWILIO_AUTH_TOKEN() { return optional("TWILIO_AUTH_TOKEN"); },
  get TWILIO_PHONE_NUMBER() { return optional("TWILIO_PHONE_NUMBER"); },
  get GOOGLE_CLIENT_ID() { return optional("GOOGLE_CLIENT_ID"); },
  get GOOGLE_CLIENT_SECRET() { return optional("GOOGLE_CLIENT_SECRET"); },
};

/** Resolve the app URL for emails and links */
export function getAppUrl(): string {
  return (
    env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "http://localhost:3000")
  );
}
