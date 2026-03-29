"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface MediaItem {
  id: string;
  file_path: string;
  file_type: string;
  file_name: string;
  size_bytes: number;
  is_visible_to_patient: boolean;
  created_at: string;
}

interface Props {
  practitionerId: string;
  patientId: string;
  initialMedia: MediaItem[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " o";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " Ko";
  return (bytes / (1024 * 1024)).toFixed(1) + " Mo";
}

export function SharedMediaSection({
  practitionerId,
  patientId,
  initialMedia,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    for (const file of Array.from(files)) {
      // Sanitize filename: remove accents, replace special chars with dashes
      const safeName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-");
      const filePath = `${practitionerId}/${patientId}/${Date.now()}-${safeName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("shared-media")
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("[UPLOAD] Failed:", uploadError);
        continue;
      }

      // Create media record
      const { data, error } = await supabase
        .from("shared_media")
        .insert({
          patient_id: patientId,
          practitioner_id: practitionerId,
          uploader_id: user.id,
          file_path: filePath,
          file_type: file.type,
          file_name: file.name,
          size_bytes: file.size,
          is_visible_to_patient: true,
        })
        .select()
        .single();

      if (!error && data) {
        setMedia((prev) => [data as unknown as MediaItem, ...prev]);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  }

  async function toggleVisibility(mediaId: string, current: boolean) {
    const supabase = createClient();
    await supabase
      .from("shared_media")
      .update({ is_visible_to_patient: !current })
      .eq("id", mediaId);

    setMedia(
      media.map((m) =>
        m.id === mediaId ? { ...m, is_visible_to_patient: !current } : m
      )
    );
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

  async function deleteMedia(mediaId: string, filePath: string) {
    const supabase = createClient();

    await supabase.storage.from("shared-media").remove([filePath]);
    await supabase.from("shared_media").delete().eq("id", mediaId);

    setMedia(media.filter((m) => m.id !== mediaId));
    router.refresh();
  }

  const fileTypeIcon = (type: string) => {
    if (type.startsWith("image/")) return "🖼";
    if (type.startsWith("video/")) return "🎥";
    if (type === "application/pdf") return "📄";
    return "📎";
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Documents partagés</h2>
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
            {uploading ? "Envoi..." : "Ajouter un fichier"}
          </Button>
        </div>
      </div>

      {media.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun document.</p>
      ) : (
        <div className="space-y-2">
          {media.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 rounded-md border px-4 py-2 ${
                item.is_visible_to_patient ? "" : "opacity-60"
              }`}
            >
              <span className="text-lg">{fileTypeIcon(item.file_type)}</span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">
                  {item.file_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(item.size_bytes)} —{" "}
                  {new Date(item.created_at).toLocaleDateString("fr-FR")}
                  {!item.is_visible_to_patient && " — Masqué"}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => downloadFile(item.file_path, item.file_name)}
                >
                  Télécharger
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() =>
                    toggleVisibility(item.id, item.is_visible_to_patient)
                  }
                >
                  {item.is_visible_to_patient ? "Masquer" : "Montrer"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-destructive"
                  onClick={() => deleteMedia(item.id, item.file_path)}
                >
                  Suppr.
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
