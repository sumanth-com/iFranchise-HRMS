-- =============================================================================
-- Migration: hrms_audit_persistence
-- Description: Extend audit trigger to persist records into hrms.audit_logs
-- Note: Does not modify locked foundation migration files.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, hrms
AS $$
DECLARE
  v_record_id text;
  v_old_json jsonb;
  v_new_json jsonb;
  v_org_id uuid;
  v_operation hrms.audit_operation;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old_json := to_jsonb(OLD);
    v_record_id := public.extract_record_id(v_old_json);
    v_org_id := NULLIF(v_old_json ->> 'organization_id', '')::uuid;
    v_operation := 'DELETE';

    INSERT INTO hrms.audit_logs (
      organization_id,
      user_id,
      schema_name,
      table_name,
      record_id,
      operation,
      old_record,
      new_record,
      occurred_at,
      created_by
    ) VALUES (
      v_org_id,
      public.current_user_id(),
      TG_TABLE_SCHEMA,
      TG_TABLE_NAME,
      v_record_id,
      v_operation,
      v_old_json,
      NULL,
      public.utc_now(),
      public.current_user_id()
    );

    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_json := to_jsonb(OLD);
    v_new_json := to_jsonb(NEW);
    v_record_id := public.extract_record_id(v_new_json);
    v_org_id := coalesce(
      NULLIF(v_new_json ->> 'organization_id', '')::uuid,
      NULLIF(v_old_json ->> 'organization_id', '')::uuid
    );
    v_operation := 'UPDATE';

    INSERT INTO hrms.audit_logs (
      organization_id,
      user_id,
      schema_name,
      table_name,
      record_id,
      operation,
      old_record,
      new_record,
      occurred_at,
      created_by
    ) VALUES (
      v_org_id,
      public.current_user_id(),
      TG_TABLE_SCHEMA,
      TG_TABLE_NAME,
      v_record_id,
      v_operation,
      v_old_json,
      v_new_json,
      public.utc_now(),
      public.current_user_id()
    );

    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    v_new_json := to_jsonb(NEW);
    v_record_id := public.extract_record_id(v_new_json);
    v_org_id := NULLIF(v_new_json ->> 'organization_id', '')::uuid;
    v_operation := 'INSERT';

    INSERT INTO hrms.audit_logs (
      organization_id,
      user_id,
      schema_name,
      table_name,
      record_id,
      operation,
      old_record,
      new_record,
      occurred_at,
      created_by
    ) VALUES (
      v_org_id,
      public.current_user_id(),
      TG_TABLE_SCHEMA,
      TG_TABLE_NAME,
      v_record_id,
      v_operation,
      NULL,
      v_new_json,
      public.utc_now(),
      public.current_user_id()
    );

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.audit_log_trigger() IS
  'Persists standardized audit records into hrms.audit_logs on DML operations.';
