-- ─────────────────────────────────────────
-- REPAIR HIERARCHY (POST-TRIGGER FIX)
-- ─────────────────────────────────────────

-- 1. Ensure any agents with NULL parent_id are linked to their admin_id (legacy)
-- or at least to the person who should be their parent.
-- In the pyramid model, if parent_id is NULL, they are a Root Admin.
-- If they are meant to be Agents, we need to link them.

-- Fix for agents who were created before the trigger was fixed:
UPDATE profiles 
SET 
  parent_id = COALESCE(parent_id, (raw_user_meta_data->>'parent_id')::uuid),
  admin_id = COALESCE((raw_user_meta_data->>'admin_id')::uuid, admin_id)
FROM auth.users
WHERE profiles.id = auth.users.id
AND (profiles.parent_id IS NULL OR profiles.admin_id = profiles.id)
AND profiles.role != 'Admin';

-- 2. Ensure every non-admin has a parent_id. 
-- If we still can't find one, we default them to the current "admin_id" 
-- if that admin_id points to an actual Admin.
UPDATE profiles p
SET parent_id = admin_id
WHERE parent_id IS NULL 
  AND role != 'Admin'
  AND admin_id IS NOT NULL 
  AND EXISTS (SELECT 1 FROM profiles sub WHERE sub.id = p.admin_id AND sub.role = 'Admin');

-- 3. Final cleanup: If an agent still has themselves as admin_id, fix it
UPDATE profiles p
SET admin_id = (SELECT parent_id FROM profiles WHERE id = p.id)
WHERE role = 'Field Agent'
  AND admin_id = id
  AND parent_id IS NOT NULL;
