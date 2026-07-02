-- =============================================================================
-- iFranchise HRMS — Super Admin initialization
-- =============================================================================
--
-- Prerequisites:
--   1. All migrations applied (including Step 4 seed migrations)
--   2. Supabase Auth user already invited/created for the Super Admin email
--
-- Configure the email before running:
--   SET app.super_admin_email = 'your-admin@company.com';
--
-- Or pass inline:
--   SELECT hrms.initialize_super_admin('your-admin@company.com');
--
-- Optional parameters:
--   hrms.initialize_super_admin(email, first_name, last_name, employee_code)
--
-- Example:
--   SELECT hrms.initialize_super_admin(
--     'admin@ifranchise.com',
--     'Super',
--     'Admin',
--     'EMP-0001'
--   );

-- Replace with your Super Admin email:
SELECT hrms.initialize_super_admin('admin@ifranchise.com');

-- Verify bootstrap state:
SELECT hrms.get_bootstrap_status();
