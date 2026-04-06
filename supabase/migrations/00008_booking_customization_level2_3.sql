-- Level 2: configurable sections
ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS testimonials jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS faq jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS gallery_images jsonb DEFAULT '[]'::jsonb;

-- Level 3: layout & design
ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS font_pair text NOT NULL DEFAULT 'modern',
  ADD COLUMN IF NOT EXISTS section_order jsonb DEFAULT '["hero","about","services","testimonials","faq","info","gallery","booking"]'::jsonb,
  ADD COLUMN IF NOT EXISTS hidden_sections jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cta_text text NOT NULL DEFAULT 'Prendre rendez-vous',
  ADD COLUMN IF NOT EXISTS layout_variant text NOT NULL DEFAULT 'classic';

COMMENT ON COLUMN public.practitioners.testimonials IS 'Array of {text, author, rating} for patient testimonials';
COMMENT ON COLUMN public.practitioners.faq IS 'Array of {question, answer} for FAQ section';
COMMENT ON COLUMN public.practitioners.social_links IS '{instagram?, linkedin?, doctolib?, website?}';
COMMENT ON COLUMN public.practitioners.gallery_images IS 'Array of image URLs for cabinet gallery';
COMMENT ON COLUMN public.practitioners.font_pair IS 'Typography: modern, classic, elegant, minimal, warm';
COMMENT ON COLUMN public.practitioners.section_order IS 'Ordered array of section IDs for page layout';
COMMENT ON COLUMN public.practitioners.hidden_sections IS 'Array of section IDs to hide';
COMMENT ON COLUMN public.practitioners.cta_text IS 'Custom CTA button text';
COMMENT ON COLUMN public.practitioners.layout_variant IS 'Page template: classic, modern, compact';
