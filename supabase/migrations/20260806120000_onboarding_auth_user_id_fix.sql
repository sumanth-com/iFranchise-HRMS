-- Ensure onboarding portal auth_user_id exists and PostgREST schema cache is refreshed.

ALTER TABLE hrms.onboarding_portal_accounts
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;

COMMENT ON COLUMN hrms.onboarding_portal_accounts.auth_user_id IS
  'Supabase auth.users id created when the candidate sets their onboarding portal password.';

CREATE OR REPLACE FUNCTION hrms.find_auth_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT id
  FROM auth.users
  WHERE lower(email) = lower(trim(p_email))
  LIMIT 1;
$$;

COMMENT ON FUNCTION hrms.find_auth_user_id_by_email(text) IS
  'Returns auth.users.id for an email (service_role onboarding provisioning).';

REVOKE ALL ON FUNCTION hrms.find_auth_user_id_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms.find_auth_user_id_by_email(text) TO service_role;

NOTIFY pgrst, 'reload schema';
