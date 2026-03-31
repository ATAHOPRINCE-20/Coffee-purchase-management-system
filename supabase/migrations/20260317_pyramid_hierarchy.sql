-- ─────────────────────────────────────────
-- PYRAMID HIERARCHY MIGRATION
-- ─────────────────────────────────────────

-- 1. Update Profiles Table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES auth.users(id);

-- 2. Recursive function to get all descendants of a user
CREATE OR REPLACE FUNCTION get_descendants(root_id uuid)
RETURNS TABLE (id uuid) 
LANGUAGE sql STABLE
AS $$
  WITH RECURSIVE hierarchy AS (
    -- Base case: the user themselves
    SELECT p.id FROM profiles p WHERE p.id = root_id
    UNION
    -- Recursive step: find direct children
    SELECT p.id FROM profiles p
    JOIN hierarchy h ON p.parent_id = h.id
  )
  SELECT id FROM hierarchy;
$$;

-- 3. Update get_my_admin_id helper
-- In the pyramid model, "admin_id" is still useful as the "Branch Root"
-- but permissions will now primarily use hierarchy.
-- Keep the existing function if it's used elsewhere for "Tenant ID" grouping.

-- 4. Update RLS Policies for Profiles
-- A user should see themselves and any descendant.
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (
    id = auth.uid() 
    OR parent_id = auth.uid()
    OR admin_id = auth.uid() -- Root admins see all in branch
    OR id IN (SELECT get_descendants(auth.uid())) -- Full recursive visibility
  );

-- 5. Update RLS for Data Tables (recursive scoping)
-- This allows a user to see data created by themselves or any descendant.

-- FARMERS
DROP POLICY IF EXISTS "farmers_tenant" ON farmers;
CREATE POLICY "farmers_pyramid" ON farmers
  USING (admin_id IN (SELECT get_descendants(auth.uid())))
  WITH CHECK (admin_id = auth.uid()); -- Records always assigned to creator

-- PURCHASES
DROP POLICY IF EXISTS "purchases_tenant" ON purchases;
CREATE POLICY "purchases_pyramid" ON purchases
  USING (admin_id IN (SELECT get_descendants(auth.uid())))
  WITH CHECK (admin_id = auth.uid());

-- ADVANCES
DROP POLICY IF EXISTS "advances_tenant" ON advances;
CREATE POLICY "advances_pyramid" ON advances
  USING (admin_id IN (SELECT get_descendants(auth.uid())))
  WITH CHECK (admin_id = auth.uid());

-- BUYING_PRICES
-- Note: Prices might be shared by the whole branch (Admin sets prices for all)
-- or branch-specific. We'll stick to hierarchy for now.
DROP POLICY IF EXISTS "prices_tenant" ON buying_prices;
CREATE POLICY "prices_pyramid" ON buying_prices
  USING (admin_id IN (SELECT get_descendants(auth.uid())))
  WITH CHECK (admin_id = auth.uid());
