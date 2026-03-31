-- ─────────────────────────────────────────
-- ADD PENDING STATUS TO PROFILES
-- ─────────────────────────────────────────

-- 1. Update the status check constraint on profiles
-- We need to drop the old one and add a new one that includes 'Pending'
DO $$ BEGIN
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

ALTER TABLE profiles ADD CONSTRAINT profiles_status_check 
    CHECK (status IN ('Active', 'Inactive', 'Pending'));

-- 2. Update existing policies if necessary
-- profiles_insert policy currently only allows id = auth.uid()
-- We need to allow the service role (used by edge functions) to insert profiles for others.
-- However, the service role bypasses RLS, so no changes needed for the edge function.
-- But for clarity, we can ensure the insert policy is robust.
