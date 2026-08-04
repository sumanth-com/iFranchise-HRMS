ALTER TABLE hrms.onboarding_portal_accounts
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;

COMMENT ON COLUMN hrms.onboarding_portal_accounts.auth_user_id IS
  'Supabase auth.users id created when the candidate sets their onboarding portal password.';
