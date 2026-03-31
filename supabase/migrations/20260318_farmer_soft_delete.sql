-- ─────────────────────────────────────────
-- FARMER SOFT DELETE
-- ─────────────────────────────────────────

-- 1. Add deleted_at column to farmers
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Update RLS to exclude deleted farmers by default
-- Most queries will use this condition.
-- We'll update the existing "farmers_pyramid" policy from the previous migration.

DROP POLICY IF EXISTS "farmers_pyramid" ON farmers;
CREATE POLICY "farmers_pyramid_v2" ON farmers
  USING (
    admin_id IN (SELECT get_descendants(auth.uid()))
    AND deleted_at IS NULL
  )
  WITH CHECK (
    admin_id = auth.uid()
  );

-- 3. (Optional) Create a view or function for "All Farmers" including deleted if needed
-- For now, we'll just filter in the policy.
