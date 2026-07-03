-- Seed iFranchise workforce employees.
-- Prerequisites:
--   1. All HRMS migrations applied (through 20260702150600).
--   2. Super Admin initialized.
--   3. Optional: invite employees in Supabase Auth to auto-link accounts.
--
-- Usage (Supabase SQL editor or psql with service role):
--   SELECT hrms.seed_ifranchise_employees();

SELECT hrms.seed_ifranchise_employees();
