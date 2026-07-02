-- =============================================================================
-- Migration: updated_at_triggers
-- Description: Automatic updated_at trigger function and attachment helper
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := public.utc_now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at() IS
  'Trigger function that sets updated_at to the current UTC timestamp on UPDATE.';

CREATE OR REPLACE FUNCTION public.attach_updated_at_trigger(target_table regclass)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sanitized_name text;
  trigger_name text;
BEGIN
  sanitized_name := replace(target_table::text, '.', '_');
  trigger_name := format('set_updated_at_%s', sanitized_name);

  EXECUTE format(
    'DROP TRIGGER IF EXISTS %I ON %s',
    trigger_name,
    target_table
  );

  EXECUTE format(
    'CREATE TRIGGER %I
       BEFORE UPDATE ON %s
       FOR EACH ROW
       EXECUTE FUNCTION public.set_updated_at()',
    trigger_name,
    target_table
  );
END;
$$;

COMMENT ON FUNCTION public.attach_updated_at_trigger(regclass) IS
  'Attaches the set_updated_at trigger to a table that has an updated_at column.';

CREATE OR REPLACE FUNCTION public.detach_updated_at_trigger(target_table regclass)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sanitized_name text;
  trigger_name text;
BEGIN
  sanitized_name := replace(target_table::text, '.', '_');
  trigger_name := format('set_updated_at_%s', sanitized_name);

  EXECUTE format(
    'DROP TRIGGER IF EXISTS %I ON %s',
    trigger_name,
    target_table
  );
END;
$$;

COMMENT ON FUNCTION public.detach_updated_at_trigger(regclass) IS
  'Removes the set_updated_at trigger from a table.';
