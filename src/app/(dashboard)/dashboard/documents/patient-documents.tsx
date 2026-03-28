"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { RichTextViewer } from "@/components/rich-text-editor";

interface Props {
  patientId: string;
  notes: Record<string, unknown>[];
  media: Record<string, unknown>[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " o";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " Ko";
  return (bytes / (1024 * 1024)).toFixed(1) + " Mo";
}

export function PatientDocuments({ patientId, notes, media }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [mediaList, setMediaList] = useState(media);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // Get practitioner linked to this patient
    const { data: patient } = await supabase
      .from("patients")
      .select("practitioner_id")
      .eq("id", patientId)
      .single();

    if (!patient?.practitioner_id) {
      setUploading(false);
      return;
    }

    for (const file of Array.from(files)) {
      const filePath = `${patient.practitioner_id}/${patientId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("shared-media")
        .upload(filePath, file, { contentType: file.type });

      if (uploadError) continue;

      const { data } = await supabase
        .from("shared_media")
        .insert({
          patient_id: patientId,
          practitioner_id: patient.practitioner_id,
          uploader_id: user.id,
          file_path: filePath,
          file_type: file.type,
          file_name: file.name,
          size_bytes: file.size,
          is_visible_to_patient: true,
        })
        .select()
        .single();

      if (data) {
        setMediaList((prev) => [data as Record<string, unknown>, ...prev]);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function downloadFile(filePath: string, fileName: string) {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from("shared-media")
      .createSignedUrl(filePath, 3600);

    if (data?.signedUrl) {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = fileName;
      a.click();
    }
  }

  return (
    <>
      {/* Shared Notes */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Notes partagées</h2>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune note partagée pour le moment.
          </p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => {
              const appointments = note.appointments as Record<string, unknown> | undefined;
              const practitioners = note.practitioners as Record<string, unknown> | undefined;
              const profiles = practitioners?.profiles as Record<string, unknown> | undefined;

              return (
                <div
                  key={note.id as string}
                  className="rounded-lg border p-4"
                >
                  <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Par {(profiles?.full_name as string) ?? "Praticien"}
                    </span>
                    <span>
                      Séance du{" "}
                      {appointments?.start_at
                        ? new Date(
                            appointments.start_at as string
                          ).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </span>
                  </div>
                  <RichTextViewer
                    content={note.content_json as Record<string, unknown>}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Media */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Fichiers</h2>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleUpload}
              accept="image/*,video/*,.pdf,.doc,.docx"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Envoi..." : "Envoyer un fichier"}
            </Button>
          </div>
        </div>

        {mediaList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun fichier.</p>
        ) : (
          <div className="space-y-2">
            {mediaList.map((item) => {
              const fileType = item.file_type as string;
              const icon = fileType.startsWith("image/")
                ? "🖼"
                : fileType.startsWith("video/")
                  ? "🎥"
                  : fileType === "application/pdf"
                    ? "📄"
                    : "📎";

              return (
                <div
                  key={item.id as string}
                  className="flex items-center gap-3 rounded-md border px-4 py-2"
                >
                  <span className="text-lg">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">
                      {item.file_name as string}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(item.size_bytes as number)} —{" "}
                      {new Date(
                        item.created_at as string
                      ).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() =>
                      downloadFile(
                        item.file_path as string,
                        item.file_name as string
                      )
                    }
                  >
                    Télécharger
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
