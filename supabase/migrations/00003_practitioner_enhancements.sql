-- ============================================================
-- PratiFlow — Migration 00003
-- Enrichissement praticien, modèles de documents, questionnaires
-- Création de fiches patients par le praticien
-- ============================================================

-- --------------------------------
-- Nouvelles colonnes sur practitioners
-- --------------------------------
ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS services jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS hero_image_url text;

-- ================================
-- DOCUMENT CATEGORIES
-- ================================
CREATE TABLE public.document_categories (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id  uuid NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  name             text NOT NULL,
  description      text,
  color            text NOT NULL DEFAULT '#6B7280',
  sort_order       integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_categories_practitioner
  ON public.document_categories(practitioner_id, sort_order);

ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_categories_select_own" ON public.document_categories
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

CREATE POLICY "document_categories_insert_own" ON public.document_categories
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

CREATE POLICY "document_categories_update_own" ON public.document_categories
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

CREATE POLICY "document_categories_delete_own" ON public.document_categories
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

-- ================================
-- DOCUMENT TEMPLATES
-- ================================
CREATE TABLE public.document_templates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id       uuid NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  category_id           uuid REFERENCES public.document_categories(id) ON DELETE SET NULL,
  title                 text NOT NULL,
  template_type         text NOT NULL DEFAULT 'rich_text' CHECK (template_type IN ('rich_text', 'pdf', 'questionnaire')),
  content_json          jsonb NOT NULL DEFAULT '{}',
  file_path             text,
  file_type             text,
  is_questionnaire      boolean NOT NULL DEFAULT false,
  questionnaire_fields  jsonb DEFAULT '[]',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_templates_practitioner
  ON public.document_templates(practitioner_id);
CREATE INDEX idx_document_templates_category
  ON public.document_templates(category_id);

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_templates_select_own" ON public.document_templates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

CREATE POLICY "document_templates_insert_own" ON public.document_templates
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

CREATE POLICY "document_templates_update_own" ON public.document_templates
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

CREATE POLICY "document_templates_delete_own" ON public.document_templates
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

-- Auto-update timestamps
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ================================
-- QUESTIONNAIRE RESPONSES
-- ================================
CREATE TABLE public.questionnaire_responses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id      uuid NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
  patient_id       uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  practitioner_id  uuid NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  responses        jsonb NOT NULL DEFAULT '{}',
  submitted_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_questionnaire_responses_patient
  ON public.questionnaire_responses(patient_id);
CREATE INDEX idx_questionnaire_responses_practitioner
  ON public.questionnaire_responses(practitioner_id);
CREATE INDEX idx_questionnaire_responses_template
  ON public.questionnaire_responses(template_id);

ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;

-- Practitioner can see responses for their patients
CREATE POLICY "questionnaire_responses_select_practitioner" ON public.questionnaire_responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

-- Patient can see their own responses
CREATE POLICY "questionnaire_responses_select_patient" ON public.questionnaire_responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.patients WHERE id = patient_id AND profile_id = auth.uid())
  );

-- Practitioner can create questionnaire assignments
CREATE POLICY "questionnaire_responses_insert_practitioner" ON public.questionnaire_responses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.practitioners WHERE id = practitioner_id AND profile_id = auth.uid())
  );

-- Patient can update their own responses (fill in answers)
CREATE POLICY "questionnaire_responses_update_patient" ON public.questionnaire_responses
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.patients WHERE id = patient_id AND profile_id = auth.uid())
  );

-- Patient can also see templates that have been assigned to them (via questionnaire_responses)
CREATE POLICY "document_templates_select_patient_assigned" ON public.document_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.questionnaire_responses qr
      JOIN public.patients p ON p.id = qr.patient_id
      WHERE qr.template_id = document_templates.id
        AND p.profile_id = auth.uid()
    )
  );

-- ================================
-- RLS: Allow practitioners to create patient profiles & records
-- ================================

-- Practitioners can insert profiles for new patients
CREATE POLICY "profiles_insert_practitioner_patient" ON public.profiles
  FOR INSERT WITH CHECK (
    role = 'patient'
    AND public.get_my_role() = 'practitioner'
  );

-- Practitioners can insert patients linked to themselves
CREATE POLICY "patients_insert_practitioner" ON public.patients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.practitioners
      WHERE practitioners.id = patients.practitioner_id
        AND practitioners.profile_id = auth.uid()
    )
  );

-- Practitioners can update their patients
CREATE POLICY "patients_update_practitioner" ON public.patients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.practitioners
      WHERE practitioners.id = patients.practitioner_id
        AND practitioners.profile_id = auth.uid()
    )
  );
