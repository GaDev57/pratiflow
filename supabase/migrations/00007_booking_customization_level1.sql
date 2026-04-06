-- Add custom color fields and logo shape to practitioners
ALTER TABLE public.practitioners
  ADD COLUMN IF NOT EXISTS custom_primary_color text,
  ADD COLUMN IF NOT EXISTS custom_secondary_color text,
  ADD COLUMN IF NOT EXISTS logo_shape text NOT NULL DEFAULT 'round';

COMMENT ON COLUMN public.practitioners.custom_primary_color IS 'Custom hex color for booking page (overrides theme preset)';
COMMENT ON COLUMN public.practitioners.custom_secondary_color IS 'Custom secondary hex color (lighter shade, auto-generated if null)';
COMMENT ON COLUMN public.practitioners.logo_shape IS 'Logo display shape: round, square, rectangle';
