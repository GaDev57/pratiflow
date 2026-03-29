"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface Props {
  isConnected: boolean;
  practitionerId: string;
}

export function GoogleCalendarSection({ isConnected, practitionerId }: Props) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    const supabase = createClient();
    await supabase
      .from("practitioners")
      .update({ google_calendar_token: null })
      .eq("id", practitionerId);
    router.refresh();
  }

  return (
    <div className="rounded-lg border p-4">
      {isConnected ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-green-600">
            ✓ Google Calendar connecté
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-destructive"
            onClick={handleDisconnect}
            disabled={disconnecting}
          >
            {disconnecting ? "Déconnexion..." : "Déconnecter"}
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Synchronisez vos indisponibilités depuis Google Calendar
          </p>
          <Link
            href="/api/google-calendar/authorize"
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            Connecter
          </Link>
        </div>
      )}
    </div>
  );
}
