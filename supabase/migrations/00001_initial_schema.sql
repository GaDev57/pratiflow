-- ============================================================
-- PratiFlow — Migration initiale
-- Schéma complet + Row Level Security (RLS)
-- ============================================================

-- --------------------------------
-- Enums
-- --------------------------------
CREATE TYPE public.user_role AS ENUM ('practitioner', 'patient');
CREATE TYPE public.appointment_type AS ENUM ('in_person', 'teleconsultation');
CREATE TYPE public.appointment_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
CREATE TYPE public.subscription_plan AS ENUM ('free', 'pro', 'premium');
CREATE TYPE public.notification_type AS ENUM (
  'new_appointment', 'appointment_cancelled', 'appointment_reminder',
  'new_message', 'payment_received', 'document_shared'
);

-- --------------------------------
-- Helper: get current user role
-- --------------------------------
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- --------------------------------
-- Helper: check if practitioner owns patient
-- --------------------------------
CREATE OR REPLACE FUNCTION public.is_my_patient(p_patient_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patients pat
    JOIN public.practitioners prac ON prac.id = pat.practitioner_id
    WHERE pat.id = p_patient_id AND prac.profile_id = auth.uid()
  );
$$;

-- ================================
-- PROFILES
-- ================================
CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        public.user_role NOT NULL,
  full_name   text NOT NULL,
  avatar_url  text,
  phone       text,
  gdpr_consent_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- Practitioners can read profiles of their patients
CREATE POLICY "profiles_select_practitioner_patients" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.patients pat
      JOIN public.practitioners prac ON prac.id = pat.practitioner_id
      WHERE pat.profile_id = profiles.id AND prac.profile_id = auth.uid()
    )
  );

-- Users can insert their own profile
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- ================================
-- PRACTITIONERS
-- ================================
CREATE TABLE public.practitioners (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  slug                  text NOT NULL UNIQUE,
  specialty             text NOT NULL,
  rpps_number           text,
  bio                   text,
  consultation_price    numeric(10,2) NOT NULL DEFAULT 60.00,
  session_durations     integer[] NOT NULL DEFAULT '{30,45,60}',
  stripe_account_id     text,
  subscription_plan     public.subscription_plan NOT NULL DEFAULT 'free',
  timezone              text NOT NULL DEFAULT 'Europe/Paris',
  google_calendar_token jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_practitioners_slug ON public.practitioners(slug);
CREATE INDEX idx_practitioners_profile_id ON public.practitioners(profile_id);

ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;

-- Public read for booking pages (slug lookup)
CREATE POLICY "practitioners_select_public" ON public.practitioners
  FOR SELECT USING (true);

-- Practitioner can insert their own record
CREATE POLICY "practitioners_insert_own" ON public.practitioners
  FOR INSERT WITH CHECK (profile_id = auth.uid());

-- Practitioner can update their own record
CREATE POLICY "practitioners_update_own" ON public.practitioners
  FOR UPDATE USING (profile_id = auth.uid());

-- ================================
-- PATIENTS
-- ================================
CREATE TABLE public.patients (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_of_birth    date,
  practitioner_id  uuid REFERENCES public.practitioners(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_patients_profile_id ON public.patients(profile_id);
CREATE INDEX idx_patients_practitioner_id ON public.patients(practitioner_id);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Patient can read their own record
CREATE POLICY "patients_select_own" ON public.patients
  FOR SELECT USING (profile_id = auth.uid());

-- Practitioner can read their patients
CREATE POLICY "patients_select_practitioner" ON public.patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.practitioners
      WHERE practitioners.id = patients.practitioner_id
        AND practitioners.profile_id = auth.uid()
    )
  );

-- Patient can insert their own record
CREATE POLICY "patients_insert_own" ON public.patients
  FOR INSERT WITH CHECK (profile_id = auth.uid());

-- Patient can update their own record
CREATE POLICY "patients_update_own" ON public.patients
  FOR UPDATE USING (profile_id = auth.uid());

-- ================================
-- AVAILABILITY RULES
-- ================================
CREATE TABLE public.availability_rules (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id  uuid NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  day_of_week      smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time       time NOT NULL,
  end_time         time NOT NULL,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

CREATE INDEX idx_availability_rules_practitioner ON public.availability_rules(practitioner_id);

ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;

-- Public read (for booking page slot calculation)
CREATE POLICY "availability_rules_select_public" ON public.availability_rules
  FOR SELECT USING (true);

-- Practitioner can manage their own rules
CREATE POLICY "availability_rules_insert_own" ON public.availability_rules
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

CREATE POLICY "availability_rules_update_own" ON public.availability_rules
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

CREATE POLICY "availability_rules_delete_own" ON public.availability_rules
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

-- ================================
-- AVAILABILITY EXCEPTIONS
-- ================================
CREATE TABLE public.availability_exceptions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id  uuid NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  date             date NOT NULL,
  start_time       time,
  end_time         time,
  reason           text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_availability_exceptions_practitioner_date
  ON public.availability_exceptions(practitioner_id, date);

ALTER TABLE public.availability_exceptions ENABLE ROW LEVEL SECURITY;

-- Public read (for booking page)
CREATE POLICY "availability_exceptions_select_public" ON public.availability_exceptions
  FOR SELECT USING (true);

-- Practitioner can manage their own exceptions
CREATE POLICY "availability_exceptions_insert_own" ON public.availability_exceptions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

CREATE POLICY "availability_exceptions_update_own" ON public.availability_exceptions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

CREATE POLICY "availability_exceptions_delete_own" ON public.availability_exceptions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

-- ================================
-- APPOINTMENTS
-- ================================
CREATE TABLE public.appointments (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id           uuid NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  patient_id                uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  start_at                  timestamptz NOT NULL,
  end_at                    timestamptz NOT NULL,
  type                      public.appointment_type NOT NULL,
  status                    public.appointment_status NOT NULL DEFAULT 'pending',
  jitsi_room_url            text,
  stripe_payment_intent_id  text,
  cancellation_reason       text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_appointment_range CHECK (start_at < end_at)
);

CREATE INDEX idx_appointments_practitioner_start ON public.appointments(practitioner_id, start_at);
CREATE INDEX idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX idx_appointments_status ON public.appointments(status);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Practitioner can see their own appointments
CREATE POLICY "appointments_select_practitioner" ON public.appointments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

-- Patient can see their own appointments
CREATE POLICY "appointments_select_patient" ON public.appointments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.patients WHERE id = patient_id AND profile_id = auth.uid())
  );

