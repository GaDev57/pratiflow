import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { savePushSubscription } from "@/lib/push-notifications";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscription = await request.json();

  const saved = await savePushSubscription(user.id, {
    endpoint: subscription.endpoint,
    keys: subscription.keys,
  });

  return NextResponse.json({ saved });
}
