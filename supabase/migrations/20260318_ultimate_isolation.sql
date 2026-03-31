-- ─────────────────────────────────────────
-- ULTIMATE DATA ISOLATION (FIXED RECURSION)
-- ─────────────────────────────────────────

-- Standardize all tables and fix the infinite loop in profiles.

DO $$ 
DECLARE 
    t TEXT;
    p TEXT;
BEGIN
    -- Loop through ALL tables including profiles
    FOR t IN SELECT unnest(ARRAY['profiles', 'farmers', 'purchases', 'advances', 'buying_prices', 'expenses', 'sales', 'sale_reports', 'seasons', 'company_profiles'])
    LOOP
        FOR p IN SELECT policyname FROM pg_policies WHERE tablename = t AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p, t);
        END LOOP;
    END LOOP;
END $$;

-- ─────────────────────────────────────────
-- SECURE HELPERS (BYPASS RLS)
-- ─────────────────────────────────────────

-- These MUST be SECURITY DEFINER to avoid recursion.
-- We use a single materialized call if possible.

CREATE OR REPLACE FUNCTION get_my_admin_id_v4()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT admin_id FROM public.profiles WHERE id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION is_super_admin_v4()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Super Admin');
END;
$$;

CREATE OR REPLACE FUNCTION get_descendants_v4(root_id uuid)
RETURNS TABLE (id uuid) 
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  WITH RECURSIVE hierarchy AS (
    SELECT p.id FROM profiles p WHERE p.id = root_id
    UNION
    SELECT p.id FROM profiles p
    JOIN hierarchy h ON p.parent_id = h.id
  )
  SELECT id FROM hierarchy;
$$;

CREATE OR REPLACE FUNCTION get_ancestors_v3(leaf_id uuid)
RETURNS TABLE (id uuid) 
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  WITH RECURSIVE hierarchy AS (
    SELECT p.id, p.parent_id FROM profiles p WHERE p.id = leaf_id
    UNION
    SELECT p.id, p.parent_id FROM profiles p
    JOIN hierarchy h ON p.id = h.parent_id
  )
  SELECT id FROM hierarchy;
$$;

-- ─────────────────────────────────────────
-- 1. PROFILES (The core of the recursion)
-- ─────────────────────────────────────────
-- Basic rule: You see yourself, your branch, or if you are super admin.
-- We use the safe helper get_my_admin_id_v4() to avoid recursion.

CREATE POLICY "profiles_select_v4" ON profiles
    FOR SELECT USING (
        id = auth.uid() 
        OR admin_id = get_my_admin_id_v4()
        OR is_super_admin_v4()
    );

CREATE POLICY "profiles_update_v4" ON profiles
    FOR UPDATE USING (
        id = auth.uid() 
        OR parent_id = auth.uid()
        OR admin_id = auth.uid()
    );

-- ─────────────────────────────────────────
-- 2. DATA TABLES (Standardized)
-- ─────────────────────────────────────────

-- FARMERS
CREATE POLICY "farmers_pyramid_v4" ON farmers
  FOR ALL USING (admin_id IN (SELECT get_descendants_v4(auth.uid())))
  WITH CHECK (admin_id = auth.uid());

-- PURCHASES
CREATE POLICY "purchases_select_v4" ON purchases
  FOR SELECT USING (admin_id IN (SELECT get_descendants_v4(auth.uid())));
CREATE POLICY "purchases_insert_v4" ON purchases
  FOR INSERT WITH CHECK (admin_id = auth.uid());
CREATE POLICY "purchases_manage_v4" ON purchases
  FOR ALL USING (admin_id = auth.uid());

-- ADVANCES
CREATE POLICY "advances_pyramid_v4" ON advances
  FOR ALL USING (admin_id IN (SELECT get_descendants_v4(auth.uid())))
  WITH CHECK (admin_id = auth.uid());

-- BUYING_PRICES (Visible up and down)
CREATE POLICY "prices_select_v4" ON buying_prices
  FOR SELECT USING (
    admin_id IN (SELECT get_ancestors_v3(auth.uid()))
    OR admin_id IN (SELECT get_descendants_v4(auth.uid()))
  );
CREATE POLICY "prices_manage_v4" ON buying_prices
  FOR ALL USING (admin_id = auth.uid());

-- EXPENSES
CREATE POLICY "expenses_pyramid_v4" ON expenses
  FOR ALL USING (admin_id IN (SELECT get_descendants_v4(auth.uid())))
  WITH CHECK (admin_id = auth.uid());

-- SALES
CREATE POLICY "sales_pyramid_v4" ON sales
  FOR ALL USING (admin_id IN (SELECT get_descendants_v4(auth.uid())))
  WITH CHECK (admin_id = auth.uid());

-- SEASONS
CREATE POLICY "seasons_select_v4" ON seasons
  FOR SELECT USING (
    admin_id IN (SELECT get_ancestors_v3(auth.uid()))
    OR admin_id IN (SELECT get_descendants_v4(auth.uid()))
  );
CREATE POLICY "seasons_manage_v4" ON seasons
  FOR ALL USING (admin_id = auth.uid());

-- COMPANY_PROFILES
CREATE POLICY "company_profiles_select_v4" ON company_profiles
  FOR SELECT USING (
    admin_id IN (SELECT get_ancestors_v3(auth.uid()))
    OR admin_id IN (SELECT get_descendants_v4(auth.uid()))
  );
CREATE POLICY "company_profiles_manage_v4" ON company_profiles
  FOR ALL USING (admin_id = auth.uid());

-- AGENT_CAPITAL_ADVANCES
CREATE POLICY "agent_capital_admin_v4" ON agent_capital_advances
    FOR ALL USING (admin_id = auth.uid());
CREATE POLICY "agent_capital_agent_v4" ON agent_capital_advances
    FOR SELECT USING (agent_id = auth.uid());
