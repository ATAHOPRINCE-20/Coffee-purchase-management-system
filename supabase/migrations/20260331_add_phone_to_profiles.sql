-- ─────────────────────────────────────────
-- ADD PHONE TO PROFILES & UPDATE SYNC
-- ─────────────────────────────────────────

-- 1. Add phone column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Update Sync Trigger Function
CREATE OR REPLACE FUNCTION public.sync_auth_user_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        phone, -- NEW
        role, 
        status, 
        admin_id, 
        parent_id, 
        username
    )
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''), -- NEW: pull from metadata
        COALESCE(NEW.raw_user_meta_data->>'role', 'Field Agent'),
        'Active',
        COALESCE((NEW.raw_user_meta_data->>'admin_id')::uuid, NEW.id),
        (NEW.raw_user_meta_data->>'parent_id')::uuid,
        COALESCE(NEW.raw_user_meta_data->>'username', lower(split_part(NEW.email, '@', 1)))
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone), -- NEW
        username = COALESCE(EXCLUDED.username, public.profiles.username),
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        admin_id = COALESCE(EXCLUDED.admin_id, public.profiles.admin_id),
        parent_id = COALESCE(EXCLUDED.parent_id, public.profiles.parent_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
