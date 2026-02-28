-- ============================================================
-- Multi-Tenant Migration — run this entire file at once
-- Supabase Dashboard → SQL Editor → paste all → Run
-- ============================================================

-- ─────────────────────────────────────────
-- STEP 1: PROFILES TABLE (must run first)
-- ─────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES auth.users(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active'
  CHECK (status IN ('Active', 'Inactive'));

-- Backfill: existing Admins point to themselves
UPDATE profiles SET admin_id = id WHERE role = 'Admin' AND admin_id IS NULL;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (
    admin_id = auth.uid()
    OR id = auth.uid()
  );

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- ─────────────────────────────────────────
-- STEP 2: FARMERS TABLE
-- (profiles.admin_id must exist — Step 1 above ensures this)
-- ─────────────────────────────────────────
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES auth.users(id);

ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "farmers_tenant" ON farmers;
CREATE POLICY "farmers_tenant" ON farmers
  USING (
    admin_id = (SELECT admin_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    admin_id = (SELECT admin_id FROM profiles WHERE id = auth.uid())
  );

-- ─────────────────────────────────────────
-- STEP 3: PURCHASES TABLE
-- ─────────────────────────────────────────
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES auth.users(id);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchases_tenant" ON purchases;
CREATE POLICY "purchases_tenant" ON purchases
  USING (
    admin_id = (SELECT admin_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    admin_id = (SELECT admin_id FROM profiles WHERE id = auth.uid())
  );

-- ─────────────────────────────────────────
-- STEP 4: ADVANCES TABLE
-- ─────────────────────────────────────────
ALTER TABLE advances ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES auth.users(id);

ALTER TABLE advances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "advances_tenant" ON advances;
CREATE POLICY "advances_tenant" ON advances
  USING (
    admin_id = (SELECT admin_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    admin_id = (SELECT admin_id FROM profiles WHERE id = auth.uid())
  );

-- ─────────────────────────────────────────
-- STEP 5: BUYING_PRICES TABLE
-- ─────────────────────────────────────────
ALTER TABLE buying_prices ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES auth.users(id);

ALTER TABLE buying_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prices_tenant" ON buying_prices;
CREATE POLICY "prices_tenant" ON buying_prices
  USING (
    admin_id = (SELECT admin_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    admin_id = (SELECT admin_id FROM profiles WHERE id = auth.uid())
  );

-- ─────────────────────────────────────────
-- STEP 6: HELPER FUNCTION
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_my_admin_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT admin_id FROM profiles WHERE id = auth.uid();
$$;
