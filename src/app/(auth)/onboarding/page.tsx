import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PractitionerOnboarding } from "./practitioner-form";
import { PatientOnboarding } from "./patient-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = user.user_metadata?.role as string | undefined;

  // Check if already onboarded
  if (role === "practitioner") {
    const { data: practitioner } = await supabase
      .from("practitioners")
      .select("id")
      .eq("profile_id", user.id)
      .single();

    if (practitioner) redirect("/dashboard");
  } else {
    const { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("profile_id", user.id)
      .single();

    if (patient) redirect("/dashboard");
  }

  return role === "practitioner" ? (
    <PractitionerOnboarding userId={user.id} fullName={user.user_metadata?.full_name ?? ""} />
  ) : (
    <PatientOnboarding userId={user.id} fullName={user.user_metadata?.full_name ?? ""} />
  );
}
