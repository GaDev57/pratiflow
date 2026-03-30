-- Allow public read of practitioner profiles (needed for /book/[slug] pages)
CREATE POLICY profiles_select_practitioners ON profiles
  FOR SELECT
  USING (role = 'practitioner');
