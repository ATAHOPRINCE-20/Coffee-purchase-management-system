-- ─────────────────────────────────────────
-- FIX: Super Admin Data Access & Pyramid Visibility
-- ─────────────────────────────────────────

-- Goal: Ensure Super Admins can see ALL data across all tenants.
-- Also ensure the pyramid hierarchy works correctly for regular admins and agents.

-- 1. Helper for Super Admin check (already exists, but ensuring it's robust)
CREATE OR REPLACE FUNCTION is_super_admin_v4()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Super Admin');
END;
$$;

-- 2. Update Farmers Policy
DROP POLICY IF EXISTS "farmers_pyramid_v4" ON farmers;
CREATE POLICY "farmers_pyramid_v5" ON farmers
  FOR ALL USING (
    is_super_admin_v4() 
    OR admin_id IN (SELECT id FROM get_descendants_v4(auth.uid()))
  )
  WITH CHECK (
    is_super_admin_v4() 
    OR admin_id = auth.uid()
  );

-- 3. Update Purchases Policy
DROP POLICY IF EXISTS "purchases_select_v4" ON purchases;
DROP POLICY IF EXISTS "purchases_insert_v4" ON purchases;
DROP POLICY IF EXISTS "purchases_manage_v4" ON purchases;

CREATE POLICY "purchases_pyramid_v5" ON purchases
  FOR ALL USING (
    is_super_admin_v4() 
    OR admin_id IN (SELECT id FROM get_descendants_v4(auth.uid()))
  )
  WITH CHECK (
    is_super_admin_v4() 
    OR admin_id = auth.uid()
  );

-- 4. Update Advances Policy
DROP POLICY IF EXISTS "advances_pyramid_v4" ON advances;
CREATE POLICY "advances_pyramid_v5" ON advances
  FOR ALL USING (
    is_super_admin_v4() 
    OR admin_id IN (SELECT id FROM get_descendants_v4(auth.uid()))
  )
  WITH CHECK (
    is_super_admin_v4() 
    OR admin_id = auth.uid()
  );

-- 5. Update Expenses Policy
DROP POLICY IF EXISTS "expenses_pyramid_v4" ON expenses;
CREATE POLICY "expenses_pyramid_v5" ON expenses
  FOR ALL USING (
    is_super_admin_v4() 
    OR admin_id IN (SELECT id FROM get_descendants_v4(auth.uid()))
  )
  WITH CHECK (
    is_super_admin_v4() 
    OR admin_id = auth.uid()
  );

-- 6. Update Sales Policy
DROP POLICY IF EXISTS "sales_pyramid_v4" ON sales;
CREATE POLICY "sales_pyramid_v5" ON sales
  FOR ALL USING (
    is_super_admin_v4() 
    OR admin_id IN (SELECT id FROM get_descendants_v4(auth.uid()))
  )
  WITH CHECK (
    is_super_admin_v4() 
    OR admin_id = auth.uid()
  );

-- 7. Update Seasons Policy
DROP POLICY IF EXISTS "seasons_select_v4" ON seasons;
DROP POLICY IF EXISTS "seasons_manage_v4" ON seasons;
CREATE POLICY "seasons_pyramid_v5" ON seasons
  FOR ALL USING (
    is_super_admin_v4() 
    OR admin_id IN (SELECT id FROM get_descendants_v4(auth.uid()))
    OR admin_id IN (SELECT id FROM get_ancestors_v3(auth.uid()))
  )
  WITH CHECK (
    is_super_admin_v4() 
    OR admin_id = auth.uid()
  );

-- 8. Update Buying Prices Policy
DROP POLICY IF EXISTS "prices_select_v4" ON buying_prices;
DROP POLICY IF EXISTS "prices_manage_v4" ON buying_prices;
CREATE POLICY "prices_pyramid_v5" ON buying_prices
  FOR ALL USING (
    is_super_admin_v4() 
    OR admin_id IN (SELECT id FROM get_descendants_v4(auth.uid()))
    OR admin_id IN (SELECT id FROM get_ancestors_v3(auth.uid()))
  )
  WITH CHECK (
    is_super_admin_v4() 
    OR admin_id = auth.uid()
  );

-- 9. Update Company Profiles Policy
DROP POLICY IF EXISTS "company_profiles_select_v4" ON company_profiles;
DROP POLICY IF EXISTS "company_profiles_manage_v4" ON company_profiles;
CREATE POLICY "company_profiles_pyramid_v5" ON company_profiles
  FOR ALL USING (
    is_super_admin_v4() 
    OR admin_id IN (SELECT id FROM get_descendants_v4(auth.uid()))
    OR admin_id IN (SELECT id FROM get_ancestors_v3(auth.uid()))
  )
  WITH CHECK (
    is_super_admin_v4() 
    OR admin_id = auth.uid()
  );

-- 10. Update Agent Capital Advances Policy
DROP POLICY IF EXISTS "agent_capital_admin_v4" ON agent_capital_advances;
DROP POLICY IF EXISTS "agent_capital_agent_v4" ON agent_capital_advances;
CREATE POLICY "agent_capital_pyramid_v5" ON agent_capital_advances
    FOR ALL USING (
        is_super_admin_v4() 
        OR admin_id IN (SELECT id FROM get_descendants_v4(auth.uid()))
        OR agent_id = auth.uid()
    )
    WITH CHECK (
        is_super_admin_v4() 
        OR admin_id = auth.uid()
    );
