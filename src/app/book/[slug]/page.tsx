import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingWidget } from "./booking-widget";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BookingPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch practitioner by slug
  const { data: practitioner } = await supabase
    .from("practitioners")
    .select("*, profiles!inner(full_name, avatar_url)")
    .eq("slug", slug)
    .single();

  if (!practitioner) notFound();

  // Fetch availability rules
  const { data: rules } = await supabase
    .from("availability_rules")
    .select("day_of_week, start_time, end_time, is_active")
    .eq("practitioner_id", practitioner.id)
    .eq("is_active", true);

  // Fetch exceptions (future only)
  const today = new Date().toISOString().substring(0, 10);
  const { data: exceptions } = await supabase
    .from("availability_exceptions")
    .select("date, start_time, end_time")
    .eq("practitioner_id", practitioner.id)
    .gte("date", today);

  const profile = practitioner.profiles as { full_name: string; avatar_url: string | null };

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      {/* Practitioner header */}
      <div className="mb-8 text-center">
        {profile.avatar_url && (
          <img
            src={profile.avatar_url}
            alt={profile.full_name}
            className="mx-auto mb-4 h-20 w-20 rounded-full object-cover"
          />
        )}
        <h1 className="text-2xl font-bold">{profile.full_name}</h1>
        <p className="text-muted-foreground">{practitioner.specialty}</p>
        {practitioner.bio && (
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            {practitioner.bio}
          </p>
        )}
        <p className="mt-2 text-lg font-semibold">
          {practitioner.consultation_price}€
        </p>
      </div>

      <BookingWidget
        practitionerId={practitioner.id}
        practitionerName={profile.full_name}
        sessionDurations={practitioner.session_durations as number[]}
        rules={rules ?? []}
        exceptions={exceptions ?? []}
        timezone={practitioner.timezone as string}
      />
    </div>
  );
}
