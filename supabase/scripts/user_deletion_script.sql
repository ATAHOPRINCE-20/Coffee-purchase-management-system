/**
 * AGENT DELETION SCRIPT
 * --------------------
 * USE WITH CAUTION: This script permanently deletes Field Agents and their data.
 * It will NOT delete Admins or Super Admins.
 * 
 * Instructions:
 * 1. Go to Supabase Dashboard -> SQL Editor
 * 2. Paste this script
 * 3. Update the 'emails_to_delete' list
 * 4. Run the script
 */

DO $$ 
DECLARE 
    -- OPTIONAL: Provide emails to delete specific agents, 
    -- or leave NULL/empty to delete ALL agents.
    emails_to_delete TEXT[] := NULL; -- e.g. ARRAY['agent1@example.com']
    target_user RECORD;
BEGIN
    FOR target_user IN (
        SELECT u.id, u.email, p.role 
        FROM auth.users u
        JOIN public.profiles p ON u.id = p.id
        WHERE p.role = 'Field Agent'
        AND (emails_to_delete IS NULL OR u.email = ANY(emails_to_delete))
    ) LOOP
        RAISE NOTICE 'Permanently deleting Field Agent: % (%)', target_user.email, target_user.id;

        -- 1. Dependent Data
        -- First, delete records that reference the farmers belonging to this user
        DELETE FROM public.purchases WHERE farmer_id IN (SELECT id FROM public.farmers WHERE admin_id = target_user.id);
        DELETE FROM public.advances WHERE farmer_id IN (SELECT id FROM public.farmers WHERE admin_id = target_user.id);
        
        -- Then delete anything else recorded by this user
        DELETE FROM public.purchases WHERE admin_id = target_user.id;
        DELETE FROM public.advances WHERE admin_id = target_user.id;
        DELETE FROM public.farmers WHERE admin_id = target_user.id;
        DELETE FROM public.buying_prices WHERE admin_id = target_user.id;
        DELETE FROM public.expenses WHERE admin_id = target_user.id;
        DELETE FROM public.sales WHERE admin_id = target_user.id;
        DELETE FROM public.sale_reports WHERE admin_id = target_user.id;
        
        -- Agent specific tables (using both admin_id and agent_id for full cleanup)
        DELETE FROM public.agent_settlements WHERE admin_id = target_user.id OR agent_id = target_user.id;
        DELETE FROM public.agent_capital_advances WHERE admin_id = target_user.id OR agent_id = target_user.id;
        
        -- Other potential branch-level or user-level records
        DELETE FROM public.seasons WHERE admin_id = target_user.id;
        DELETE FROM public.company_profiles WHERE admin_id = target_user.id;
        DELETE FROM public.user_subscriptions WHERE user_id = target_user.id;
        
        -- 2. Handle Hierarchy
        UPDATE public.profiles SET parent_id = NULL WHERE parent_id = target_user.id;

        -- 3. Profiles
        DELETE FROM public.profiles WHERE id = target_user.id;

        -- 4. Auth User
        DELETE FROM auth.users WHERE id = target_user.id;
    END LOOP;
END $$;
