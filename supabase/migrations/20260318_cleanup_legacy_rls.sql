-- ─────────────────────────────────────────
-- RLS CLEANUP (RESTORE DATA ISOLATION)
-- ─────────────────────────────────────────

-- This migration removes old "tenant" policies that might be overlapping
-- with the new Pyramid Hierarchy (v2) policies, which was causing data leaks.

-- 1. FARMERS
DROP POLICY IF EXISTS "farmers_tenant" ON farmers;

-- 2. PURCHASES
DROP POLICY IF EXISTS "purchases_tenant" ON purchases;

-- 3. ADVANCES
DROP POLICY IF EXISTS "advances_tenant" ON advances;

-- 4. BUYING_PRICES
DROP POLICY IF EXISTS "prices_tenant" ON buying_prices;

-- 5. EXPENSES
DROP POLICY IF EXISTS "expenses_tenant" ON expenses;

-- 6. SEASONS
DROP POLICY IF EXISTS "seasons_tenant" ON seasons;

-- 7. Ensure PROFILES isolation
-- Users should never see admin_id directly unless they are the admin or related.
-- The existing profiles_select_v2 already handles this correctly.

-- Final Check:
-- After running this, only the *_pyramid_v2 policies should remain,
-- which use get_descendants_v2() to strictly scope data.
