-- ============================================================
-- FIX: Core Multi-Tenancy & Agency Save
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Ensure all Admins point to themselves as their own root tenant
UPDATE profiles 
SET admin_id = id 
WHERE role = 'Admin' AND admin_id IS NULL;

-- 2. Create a trigger to automatically set admin_id for new Admins
CREATE OR REPLACE FUNCTION ensure_admin_id_on_profile()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'Admin' AND NEW.admin_id IS NULL THEN
        NEW.admin_id := NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_admin_id_trg ON profiles;
CREATE TRIGGER ensure_admin_id_trg
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE PROCEDURE ensure_admin_id_on_profile();

-- 3. Standardize the helper function
CREATE OR REPLACE FUNCTION get_my_admin_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT admin_id FROM profiles WHERE id = auth.uid();
$$;

-- 4. Re-apply Company Profiles Policies using the helper
-- This makes them identical to farmers/purchases/etc.
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_profiles_select" ON company_profiles;
CREATE POLICY "company_profiles_select" ON company_profiles
  FOR SELECT USING (admin_id = get_my_admin_id());

DROP POLICY IF EXISTS "company_profiles_insert" ON company_profiles;
CREATE POLICY "company_profiles_insert" ON company_profiles
  FOR INSERT WITH CHECK (admin_id = get_my_admin_id());

DROP POLICY IF EXISTS "company_profiles_update" ON company_profiles;
CREATE POLICY "company_profiles_update" ON company_profiles
  FOR UPDATE USING (admin_id = get_my_admin_id());

DROP POLICY IF EXISTS "company_profiles_delete" ON company_profiles;
CREATE POLICY "company_profiles_delete" ON company_profiles
  FOR DELETE USING (admin_id = get_my_admin_id());
