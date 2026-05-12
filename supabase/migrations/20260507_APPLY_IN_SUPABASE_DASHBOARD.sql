-- ====================================================================
-- REQUIRED: Run this entire block in your Supabase SQL Editor
-- Go to: https://app.supabase.com → Your Project → SQL Editor → New Query
-- Paste everything below and click RUN
-- ====================================================================

-- ─────────────────────────────────────────
-- PART 1: Fix RLS so Super Admins can see all data
-- and regular admins/agents see their own hierarchy
-- ─────────────────────────────────────────

-- Recreate helper functions (safe to re-run)
CREATE OR REPLACE FUNCTION get_my_admin_id_v4()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$ BEGIN RETURN (SELECT admin_id FROM public.profiles WHERE id = auth.uid()); END; $$;

CREATE OR REPLACE FUNCTION is_super_admin_v4()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public
AS $$ BEGIN RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Super Admin'); END; $$;

CREATE OR REPLACE FUNCTION get_descendants_v4(root_id uuid)
RETURNS TABLE (id uuid) LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  WITH RECURSIVE hierarchy AS (
    SELECT p.id FROM profiles p WHERE p.id = root_id
    UNION
    SELECT p.id FROM profiles p JOIN hierarchy h ON p.parent_id = h.id
  ) SELECT id FROM hierarchy;
$$;

CREATE OR REPLACE FUNCTION get_ancestors_v3(leaf_id uuid)
RETURNS TABLE (id uuid) LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  WITH RECURSIVE hierarchy AS (
    SELECT p.id, p.parent_id FROM profiles p WHERE p.id = leaf_id
    UNION
    SELECT p.id, p.parent_id FROM profiles p JOIN hierarchy h ON p.id = h.parent_id
  ) SELECT id FROM hierarchy;
$$;

-- Drop old v4 policies
DO $$ DECLARE p TEXT; t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['farmers','purchases','advances','buying_prices','expenses','sales','seasons','company_profiles','agent_capital_advances']) LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE tablename = t AND schemaname = 'public' AND policyname LIKE '%v4%' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p, t);
    END LOOP;
  END LOOP;
END $$;

-- FARMERS
DROP POLICY IF EXISTS "farmers_pyramid_v5" ON farmers;
CREATE POLICY "farmers_pyramid_v5" ON farmers FOR ALL
  USING (is_super_admin_v4() OR admin_id IN (SELECT id FROM get_descendants_v4(auth.uid())))
  WITH CHECK (is_super_admin_v4() OR admin_id = auth.uid());

-- PURCHASES
DROP POLICY IF EXISTS "purchases_pyramid_v5" ON purchases;
CREATE POLICY "purchases_pyramid_v5" ON purchases FOR ALL
  USING (is_super_admin_v4() OR admin_id IN (SELECT id FROM get_descendants_v4(auth.uid())))
  WITH CHECK (is_super_admin_v4() OR admin_id = auth.uid());

-- ADVANCES
DROP POLICY IF EXISTS "advances_pyramid_v5" ON advances;
CREATE POLICY "advances_pyramid_v5" ON advances FOR ALL
  USING (is_super_admin_v4() OR admin_id IN (SELECT id FROM get_descendants_v4(auth.uid())))
  WITH CHECK (is_super_admin_v4() OR admin_id = auth.uid());

-- BUYING_PRICES
DROP POLICY IF EXISTS "prices_pyramid_v5" ON buying_prices;
CREATE POLICY "prices_pyramid_v5" ON buying_prices FOR ALL
  USING (is_super_admin_v4() OR admin_id IN (SELECT id FROM get_descendants_v4(auth.uid())) OR admin_id IN (SELECT id FROM get_ancestors_v3(auth.uid())))
  WITH CHECK (is_super_admin_v4() OR admin_id = auth.uid());

-- EXPENSES
DROP POLICY IF EXISTS "expenses_pyramid_v5" ON expenses;
CREATE POLICY "expenses_pyramid_v5" ON expenses FOR ALL
  USING (is_super_admin_v4() OR admin_id IN (SELECT id FROM get_descendants_v4(auth.uid())))
  WITH CHECK (is_super_admin_v4() OR admin_id = auth.uid());

-- SALES
DROP POLICY IF EXISTS "sales_pyramid_v5" ON sales;
CREATE POLICY "sales_pyramid_v5" ON sales FOR ALL
  USING (is_super_admin_v4() OR admin_id IN (SELECT id FROM get_descendants_v4(auth.uid())))
  WITH CHECK (is_super_admin_v4() OR admin_id = auth.uid());

-- SEASONS
DROP POLICY IF EXISTS "seasons_pyramid_v5" ON seasons;
CREATE POLICY "seasons_pyramid_v5" ON seasons FOR ALL
  USING (is_super_admin_v4() OR admin_id IN (SELECT id FROM get_descendants_v4(auth.uid())) OR admin_id IN (SELECT id FROM get_ancestors_v3(auth.uid())))
  WITH CHECK (is_super_admin_v4() OR admin_id = auth.uid());

-- COMPANY_PROFILES
DROP POLICY IF EXISTS "company_profiles_pyramid_v5" ON company_profiles;
CREATE POLICY "company_profiles_pyramid_v5" ON company_profiles FOR ALL
  USING (is_super_admin_v4() OR admin_id IN (SELECT id FROM get_descendants_v4(auth.uid())) OR admin_id IN (SELECT id FROM get_ancestors_v3(auth.uid())))
  WITH CHECK (is_super_admin_v4() OR admin_id = auth.uid());


-- ─────────────────────────────────────────
-- PART 2: Add computed `remaining` column to advances
-- (Safe to run even if column already exists)
-- ─────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'advances' AND column_name = 'remaining'
  ) THEN
    ALTER TABLE advances ADD COLUMN remaining NUMERIC
      GENERATED ALWAYS AS (GREATEST(0, amount - deducted)) STORED;
  END IF;
END $$;


-- ─────────────────────────────────────────
-- PART 3: Ensure record_purchase_v1 RPC has EXECUTE permission
-- ─────────────────────────────────────────
GRANT EXECUTE ON FUNCTION record_purchase_v1 TO authenticated;
