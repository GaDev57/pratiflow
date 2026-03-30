-- Booking page branding: logo + color theme (Pro/Premium feature)
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS booking_theme text DEFAULT 'default';
