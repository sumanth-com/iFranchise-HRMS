-- =============================================================================
-- Migration: auth_foundations
-- Description: SQL-side auth assumptions for invite-only employee provisioning
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Auth configuration assumptions (invite-only employees)
-- -----------------------------------------------------------------------------
--
-- 1. Public signup is DISABLED (see supabase/config.toml and config/auth.toml).
-- 2. Employees are provisioned exclusively via service-role invite:
--      auth.admin.inviteUserByEmail()
-- 3. Email confirmation is REQUIRED before first login.
-- 4. Password policy: minimum 12 characters with mixed case, digits, and symbols.
-- 5. No anonymous sign-in is permitted.
-- 6. OAuth providers remain disabled until explicitly enabled in production.
--
-- These assumptions must be mirrored in the Supabase Dashboard for hosted projects.

-- -----------------------------------------------------------------------------
-- Invite eligibility helper (for future HRMS employee records)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_invited_user()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    public.is_authenticated()
    AND coalesce(
      auth.jwt() -> 'app_metadata' ->> 'invited',
      'false'
    )::boolean = true;
$$;

COMMENT ON FUNCTION public.is_invited_user() IS
  'Returns true when the authenticated user was provisioned via admin invite (app_metadata.invited = true).';

CREATE OR REPLACE FUNCTION public.require_authenticated()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_authenticated() THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.require_authenticated() IS
  'Raises an exception when the current request is not authenticated.';

CREATE OR REPLACE FUNCTION public.require_service_role()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Service role required'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.require_service_role() IS
  'Raises an exception when the current request is not using the service role.';

-- -----------------------------------------------------------------------------
-- Grant execute permissions on foundation functions
-- -----------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.new_uuid() TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.new_uuid_v4() TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.utc_now() TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.to_utc(timestamptz) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.start_of_day_utc(timestamptz) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.end_of_day_utc(timestamptz) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_id() TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_authenticated() TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_service_role() TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_invited_user() TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.coalesce_text(text[]) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.slugify(text) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.extract_record_id(jsonb) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.build_audit_payload(text, text, text, text, jsonb, jsonb) TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.attach_updated_at_trigger(regclass) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.detach_updated_at_trigger(regclass) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.attach_audit_trigger(regclass) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.detach_audit_trigger(regclass) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.require_authenticated() TO postgres, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.require_service_role() TO postgres, service_role;
