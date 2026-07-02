-- =============================================================================
-- Migration: timestamp_functions
-- Description: Timestamp helper functions for consistent UTC handling
-- =============================================================================

CREATE OR REPLACE FUNCTION public.utc_now()
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT timezone('UTC', now());
$$;

COMMENT ON FUNCTION public.utc_now() IS
  'Returns the current timestamp normalized to UTC.';

CREATE OR REPLACE FUNCTION public.to_utc(ts timestamptz)
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT timezone('UTC', ts);
$$;

COMMENT ON FUNCTION public.to_utc(timestamptz) IS
  'Converts a timestamptz value to UTC.';

CREATE OR REPLACE FUNCTION public.start_of_day_utc(ts timestamptz)
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT date_trunc('day', timezone('UTC', ts));
$$;

COMMENT ON FUNCTION public.start_of_day_utc(timestamptz) IS
  'Returns the UTC start-of-day for the given timestamp.';

CREATE OR REPLACE FUNCTION public.end_of_day_utc(ts timestamptz)
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT date_trunc('day', timezone('UTC', ts)) + interval '1 day' - interval '1 microsecond';
$$;

COMMENT ON FUNCTION public.end_of_day_utc(timestamptz) IS
  'Returns the UTC end-of-day for the given timestamp.';
