-- ─────────────────────────────────────────
-- FIX RLS RECURSION (CRITICAL LOGIN FIX)
-- ─────────────────────────────────────────

-- 1. Create a version of get_descendants that skips RLS checks
-- This prevents the "infinite loop" when profiles table tries to check its own rows.
CREATE OR REPLACE FUNCTION get_descendants_v2(root_id uuid)
RETURNS TABLE (id uuid) 
LANGUAGE sql SECURITY DEFINER -- Bypasses RLS
STABLE
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

-- 2. Drop the old recursive policies that were causing loops
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_select_branch" ON profiles;

-- 3. Create a clean, non-recursive select policy
-- Every user can ALWAYS see their own profile.
-- Users can see descendants using the security-definer function (v2).
CREATE POLICY "profiles_select_v2" ON profiles
    FOR SELECT USING (
        id = auth.uid() 
        OR admin_id = auth.uid() -- Root admins see all in branch
        OR id IN (SELECT get_descendants_v2(auth.uid()))
    );

-- 4. Update data tables to use the v2 function
-- This ensures that querying purchases/expenses also doesn't trigger loops.

DROP POLICY IF EXISTS "farmers_pyramid" ON farmers;
CREATE POLICY "farmers_pyramid_v2" ON farmers
  USING (admin_id IN (SELECT get_descendants_v2(auth.uid())));

DROP POLICY IF EXISTS "purchases_pyramid" ON purchases;
CREATE POLICY "purchases_pyramid_v2" ON purchases
  USING (admin_id IN (SELECT get_descendants_v2(auth.uid())));

DROP POLICY IF EXISTS "advances_pyramid" ON advances;
CREATE POLICY "advances_pyramid_v2" ON advances
  USING (admin_id IN (SELECT get_descendants_v2(auth.uid())));

DROP POLICY IF EXISTS "prices_pyramid" ON buying_prices;
CREATE POLICY "prices_pyramid_v2" ON buying_prices
  USING (admin_id IN (SELECT get_descendants_v2(auth.uid())));
