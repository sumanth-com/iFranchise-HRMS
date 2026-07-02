-- =============================================================================
-- iFranchise HRMS — Database seed (Step 4)
-- =============================================================================
--
-- Master data is applied by migrations:
--   20260702150100_hrms_master_data_seed.sql
--   20260702150200_hrms_security_seed.sql
--
-- This seed file verifies bootstrap state after `supabase db reset`.
-- To initialize Super Admin, run:
--   supabase/scripts/initialize-super-admin.sql
--   or supabase/scripts/initialize-hrms.ps1

SELECT hrms.get_bootstrap_status() AS bootstrap_status;
