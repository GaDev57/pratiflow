import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

/**
 * HDS-compliant access logging.
 * Logs every access to sensitive health data (patient records, notes, media).
 * Uses service role to bypass RLS — logs are append-only.
 */

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("[ACCESS_LOG] Service role not configured — logging disabled");
    return null;
  }
  return createClient(url, key);
}

export type AccessAction =
  | "view_patient"
  | "view_private_note"
  | "create_private_note"
  | "update_private_note"
  | "view_shared_note"
  | "create_shared_note"
  | "update_shared_note"
  | "view_media"
  | "upload_media"
  | "delete_media"
  | "view_messages"
  | "send_message"
  | "view_appointment"
  | "create_appointment"
  | "update_appointment"
  | "export_data"
  | "anonymize_account";

export type ResourceType =
  | "patient"
  | "private_note"
  | "shared_note"
  | "shared_media"
  | "message"
  | "appointment"
  | "profile";

export async function logAccess(
  userId: string,
  action: AccessAction,
  resourceType: ResourceType,
  resourceId: string
): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) {
    console.log(`[ACCESS_LOG] ${action} on ${resourceType}:${resourceId} by ${userId} (service role not configured)`);
    return;
  }

  let ipAddress: string | null = null;
  try {
    const headersList = await headers();
    ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headersList.get("x-real-ip") ??
      null;
  } catch {
    // headers() not available in all contexts
  }

  const { error } = await supabase.from("access_logs").insert({
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    ip_address: ipAddress,
  });

  if (error) {
    console.error("[ACCESS_LOG] Failed to log:", error.message);
  }
}

/**
 * Fetch access logs for a practitioner (their own actions).
 */
export async function getAccessLogs(
  userId: string,
  limit = 100
): Promise<Record<string, unknown>[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("access_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data as Record<string, unknown>[]) ?? [];
}
