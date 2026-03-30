-- Allow managed patients (created by practitioners, no auth account)
-- profile_id becomes nullable; name/email/phone stored directly on patients

ALTER TABLE patients ALTER COLUMN profile_id DROP NOT NULL;

ALTER TABLE patients ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone text;
