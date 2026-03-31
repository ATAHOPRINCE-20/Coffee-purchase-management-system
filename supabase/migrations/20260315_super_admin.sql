-- ============================================================
-- Super Admin Migration
-- ============================================================

-- 0. Update the Role CHECK constraint on the profiles table
-- Supabase check constraints need to be dropped and recreated to be updated
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('Admin', 'Manager', 'Field Agent', 'Super Admin'));

-- 1. Create a helper function to securely check if the current user is a Super Admin
-- This must be SECURITY DEFINER to bypass RLS and avoid infinite recursion
-- when used in the profiles table's own RLS policies.
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN v_role = 'Super Admin';
END;
$$;

-- 2. Update PROFILES RLS
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (
    is_super_admin()
    OR admin_id = auth.uid()
    OR id = auth.uid()
  );

-- 3. Update FARMERS RLS
DROP POLICY IF EXISTS "farmers_tenant" ON farmers;
CREATE POLICY "farmers_tenant" ON farmers
  FOR ALL USING (
    is_super_admin() OR admin_id = get_my_admin_id()
  ) WITH CHECK (
    is_super_admin() OR admin_id = get_my_admin_id()
  );

-- 4. Update PURCHASES RLS
DROP POLICY IF EXISTS "purchases_tenant" ON purchases;
CREATE POLICY "purchases_tenant" ON purchases
  FOR ALL USING (
    is_super_admin() OR admin_id = get_my_admin_id()
  ) WITH CHECK (
    is_super_admin() OR admin_id = get_my_admin_id()
  );

-- 5. Update ADVANCES RLS
DROP POLICY IF EXISTS "advances_tenant" ON advances;
CREATE POLICY "advances_tenant" ON advances
  FOR ALL USING (
    is_super_admin() OR admin_id = get_my_admin_id()
  ) WITH CHECK (
    is_super_admin() OR admin_id = get_my_admin_id()
  );

-- 6. Update BUYING_PRICES RLS
DROP POLICY IF EXISTS "prices_tenant" ON buying_prices;
CREATE POLICY "prices_tenant" ON buying_prices
  FOR ALL USING (
    is_super_admin() OR admin_id = get_my_admin_id()
  ) WITH CHECK (
    is_super_admin() OR admin_id = get_my_admin_id()
  );

-- 7. Update EXPENSES RLS
DROP POLICY IF EXISTS "expenses_tenant" ON expenses;
CREATE POLICY "expenses_tenant" ON expenses
  FOR ALL USING (
    is_super_admin() OR admin_id = get_my_admin_id()
  ) WITH CHECK (
    is_super_admin() OR admin_id = get_my_admin_id()
  );

-- 8. Update SALES RLS
DROP POLICY IF EXISTS "sales_tenant" ON sales;
CREATE POLICY "sales_tenant" ON sales
  FOR ALL USING (
    is_super_admin() OR admin_id = get_my_admin_id()
  ) WITH CHECK (
    is_super_admin() OR admin_id = get_my_admin_id()
  );

-- 9. Update SEASONS RLS
DROP POLICY IF EXISTS "seasons_tenant" ON seasons;
CREATE POLICY "seasons_tenant" ON seasons
  FOR ALL USING (
    is_super_admin() OR admin_id = get_my_admin_id()
  ) WITH CHECK (
    is_super_admin() OR admin_id = get_my_admin_id()
  );

-- 10. Update SALE_REPORTS RLS
DROP POLICY IF EXISTS "sale_reports_tenant" ON sale_reports;
CREATE POLICY "sale_reports_tenant" ON sale_reports
  FOR ALL USING (
    is_super_admin() OR admin_id = get_my_admin_id()
  ) WITH CHECK (
    is_super_admin() OR admin_id = get_my_admin_id()
  );

-- 11. Update SETTINGS/COMPANY_PROFILES RLS
DROP POLICY IF EXISTS "company_profiles_tenant" ON company_profiles;
CREATE POLICY "company_profiles_tenant" ON company_profiles
  FOR ALL USING (
    is_super_admin() OR admin_id = get_my_admin_id()
  ) WITH CHECK (
    is_super_admin() OR admin_id = get_my_admin_id()
  );
