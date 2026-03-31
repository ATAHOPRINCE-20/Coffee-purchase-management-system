-- ─────────────────────────────────────────
-- FIX PROFILES RLS (Allow Upsert for Setup)
-- ─────────────────────────────────────────

-- 1. Drop existing policies to avoid duplicates
DROP POLICY IF EXISTS "profiles_select_v4" ON profiles;
DROP POLICY IF EXISTS "profiles_update_v4" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_v4" ON profiles;

-- 2. Comprehensive SELECT policy
CREATE POLICY "profiles_select_v5" ON profiles
    FOR SELECT USING (
        id = auth.uid() 
        OR admin_id = get_my_admin_id_v4()
        OR is_super_admin_v4()
    );

-- 3. Comprehensive UPDATE policy (with CHECK)
CREATE POLICY "profiles_update_v5" ON profiles
    FOR UPDATE USING (
        id = auth.uid() 
        OR parent_id = auth.uid()
        OR admin_id = auth.uid()
    )
    WITH CHECK (
        id = auth.uid() 
        OR parent_id = auth.uid()
        OR admin_id = auth.uid()
    );

-- 4. NEW: INSERT policy (allows a user to create/upsert their OWN profile)
CREATE POLICY "profiles_insert_v5" ON profiles
    FOR INSERT WITH CHECK (
        id = auth.uid()
    );
