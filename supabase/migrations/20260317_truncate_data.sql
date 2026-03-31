-- ─────────────────────────────────────────
-- DATA TRUNCATION MIGRATION (RESET SYSTEM)
-- ─────────────────────────────────────────

-- Disable triggers temporarily to avoid overhead/side effects if necessary
-- SET session_replication_role = 'replica';

-- Truncate all data tables except profiles
-- CASCADE handles foreign key dependencies between these tables.
TRUNCATE TABLE 
  purchases,
  advances,
  farmers,
  buying_prices,
  expenses,
  sales,
  sale_reports,
  company_profiles,
  seasons
CASCADE;

-- Restart sequences if any (optional but good practice for a full reset)
-- ALTER SEQUENCE farmers_id_seq RESTART WITH 1;
-- ...etc if they were serials. But Supabase uses UUIDs mostly.

-- Re-enable triggers
-- SET session_replication_role = 'origin';

-- Note: This leaves the 'profiles' table intact, preserving user accounts, 
-- roles, and the hierarchy (parent_id/admin_id).
