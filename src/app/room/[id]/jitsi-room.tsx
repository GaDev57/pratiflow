"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Props {
  roomName: string;
  displayName: string;
  appointmentId: string;
  isPractitioner: boolean;
  patientName: string;
  practitionerName: string;
}

export function JitsiRoom({
  roomName,
  displayName,
  appointmentId,
  isPractitioner,
  patientName,
  practitionerName,
}: Props) {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [showNotes, setShowNotes] = useState(isPractitioner);

  useEffect(() => {
    // Load Jitsi Meet external API
    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;

    script.onload = () => {
      if (!jitsiContainerRef.current) return;

      const domain = "meet.jit.si";
      const options = {
        roomName,
        parentNode: jitsiContainerRef.current,
        userInfo: {
          displayName,
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          TOOLBAR_BUTTONS: [
            "microphone",
            "camera",
            "desktop",
            "chat",
            "raisehand",
            "tileview",
            "hangup",
          ],
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = new (window as any).JitsiMeetExternalAPI(domain, options);

      api.addEventListener("readyToClose", () => {
        window.location.href = "/dashboard";
      });

      return () => {
        api.dispose();
      };
    };

    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [roomName, displayName]);

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-background px-4 py-2">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm font-bold">
            PratiFlow
          </Link>
          <span className="text-sm text-muted-foreground">
            Consultation : {isPractitioner ? patientName : practitionerName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isPractitioner && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotes(!showNotes)}
            >
              {showNotes ? "Masquer les notes" : "Afficher les notes"}
            </Button>
          )}
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              Quitter
            </Button>
          </Link>
        </div>
      </div>

      {/* Main content: split view */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video */}
        <div
          ref={jitsiContainerRef}
          className={`${showNotes ? "w-2/3" : "w-full"} h-full`}
        />

        {/* Side panel: notes (practitioner only) */}
        {showNotes && isPractitioner && (
          <div className="flex w-1/3 flex-col border-l">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold">
                Dossier patient — {patientName}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Notes de séance
                  </label>
                  <textarea
                    className="mt-1 w-full rounded-md border p-2 text-sm"
                    rows={8}
                    placeholder="Vos notes pour cette séance..."
                    id={`notes-${appointmentId}`}
                  />
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={async () => {
                    const textarea = document.getElementById(
                      `notes-${appointmentId}`
                    ) as HTMLTextAreaElement;
                    if (!textarea?.value) return;

                    const { createClient } = await import(
                      "@/lib/supabase/client"
                    );
                    const supabase = createClient();

                    // Get practitioner ID
                    const {
                      data: { user },
                    } = await supabase.auth.getUser();
                    if (!user) return;

                    const { data: practitioner } = await supabase
                      .from("practitioners")
                      .select("id")
                      .eq("profile_id", user.id)
                      .single();

                    if (!practitioner) return;

                    await supabase.from("private_notes").insert({
                      appointment_id: appointmentId,
                      practitioner_id: practitioner.id,
                      content_json: { text: textarea.value },
                    });

                    textarea.value = "";
                  }}
                >
                  Sauvegarder la note
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
