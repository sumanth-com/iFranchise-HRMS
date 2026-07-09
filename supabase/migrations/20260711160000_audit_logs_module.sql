-- =============================================================================
-- Migration: audit_logs_module
-- Description: Centralized audit logs UI support — extend audit_logs, settings,
--              application audit writer, expanded triggers, permissions, RLS
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE hrms.audit_event_status AS ENUM ('success', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.audit_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- audit_logs extensions
-- -----------------------------------------------------------------------------

ALTER TABLE hrms.audit_logs
  ADD COLUMN IF NOT EXISTS module text,
  ADD COLUMN IF NOT EXISTS action text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS browser text,
  ADD COLUMN IF NOT EXISTS operating_system text,
  ADD COLUMN IF NOT EXISTS event_status hrms.audit_event_status NOT NULL DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS priority hrms.audit_priority NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS audit_logs_module_idx ON hrms.audit_logs (module);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON hrms.audit_logs (action);
CREATE INDEX IF NOT EXISTS audit_logs_event_status_idx ON hrms.audit_logs (event_status);
CREATE INDEX IF NOT EXISTS audit_logs_priority_idx ON hrms.audit_logs (priority);
CREATE INDEX IF NOT EXISTS audit_logs_archived_at_idx ON hrms.audit_logs (archived_at);

-- -----------------------------------------------------------------------------
-- audit_settings (retention)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.audit_settings (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES hrms.organizations (id) ON DELETE CASCADE,
  retention_days integer NOT NULL DEFAULT 365,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT audit_settings_retention_days_check CHECK (retention_days >= 30 AND retention_days <= 3650)
);

SELECT public.attach_updated_at_trigger('hrms.audit_settings'::regclass);

-- -----------------------------------------------------------------------------
-- Metadata resolver for DB-triggered audits
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hrms.resolve_audit_module(p_table_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_table_name
    WHEN 'employees' THEN 'employees'
    WHEN 'employee_profiles' THEN 'employees'
    WHEN 'emergency_contacts' THEN 'employees'
    WHEN 'bank_accounts' THEN 'employees'
    WHEN 'employee_addresses' THEN 'employees'
    WHEN 'attendance' THEN 'attendance'
    WHEN 'attendance_corrections' THEN 'attendance'
    WHEN 'leave_requests' THEN 'leave'
    WHEN 'leave_approvals' THEN 'leave'
    WHEN 'leave_types' THEN 'leave'
    WHEN 'leave_balances' THEN 'leave'
    WHEN 'payrolls' THEN 'payroll'
    WHEN 'payroll_items' THEN 'payroll'
    WHEN 'payroll_approvals' THEN 'payroll'
    WHEN 'payslips' THEN 'payroll'
    WHEN 'salary_structures' THEN 'payroll'
    WHEN 'salary_revisions' THEN 'payroll'
    WHEN 'employee_bonuses' THEN 'payroll'
    WHEN 'employee_reimbursements' THEN 'payroll'
    WHEN 'bonus_approvals' THEN 'payroll'
    WHEN 'performance_goals' THEN 'performance'
    WHEN 'performance_reviews' THEN 'performance'
    WHEN 'performance_review_approvals' THEN 'performance'
    WHEN 'performance_kpis' THEN 'performance'
    WHEN 'performance_kpi_templates' THEN 'performance'
    WHEN 'performance_promotions' THEN 'performance'
    WHEN 'performance_promotion_approvals' THEN 'performance'
    WHEN 'performance_feedback' THEN 'performance'
    WHEN 'performance_one_on_ones' THEN 'performance'
    WHEN 'performance_review_cycles' THEN 'performance'
    WHEN 'recruitment_job_openings' THEN 'recruitment'
    WHEN 'recruitment_candidates' THEN 'recruitment'
    WHEN 'recruitment_interviews' THEN 'recruitment'
    WHEN 'recruitment_offers' THEN 'recruitment'
    WHEN 'document_templates' THEN 'documents'
    WHEN 'document_letters' THEN 'documents'
    WHEN 'document_types' THEN 'documents'
    WHEN 'employee_documents' THEN 'documents'
    WHEN 'assets' THEN 'assets'
    WHEN 'asset_assignments' THEN 'assets'
    WHEN 'asset_maintenance' THEN 'assets'
    WHEN 'asset_vendors' THEN 'assets'
    WHEN 'exit_resignations' THEN 'exit'
    WHEN 'exit_clearance_items' THEN 'exit'
    WHEN 'exit_settlements' THEN 'exit'
    WHEN 'exit_interviews' THEN 'exit'
    WHEN 'organizations' THEN 'organization'
    WHEN 'branches' THEN 'organization'
    WHEN 'departments' THEN 'organization'
    WHEN 'designations' THEN 'organization'
    WHEN 'employment_types' THEN 'organization'
    WHEN 'work_locations' THEN 'organization'
    WHEN 'shift_templates' THEN 'organization'
    WHEN 'holidays' THEN 'organization'
    WHEN 'roles' THEN 'roles'
    WHEN 'role_permissions' THEN 'roles'
    WHEN 'user_roles' THEN 'roles'
    WHEN 'permissions' THEN 'roles'
    WHEN 'notifications' THEN 'notifications'
    WHEN 'notification_templates' THEN 'notifications'
    WHEN 'notification_settings' THEN 'notifications'
    WHEN 'organization_settings' THEN 'settings'
    WHEN 'report_schedules' THEN 'reports'
    WHEN 'application' THEN 'dashboard'
    ELSE 'settings'
  END;
$$;

CREATE OR REPLACE FUNCTION hrms.resolve_audit_action(
  p_table_name text,
  p_operation hrms.audit_operation,
  p_old jsonb,
  p_new jsonb
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_new_status text;
  v_old_status text;
BEGIN
  IF p_table_name = 'application' THEN
    RETURN coalesce(p_new ->> 'action', 'update');
  END IF;

  IF p_operation = 'INSERT' THEN RETURN 'create'; END IF;
  IF p_operation = 'DELETE' THEN RETURN 'delete'; END IF;

  v_new_status := coalesce(
    p_new ->> 'leave_status',
    p_new ->> 'approval_status',
    p_new ->> 'payroll_status',
    p_new ->> 'promotion_status',
    p_new ->> 'exit_status',
    p_new ->> 'offer_status',
    p_new ->> 'correction_status',
    p_new ->> 'settlement_status'
  );
  v_old_status := coalesce(
    p_old ->> 'leave_status',
    p_old ->> 'approval_status',
    p_old ->> 'payroll_status',
    p_old ->> 'promotion_status',
    p_old ->> 'exit_status',
    p_old ->> 'offer_status',
    p_old ->> 'correction_status',
    p_old ->> 'settlement_status'
  );

  IF v_new_status IS NOT NULL AND v_new_status IS DISTINCT FROM v_old_status THEN
    IF v_new_status IN ('approved', 'manager_approved', 'hr_approved', 'accepted', 'completed') THEN
      RETURN 'approve';
    END IF;
    IF v_new_status IN ('rejected', 'withdrawn', 'cancelled') THEN
      RETURN 'reject';
    END IF;
  END IF;

  IF p_table_name = 'user_roles' AND p_old ->> 'role_id' IS DISTINCT FROM p_new ->> 'role_id' THEN
    RETURN 'role_change';
  END IF;
  IF p_table_name = 'role_permissions' THEN
    RETURN 'permission_change';
  END IF;
  IF p_table_name = 'asset_assignments' AND p_operation = 'INSERT' THEN
    RETURN 'assign';
  END IF;

  RETURN 'update';
END;
$$;

CREATE OR REPLACE FUNCTION hrms.resolve_audit_description(
  p_table_name text,
  p_action text,
  p_record_id text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT initcap(replace(p_action, '_', ' ')) || ' ' || replace(p_table_name, '_', ' ') || ' (' || p_record_id || ')';
$$;

-- -----------------------------------------------------------------------------
-- Updated audit trigger
-- -----------------------------------------------------------------------------

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
  v_module text;
  v_action text;
  v_description text;
  v_priority hrms.audit_priority;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old_json := to_jsonb(OLD);
    v_record_id := public.extract_record_id(v_old_json);
    v_org_id := NULLIF(v_old_json ->> 'organization_id', '')::uuid;
    v_operation := 'DELETE';
    v_module := hrms.resolve_audit_module(TG_TABLE_NAME);
    v_action := hrms.resolve_audit_action(TG_TABLE_NAME, v_operation, v_old_json, NULL);
    v_description := hrms.resolve_audit_description(TG_TABLE_NAME, v_action, v_record_id);
    v_priority := CASE WHEN v_action IN ('delete', 'reject') THEN 'high'::hrms.audit_priority ELSE 'medium'::hrms.audit_priority END;

    INSERT INTO hrms.audit_logs (
      organization_id, user_id, schema_name, table_name, record_id, operation,
      module, action, description, old_record, new_record, priority,
      occurred_at, created_by
    ) VALUES (
      v_org_id, public.current_user_id(), TG_TABLE_SCHEMA, TG_TABLE_NAME, v_record_id, v_operation,
      v_module, v_action, v_description, v_old_json, NULL, v_priority,
      public.utc_now(), public.current_user_id()
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
    v_module := hrms.resolve_audit_module(TG_TABLE_NAME);
    v_action := hrms.resolve_audit_action(TG_TABLE_NAME, v_operation, v_old_json, v_new_json);
    v_description := hrms.resolve_audit_description(TG_TABLE_NAME, v_action, v_record_id);
    v_priority := CASE
      WHEN v_action IN ('approve', 'reject', 'role_change', 'permission_change') THEN 'high'::hrms.audit_priority
      WHEN v_action = 'delete' THEN 'critical'::hrms.audit_priority
      ELSE 'medium'::hrms.audit_priority
    END;

    INSERT INTO hrms.audit_logs (
      organization_id, user_id, schema_name, table_name, record_id, operation,
      module, action, description, old_record, new_record, priority,
      occurred_at, created_by
    ) VALUES (
      v_org_id, public.current_user_id(), TG_TABLE_SCHEMA, TG_TABLE_NAME, v_record_id, v_operation,
      v_module, v_action, v_description, v_old_json, v_new_json, v_priority,
      public.utc_now(), public.current_user_id()
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    v_new_json := to_jsonb(NEW);
    v_record_id := public.extract_record_id(v_new_json);
    v_org_id := NULLIF(v_new_json ->> 'organization_id', '')::uuid;
    v_operation := 'INSERT';
    v_module := hrms.resolve_audit_module(TG_TABLE_NAME);
    v_action := hrms.resolve_audit_action(TG_TABLE_NAME, v_operation, NULL, v_new_json);
    v_description := hrms.resolve_audit_description(TG_TABLE_NAME, v_action, v_record_id);
    v_priority := CASE WHEN v_action = 'create' THEN 'medium'::hrms.audit_priority ELSE 'low'::hrms.audit_priority END;

    INSERT INTO hrms.audit_logs (
      organization_id, user_id, schema_name, table_name, record_id, operation,
      module, action, description, old_record, new_record, priority,
      occurred_at, created_by
    ) VALUES (
      v_org_id, public.current_user_id(), TG_TABLE_SCHEMA, TG_TABLE_NAME, v_record_id, v_operation,
      v_module, v_action, v_description, NULL, v_new_json, v_priority,
      public.utc_now(), public.current_user_id()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- -----------------------------------------------------------------------------
-- Application-level audit writer (login, logout, export, etc.)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hrms.write_application_audit(
  p_organization_id uuid,
  p_module text,
  p_action text,
  p_description text,
  p_record_id text DEFAULT 'system',
  p_event_status hrms.audit_event_status DEFAULT 'success',
  p_priority hrms.audit_priority DEFAULT 'medium',
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_device_type text DEFAULT NULL,
  p_browser text DEFAULT NULL,
  p_operating_system text DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, hrms
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO hrms.audit_logs (
    organization_id, user_id, schema_name, table_name, record_id, operation,
    module, action, description, new_record, event_status, priority,
    ip_address, user_agent, device_type, browser, operating_system, reason,
    occurred_at, created_by
  ) VALUES (
    p_organization_id,
    public.current_user_id(),
    'hrms',
    'application',
    p_record_id,
    'INSERT',
    p_module,
    p_action,
    p_description,
    p_metadata,
    p_event_status,
    p_priority,
    p_ip_address,
    p_user_agent,
    p_device_type,
    p_browser,
    p_operating_system,
    p_reason,
    public.utc_now(),
    public.current_user_id()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION hrms.write_application_audit(
  uuid, text, text, text, text, hrms.audit_event_status, hrms.audit_priority,
  text, text, text, text, text, text, jsonb
) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Backfill metadata on existing rows
-- -----------------------------------------------------------------------------

UPDATE hrms.audit_logs al
SET
  module = hrms.resolve_audit_module(al.table_name),
  action = hrms.resolve_audit_action(al.table_name, al.operation, al.old_record, al.new_record),
  description = hrms.resolve_audit_description(
    al.table_name,
    hrms.resolve_audit_action(al.table_name, al.operation, al.old_record, al.new_record),
    al.record_id
  )
WHERE al.module IS NULL;

-- -----------------------------------------------------------------------------
-- Additional audit triggers
-- -----------------------------------------------------------------------------

SELECT public.attach_audit_trigger('hrms.leave_approvals'::regclass);
SELECT public.attach_audit_trigger('hrms.leave_types'::regclass);
SELECT public.attach_audit_trigger('hrms.leave_balances'::regclass);
SELECT public.attach_audit_trigger('hrms.attendance_corrections'::regclass);
SELECT public.attach_audit_trigger('hrms.emergency_contacts'::regclass);
SELECT public.attach_audit_trigger('hrms.employee_addresses'::regclass);
SELECT public.attach_audit_trigger('hrms.document_types'::regclass);
SELECT public.attach_audit_trigger('hrms.payslips'::regclass);
SELECT public.attach_audit_trigger('hrms.payroll_items'::regclass);
SELECT public.attach_audit_trigger('hrms.payroll_approvals'::regclass);
SELECT public.attach_audit_trigger('hrms.employee_bonuses'::regclass);
SELECT public.attach_audit_trigger('hrms.employee_reimbursements'::regclass);
SELECT public.attach_audit_trigger('hrms.salary_revisions'::regclass);
SELECT public.attach_audit_trigger('hrms.bonus_approvals'::regclass);
SELECT public.attach_audit_trigger('hrms.permissions'::regclass);
SELECT public.attach_audit_trigger('hrms.recruitment_job_openings'::regclass);
SELECT public.attach_audit_trigger('hrms.recruitment_candidates'::regclass);
SELECT public.attach_audit_trigger('hrms.recruitment_interviews'::regclass);
SELECT public.attach_audit_trigger('hrms.recruitment_offers'::regclass);
SELECT public.attach_audit_trigger('hrms.document_templates'::regclass);
SELECT public.attach_audit_trigger('hrms.document_letters'::regclass);
SELECT public.attach_audit_trigger('hrms.assets'::regclass);
SELECT public.attach_audit_trigger('hrms.asset_assignments'::regclass);
SELECT public.attach_audit_trigger('hrms.asset_maintenance'::regclass);
SELECT public.attach_audit_trigger('hrms.exit_resignations'::regclass);
SELECT public.attach_audit_trigger('hrms.exit_settlements'::regclass);
SELECT public.attach_audit_trigger('hrms.performance_goals'::regclass);
SELECT public.attach_audit_trigger('hrms.performance_reviews'::regclass);
SELECT public.attach_audit_trigger('hrms.performance_promotions'::regclass);
SELECT public.attach_audit_trigger('hrms.performance_kpis'::regclass);
SELECT public.attach_audit_trigger('hrms.report_schedules'::regclass);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

ALTER TABLE hrms.audit_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_select_policy ON hrms.audit_logs;

CREATE POLICY audit_logs_select_policy ON hrms.audit_logs
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND archived_at IS NULL
    AND hrms.user_has_permission('audit.view')
    AND (
      organization_id IS NULL
      OR hrms.user_belongs_to_organization(organization_id)
    )
  );

CREATE POLICY audit_settings_select_policy ON hrms.audit_settings
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

CREATE POLICY audit_settings_update_policy ON hrms.audit_settings
  FOR UPDATE TO authenticated
  USING (
    hrms.user_belongs_to_organization(organization_id)
    AND hrms.user_has_permission('audit.export')
  )
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

CREATE POLICY audit_settings_insert_policy ON hrms.audit_settings
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

-- -----------------------------------------------------------------------------
-- Permissions
-- -----------------------------------------------------------------------------

INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT v.code, v.module, v.action, v.resource, v.description, v.status::hrms.record_status
FROM (VALUES
  ('audit.export', 'audit', 'export', 'audit', 'Export audit logs', 'active')
) AS v(code, module, action, resource, description, status)
WHERE NOT EXISTS (
  SELECT 1 FROM hrms.permissions p WHERE p.code = v.code AND p.deleted_at IS NULL
);

INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'::hrms.record_status
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'super_admin'
  AND r.deleted_at IS NULL
  AND p.code = 'audit.export'
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL
  );

INSERT INTO hrms.audit_settings (organization_id, retention_days, status)
VALUES ('a0000000-0000-4000-8000-000000000001', 365, 'active')
ON CONFLICT (organization_id) DO NOTHING;

CREATE OR REPLACE FUNCTION hrms.archive_expired_audit_logs(
  p_organization_id uuid,
  p_retention_days integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, hrms
AS $$
DECLARE
  v_count integer;
  v_cutoff timestamptz;
BEGIN
  IF NOT hrms.user_has_permission('audit.export') THEN
    RAISE EXCEPTION 'Insufficient permissions to archive audit logs';
  END IF;

  v_cutoff := public.utc_now() - make_interval(days => p_retention_days);

  UPDATE hrms.audit_logs
  SET
    archived_at = public.utc_now(),
    status = 'archived',
    updated_by = public.current_user_id()
  WHERE organization_id = p_organization_id
    AND archived_at IS NULL
    AND deleted_at IS NULL
    AND occurred_at < v_cutoff;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION hrms.archive_expired_audit_logs(uuid, integer) TO authenticated, service_role;

-- Remove audit.view from manager and employee roles if present
DELETE FROM hrms.role_permissions rp
USING hrms.roles r, hrms.permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND p.code = 'audit.view'
  AND r.code IN ('manager', 'employee')
  AND rp.deleted_at IS NULL;
