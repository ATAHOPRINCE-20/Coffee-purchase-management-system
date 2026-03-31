-- ─────────────────────────────────────────
-- ADD USERNAME, EMAIL SYNC & SECURE RESOLUTION
-- ─────────────────────────────────────────

-- 1. Add columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- 2. Create indices
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 3. Backfill existing emails
DO $$ 
BEGIN
    UPDATE public.profiles p
    SET email = u.email
    FROM auth.users u
    WHERE p.id = u.id;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not backfill emails.';
END $$;

-- 4. Backfill existing usernames (email prefix)
UPDATE profiles 
SET username = lower(split_part(email, '@', 1))
WHERE username IS NULL AND email IS NOT NULL;

-- 5. Trigger to sync email AND username from auth.users
-- This ensures that if a user is created via auth.signUp with metadata,
-- the profile reflects it immediately.
CREATE OR REPLACE FUNCTION public.sync_auth_user_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, status, admin_id, parent_id, username)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'Field Agent'),
        'Active',
        COALESCE((NEW.raw_user_meta_data->>'admin_id')::uuid, NEW.id),
        (NEW.raw_user_meta_data->>'parent_id')::uuid,
        COALESCE(NEW.raw_user_meta_data->>'username', lower(split_part(NEW.email, '@', 1)))
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        username = COALESCE(EXCLUDED.username, public.profiles.username),
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        admin_id = COALESCE(EXCLUDED.admin_id, public.profiles.admin_id),
        parent_id = COALESCE(EXCLUDED.parent_id, public.profiles.parent_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.sync_auth_user_to_profiles();

-- 6. SECURE IDENTIFIER RESOLUTION (FOR LOGIN)
-- This function allows the login page to find an email by username 
-- WITHOUT being logged in (it bypasses RLS).
CREATE OR REPLACE FUNCTION resolve_identifier_v1(p_identifier TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS to allow lookup before login
SET search_path = public
AS $$
DECLARE
    v_email TEXT;
BEGIN
    -- Try to find by username first (case-insensitive)
    SELECT email INTO v_email
    FROM profiles
    WHERE lower(username) = lower(trim(p_identifier))
    LIMIT 1;

    -- If not found by username, checking if identifier is an email
    IF v_email IS NULL AND p_identifier LIKE '%@%' THEN
        v_email := p_identifier;
    END IF;

    IF v_email IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'email', v_email);
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Identifier not found');
    END IF;
END;
$$;

-- 7. Formatting trigger
CREATE OR REPLACE FUNCTION public.handle_username_formatting()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.username IS NOT NULL THEN
        NEW.username := lower(trim(NEW.username));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profile_username_format_trg ON profiles;
CREATE TRIGGER profile_username_format_trg
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW EXECUTE PROCEDURE public.handle_username_formatting();
