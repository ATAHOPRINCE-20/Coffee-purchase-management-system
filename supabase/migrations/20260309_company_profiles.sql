-- ============================================================
-- Company Profiles Migration
-- Supabase Dashboard → SQL Editor → paste all → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS company_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) NOT NULL UNIQUE,
  name text NOT NULL,
  phone text,
  email text,
  location text,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

-- Policies (Fixed to use get_my_admin_id helper)
DROP POLICY IF EXISTS "company_profiles_select" ON company_profiles;
CREATE POLICY "company_profiles_select" ON company_profiles
  FOR SELECT USING (admin_id = get_my_admin_id());

DROP POLICY IF EXISTS "company_profiles_insert" ON company_profiles;
CREATE POLICY "company_profiles_insert" ON company_profiles
  FOR INSERT WITH CHECK (admin_id = get_my_admin_id());

DROP POLICY IF EXISTS "company_profiles_update" ON company_profiles;
CREATE POLICY "company_profiles_update" ON company_profiles
  FOR UPDATE USING (admin_id = get_my_admin_id());

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_company_profiles_updated_at ON company_profiles;
CREATE TRIGGER update_company_profiles_updated_at
    BEFORE UPDATE ON company_profiles
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
