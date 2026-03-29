import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // user_id

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "http://localhost:3000");

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?error=gcal`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/dashboard/settings?error=gcal_config`);
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${appUrl}/api/google-calendar/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    console.error("[GCAL] Token exchange failed:", await tokenRes.text());
    return NextResponse.redirect(`${appUrl}/dashboard/settings?error=gcal_token`);
  }

  const tokens = await tokenRes.json();

  // Store tokens in practitioner record
  const supabase = await createClient();
  const { error } = await supabase
    .from("practitioners")
    .update({
      google_calendar_token: tokens,
    })
    .eq("profile_id", state);

  if (error) {
    console.error("[GCAL] Failed to save tokens:", error);
    return NextResponse.redirect(`${appUrl}/dashboard/settings?error=gcal_save`);
  }

  return NextResponse.redirect(`${appUrl}/dashboard/settings?gcal=connected`);
}