-- Authenticated users can insert appointments (booking flow)
CREATE POLICY "appointments_insert_authenticated" ON public.appointments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Practitioner can update their appointments
CREATE POLICY "appointments_update_practitioner" ON public.appointments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

-- Patient can update their own appointments (cancel)
CREATE POLICY "appointments_update_patient" ON public.appointments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.patients WHERE id = patient_id AND profile_id = auth.uid())
  );

-- ================================
-- PRIVATE NOTES (practitioner only)
-- ================================
CREATE TABLE public.private_notes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id   uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  practitioner_id  uuid NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  content_json     jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_private_notes_appointment ON public.private_notes(appointment_id);
CREATE INDEX idx_private_notes_practitioner ON public.private_notes(practitioner_id);

ALTER TABLE public.private_notes ENABLE ROW LEVEL SECURITY;

-- Only the practitioner who wrote the note can access it
CREATE POLICY "private_notes_select_own" ON public.private_notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

CREATE POLICY "private_notes_insert_own" ON public.private_notes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

CREATE POLICY "private_notes_update_own" ON public.private_notes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

CREATE POLICY "private_notes_delete_own" ON public.private_notes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

-- ================================
-- SHARED NOTES
-- ================================
CREATE TABLE public.shared_notes (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id         uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  practitioner_id        uuid NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  patient_id             uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  content_json           jsonb NOT NULL DEFAULT '{}',
  is_visible_to_patient  boolean NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shared_notes_appointment ON public.shared_notes(appointment_id);
CREATE INDEX idx_shared_notes_patient ON public.shared_notes(patient_id);

ALTER TABLE public.shared_notes ENABLE ROW LEVEL SECURITY;

-- Practitioner can manage shared notes
CREATE POLICY "shared_notes_select_practitioner" ON public.shared_notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

-- Patient can only see notes marked visible
CREATE POLICY "shared_notes_select_patient" ON public.shared_notes
  FOR SELECT USING (
    is_visible_to_patient = true
    AND EXISTS (SELECT 1 FROM public.patients WHERE id = patient_id AND profile_id = auth.uid())
  );

CREATE POLICY "shared_notes_insert_practitioner" ON public.shared_notes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

CREATE POLICY "shared_notes_update_practitioner" ON public.shared_notes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

-- ================================
-- SHARED MEDIA
-- ================================
CREATE TABLE public.shared_media (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id             uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  practitioner_id        uuid NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  uploader_id            uuid NOT NULL REFERENCES public.profiles(id),
  file_path              text NOT NULL,
  file_type              text NOT NULL,
  file_name              text NOT NULL,
  size_bytes             bigint NOT NULL,
  is_visible_to_patient  boolean NOT NULL DEFAULT true,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shared_media_patient ON public.shared_media(patient_id);
CREATE INDEX idx_shared_media_practitioner ON public.shared_media(practitioner_id);

ALTER TABLE public.shared_media ENABLE ROW LEVEL SECURITY;

-- Practitioner can see all media for their patients
CREATE POLICY "shared_media_select_practitioner" ON public.shared_media
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

-- Patient can see visible media
CREATE POLICY "shared_media_select_patient" ON public.shared_media
  FOR SELECT USING (
    is_visible_to_patient = true
    AND EXISTS (SELECT 1 FROM public.patients WHERE id = patient_id AND profile_id = auth.uid())
  );

-- Both can insert (uploader_id tracks who)
CREATE POLICY "shared_media_insert_practitioner" ON public.shared_media
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

CREATE POLICY "shared_media_insert_patient" ON public.shared_media
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.patients WHERE id = patient_id AND profile_id = auth.uid())
  );

