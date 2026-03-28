import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { logAccess } from "@/lib/access-log";

/**
 * RGPD Right to be forgotten — Anonymize a patient's account.
 *
 * - Replaces personal data with "[ANONYMISÉ]"
 * - Deletes shared media files from storage
 * - Retains anonymized appointment records for practitioner statistics
 * - Deletes messages
 * - Logs the action for HDS audit trail
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { confirmation } = await request.json();

  if (confirmation !== "SUPPRIMER MON COMPTE") {
    return NextResponse.json(
      { error: "Confirmation text does not match" },
      { status: 400 }
    );
  }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Service configuration missing" },
      { status: 503 }
    );
  }

  const serviceClient = createServiceClient(serviceUrl, serviceKey);

  // Get patient record
  const { data: patient } = await serviceClient
    .from("patients")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!patient) {
    return NextResponse.json(
      { error: "Patient record not found" },
      { status: 404 }
    );
  }

  const patientId = patient.id as string;

  // Log the anonymization action BEFORE deleting
  await logAccess(user.id, "anonymize_account", "profile", user.id);

  // 1. Delete shared media files from storage
  const { data: mediaFiles } = await serviceClient
    .from("shared_media")
    .select("file_path")
    .eq("patient_id", patientId);

  if (mediaFiles && mediaFiles.length > 0) {
    const paths = mediaFiles.map((m) => m.file_path as string);
    await serviceClient.storage.from("shared-media").remove(paths);
  }

  // 2. Delete shared media records
  await serviceClient
    .from("shared_media")
    .delete()
    .eq("patient_id", patientId);

  // 3. Delete messages
  await serviceClient
    .from("messages")
    .delete()
    .eq("patient_id", patientId);

  // 4. Delete shared notes
  await serviceClient
    .from("shared_notes")
    .delete()
    .eq("patient_id", patientId);

  // 5. Delete private notes linked to patient's appointments
  const { data: appointments } = await serviceClient
    .from("appointments")
    .select("id")
    .eq("patient_id", patientId);

  if (appointments && appointments.length > 0) {
    const aptIds = appointments.map((a) => a.id as string);
    await serviceClient
      .from("private_notes")
      .delete()
      .in("appointment_id", aptIds);
  }

  // 6. Anonymize appointments (keep for stats, remove personal link)
  await serviceClient
    .from("appointments")
    .update({
      cancellation_reason: "[ANONYMISÉ]",
      jitsi_room_url: null,
    })
    .eq("patient_id", patientId);

  // 7. Delete notifications
  await serviceClient
    .from("notifications")
    .delete()
    .eq("user_id", user.id);

  // 8. Anonymize profile
  await serviceClient
    .from("profiles")
    .update({
      full_name: "[UTILISATEUR ANONYMISÉ]",
      avatar_url: null,
      phone: null,
      gdpr_consent_at: null,
    })
    .eq("id", user.id);

  // 9. Delete patient record
  await serviceClient
    .from("patients")
    .delete()
    .eq("id", patientId);

  // 10. Delete auth user (via admin API)
  await serviceClient.auth.admin.deleteUser(user.id);

  return NextResponse.json({
    success: true,
    message: "Votre compte a été anonymisé et supprimé.",
  });
}
