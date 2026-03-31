-- ─────────────────────────────────────────
-- FIX AGENT CAPITAL FLOW FKs AND PROFILE VISIBILITY
-- ─────────────────────────────────────────

-- 1. Fix agent_capital_advances FKs to point to profiles table for easier joining
ALTER TABLE agent_capital_advances DROP CONSTRAINT IF EXISTS agent_capital_advances_admin_id_fkey;
ALTER TABLE agent_capital_advances DROP CONSTRAINT IF EXISTS agent_capital_advances_agent_id_fkey;

ALTER TABLE agent_capital_advances 
    ADD CONSTRAINT agent_capital_advances_admin_id_fkey 
    FOREIGN KEY (admin_id) REFERENCES profiles(id);

ALTER TABLE agent_capital_advances 
    ADD CONSTRAINT agent_capital_advances_agent_id_fkey 
    FOREIGN KEY (agent_id) REFERENCES profiles(id);

-- 2. Update profiles RLS to allow members of the same branch to see each other
-- This is critical so agents can see the full_name of the admin who issued them capital.
DROP POLICY IF EXISTS "profiles_select_branch" ON profiles;
CREATE POLICY "profiles_select_branch" ON profiles
    FOR SELECT USING (
        admin_id IN (SELECT p.admin_id FROM profiles p WHERE p.id = auth.uid())
    );

-- Also update the recursive policy if it's causing issues (optional but good for performance)
-- We already have the pyramid policy, let's just make sure it's not too restrictive.