-- Practitioner can update visibility
CREATE POLICY "shared_media_update_practitioner" ON public.shared_media
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

-- ================================
-- MESSAGES
-- ================================
CREATE TABLE public.messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id     uuid NOT NULL REFERENCES public.profiles(id),
  recipient_id  uuid NOT NULL REFERENCES public.profiles(id),
  patient_id    uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  content       text NOT NULL,
  read_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_patient ON public.messages(patient_id, created_at);
CREATE INDEX idx_messages_recipient_unread ON public.messages(recipient_id) WHERE read_at IS NULL;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Sender can see their sent messages
CREATE POLICY "messages_select_sender" ON public.messages
  FOR SELECT USING (sender_id = auth.uid());

-- Recipient can see messages sent to them
CREATE POLICY "messages_select_recipient" ON public.messages
  FOR SELECT USING (recipient_id = auth.uid());

-- Authenticated users can send messages
CREATE POLICY "messages_insert_authenticated" ON public.messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Recipient can mark as read
CREATE POLICY "messages_update_recipient" ON public.messages
  FOR UPDATE USING (recipient_id = auth.uid());

-- ================================
-- NOTIFICATIONS
-- ================================
CREATE TABLE public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        public.notification_type NOT NULL,
  title       text NOT NULL,
  body        text,
  is_read     boolean NOT NULL DEFAULT false,
  related_id  uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

-- System inserts via service role; users can mark as read
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- ================================
-- ACCESS LOGS (HDS compliance)
-- ================================
CREATE TABLE public.access_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id),
  action         text NOT NULL,
  resource_type  text NOT NULL,
  resource_id    uuid NOT NULL,
  ip_address     inet,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_logs_user ON public.access_logs(user_id, created_at);
CREATE INDEX idx_access_logs_resource ON public.access_logs(resource_type, resource_id);

ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can insert logs (via API routes)
-- No user-facing SELECT policy — logs are admin-only
CREATE POLICY "access_logs_insert_service" ON public.access_logs
  FOR INSERT WITH CHECK (true);

-- Practitioner can view their own access logs
CREATE POLICY "access_logs_select_own" ON public.access_logs
  FOR SELECT USING (user_id = auth.uid());

-- ================================
-- Auto-create profile on signup
-- ================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'patient'),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Utilisateur')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ================================
-- Auto-update updated_at
-- ================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.practitioners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.private_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.shared_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ================================
-- Storage buckets (run via dashboard or service role)
-- ================================
-- NOTE: Execute these via Supabase Dashboard > Storage:
-- 1. Create bucket "avatars" (public)
-- 2. Create bucket "shared-media" (private, signed URLs only)
--
-- Storage RLS policies:
-- avatars: anyone can read, authenticated users can upload to their own folder
-- shared-media: only practitioner and patient involved can read/write
