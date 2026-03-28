import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccessLogs } from "@/lib/access-log";

const ACTION_LABELS: Record<string, string> = {
  view_patient: "Consultation dossier patient",
  view_private_note: "Lecture note privée",
  create_private_note: "Création note privée",
  update_private_note: "Modification note privée",
  view_shared_note: "Lecture note partagée",
  create_shared_note: "Création note partagée",
  update_shared_note: "Modification note partagée",
  view_media: "Consultation document",
  upload_media: "Téléversement document",
  delete_media: "Suppression document",
  view_messages: "Lecture messages",
  send_message: "Envoi message",
  view_appointment: "Consultation RDV",
  create_appointment: "Création RDV",
  update_appointment: "Modification RDV",
  export_data: "Export données RGPD",
  anonymize_account: "Anonymisation compte",
};

export default async function AccessLogsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.user_metadata?.role !== "practitioner") redirect("/dashboard");

  const logs = await getAccessLogs(user.id, 200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Journal d&apos;accès</h1>
        <p className="text-muted-foreground">
          Traçabilité des accès aux données de santé (conformité HDS)
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">
            Aucun accès enregistré. Les accès aux données sensibles seront
            tracés ici.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <div className="grid grid-cols-5 gap-4 border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
            <div>Date</div>
            <div>Action</div>
            <div>Type</div>
            <div>Ressource</div>
            <div>IP</div>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id as string}
                className="grid grid-cols-5 gap-4 border-b px-4 py-2 text-xs last:border-0"
              >
                <div>
                  {new Date(log.created_at as string).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </div>
                <div>
                  {ACTION_LABELS[log.action as string] ?? (log.action as string)}
                </div>
                <div className="text-muted-foreground">
                  {log.resource_type as string}
                </div>
                <div className="truncate text-muted-foreground font-mono">
                  {(log.resource_id as string).substring(0, 8)}...
                </div>
                <div className="text-muted-foreground">
                  {(log.ip_address as string) ?? "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
