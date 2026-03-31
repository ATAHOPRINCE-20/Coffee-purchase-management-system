-- ─────────────────────────────────────────
-- BACKFILL PARENT_ID FOR EXISTING STAFF
-- ─────────────────────────────────────────

-- For all profiles that are NOT Admins and have no parent_id:
-- Set their parent_id to their existing admin_id.
-- This ensures they show up correctly in the new Pyramid Hierarchy.

UPDATE profiles 
SET parent_id = admin_id 
WHERE role != 'Admin' 
  AND parent_id IS NULL 
  AND admin_id IS NOT NULL;

-- Also, ensure every Admin points to themselves if they don't have an admin_id
UPDATE profiles
SET admin_id = id
WHERE role = 'Admin'
  AND admin_id IS NULL;
