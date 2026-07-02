-- =============================================================================
-- Migration: audit_trigger_function
-- Description: Reusable audit trigger function (audit tables not created yet)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.extract_record_id(record_data jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT coalesce(
    record_data ->> 'id',
    record_data ->> 'uuid',
    record_data::text
  );
$$;

COMMENT ON FUNCTION public.extract_record_id(jsonb) IS
  'Extracts a record identifier from a JSONB row representation.';

CREATE OR REPLACE FUNCTION public.build_audit_payload(
  p_operation text,
  p_schema_name text,
  p_table_name text,
  p_record_id text,
  p_old_record jsonb DEFAULT NULL,
  p_new_record jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'occurred_at', public.utc_now(),
    'operation', p_operation,
    'schema_name', p_schema_name,
    'table_name', p_table_name,
    'record_id', p_record_id,
    'user_id', public.current_user_id(),
    'old_record', p_old_record,
    'new_record', p_new_record
  );
END;
$$;

COMMENT ON FUNCTION public.build_audit_payload(text, text, text, text, jsonb, jsonb) IS
  'Builds a standardized audit payload object for change tracking.';

CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id text;
  v_payload jsonb;
BEGIN
  -- Persistence table (e.g. hrms.audit_logs) will be created in a future migration.
  -- This function standardizes audit payloads for downstream storage or event processing.

  IF TG_OP = 'DELETE' THEN
    v_record_id := public.extract_record_id(to_jsonb(OLD));
    v_payload := public.build_audit_payload(
      TG_OP,
      TG_TABLE_SCHEMA,
      TG_TABLE_NAME,
      v_record_id,
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    v_record_id := public.extract_record_id(to_jsonb(NEW));
    v_payload := public.build_audit_payload(
      TG_OP,
      TG_TABLE_SCHEMA,
      TG_TABLE_NAME,
      v_record_id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    v_record_id := public.extract_record_id(to_jsonb(NEW));
    v_payload := public.build_audit_payload(
      TG_OP,
      TG_TABLE_SCHEMA,
      TG_TABLE_NAME,
      v_record_id,
      NULL,
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.audit_log_trigger() IS
  'Generic audit trigger function. Attach to tables via attach_audit_trigger().';

CREATE OR REPLACE FUNCTION public.attach_audit_trigger(target_table regclass)
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
  trigger_name := format('audit_log_%s', sanitized_name);

  EXECUTE format(
    'DROP TRIGGER IF EXISTS %I ON %s',
    trigger_name,
    target_table
  );

  EXECUTE format(
    'CREATE TRIGGER %I
       AFTER INSERT OR UPDATE OR DELETE ON %s
       FOR EACH ROW
       EXECUTE FUNCTION public.audit_log_trigger()',
    trigger_name,
    target_table
  );
END;
$$;

COMMENT ON FUNCTION public.attach_audit_trigger(regclass) IS
  'Attaches the audit_log_trigger to a table for INSERT, UPDATE, and DELETE operations.';

CREATE OR REPLACE FUNCTION public.detach_audit_trigger(target_table regclass)
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
  trigger_name := format('audit_log_%s', sanitized_name);

  EXECUTE format(
    'DROP TRIGGER IF EXISTS %I ON %s',
    trigger_name,
    target_table
  );
END;
$$;

COMMENT ON FUNCTION public.detach_audit_trigger(regclass) IS
  'Removes the audit_log_trigger from a table.';
