-- ─────────────────────────────────────────
-- MASTER RESET (NUCLEAR OPTION)
-- ─────────────────────────────────────────
-- WARNING: THIS WILL PERMANENTLY DELETE ALL DATA 
-- AND ALL USER ACCOUNTS (EXCEPT SUPER ADMINS OR TARGETED)
-- ─────────────────────────────────────────

DO $$ 
DECLARE 
    tbl TEXT;
BEGIN
    -- 1. Truncate all public data tables
    FOR tbl IN SELECT unnest(ARRAY[
        'purchases', 'advances', 'farmers', 'buying_prices', 
        'expenses', 'sales', 'sale_reports', 'company_profiles', 
        'seasons', 'agent_capital_advances', 'agent_settlements',
        'user_subscriptions'
    ])
    LOOP
        EXECUTE format('TRUNCATE TABLE public.%I CASCADE', tbl);
    END LOOP;

    -- 2. Clear out profiles (cascades from auth.users mostly, but doing it here ensures it's clean)
    TRUNCATE TABLE public.profiles CASCADE;

    -- 3. Delete from auth.users (Must leave at least one admin to avoid being locked out?)
    -- Or just delete ALL if they are resetting the whole project.
    -- Option A: Delete ALL users
    -- DELETE FROM auth.users;
    
    -- Option B: Delete everyone EXCEPT Super Admins (Safer)
    DELETE FROM auth.users 
    WHERE id NOT IN (
        SELECT id FROM public.profiles WHERE role = 'Super Admin'
    );
    
    -- Option C: Delete everyone (Absolute Reset)
    -- DELETE FROM auth.users;

    RAISE NOTICE 'Database has been fully reset (Data cleared, Users removed).';
END $$;
