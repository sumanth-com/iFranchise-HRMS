-- =============================================================================
-- Migration: helper_functions
-- Description: Reusable SQL helper functions for the HRMS platform
-- =============================================================================

-- -----------------------------------------------------------------------------
-- UUID generation
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.new_uuid()
RETURNS uuid
LANGUAGE sql
VOLATILE
SET search_path = public, extensions
AS $$
  SELECT gen_random_uuid();
$$;

COMMENT ON FUNCTION public.new_uuid() IS
  'Generates a new UUID v4 using pgcrypto. Preferred UUID generator for HRMS.';

CREATE OR REPLACE FUNCTION public.new_uuid_v4()
RETURNS uuid
LANGUAGE sql
VOLATILE
SET search_path = public, extensions
AS $$
  SELECT uuid_generate_v4();
$$;

COMMENT ON FUNCTION public.new_uuid_v4() IS
  'Generates a new UUID v4 using uuid-ossp. Alternative UUID generator.';

-- -----------------------------------------------------------------------------
-- Authentication helpers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT auth.uid();
$$;

COMMENT ON FUNCTION public.current_user_id() IS
  'Returns the authenticated user ID from the current JWT, or NULL.';

CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

COMMENT ON FUNCTION public.is_authenticated() IS
  'Returns true when the current request has an authenticated user.';

CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('role', true), '')
  ) = 'service_role';
$$;

COMMENT ON FUNCTION public.is_service_role() IS
  'Returns true when the current request is using the service role.';

-- -----------------------------------------------------------------------------
-- Generic utilities
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.coalesce_text(variadic inputs text[])
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT value FROM unnest(inputs) AS value WHERE nullif(trim(value), '') IS NOT NULL LIMIT 1),
    ''
  );
$$;

COMMENT ON FUNCTION public.coalesce_text(text[]) IS
  'Returns the first non-null, non-empty trimmed text value from the provided inputs.';

CREATE OR REPLACE FUNCTION public.slugify(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(trim(coalesce(input, '')), '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+',
      '-',
      'g'
    )
  );
$$;

COMMENT ON FUNCTION public.slugify(text) IS
  'Converts text into a URL-safe lowercase slug.';
