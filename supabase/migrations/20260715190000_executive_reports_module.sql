-- =============================================================================
-- Migration: executive_reports_module
-- Description: CEO executive report library runs + schedule frequency extensions
-- =============================================================================

-- Extend schedule frequencies for executive recurring reports
ALTER TABLE hrms.report_schedules
  DROP CONSTRAINT IF EXISTS report_schedules_frequency_check;

ALTER TABLE hrms.report_schedules
  ADD CONSTRAINT report_schedules_frequency_check
  CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly'));

-- -----------------------------------------------------------------------------
-- executive_report_runs — ad-hoc + scheduled library history
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.executive_report_runs (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  report_key text NOT NULL,
  report_name text NOT NULL,
  category text NOT NULL,
  department_id uuid REFERENCES hrms.departments (id) ON DELETE SET NULL,
  branch_id uuid REFERENCES hrms.branches (id) ON DELETE SET NULL,
  export_format text NOT NULL CHECK (
    export_format IN ('csv', 'excel', 'pdf', 'summary_pdf', 'board_summary')
  ),
  run_status text NOT NULL DEFAULT 'completed'
    CHECK (run_status IN ('queued', 'running', 'completed', 'failed')),
  source text NOT NULL DEFAULT 'on_demand'
    CHECK (source IN ('on_demand', 'schedule', 'builder', 'share')),
  schedule_id uuid REFERENCES hrms.report_schedules (id) ON DELETE SET NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  columns_selected text[] NOT NULL DEFAULT '{}',
  key_insights text[] NOT NULL DEFAULT '{}',
  data_sources text[] NOT NULL DEFAULT '{}',
  preview_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  row_count integer NOT NULL DEFAULT 0,
  byte_size integer NOT NULL DEFAULT 0,
  download_count integer NOT NULL DEFAULT 0,
  last_downloaded_at timestamptz,
  shared_with text[] NOT NULL DEFAULT '{}',
  message text,
  error_message text,
  period_from date,
  period_to date,
  generated_by_employee_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL,
  generated_by_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  generated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT executive_report_runs_name_not_empty CHECK (length(trim(report_name)) > 0),
  CONSTRAINT executive_report_runs_key_not_empty CHECK (length(trim(report_key)) > 0)
);

CREATE INDEX IF NOT EXISTS executive_report_runs_org_idx
  ON hrms.executive_report_runs (organization_id, generated_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS executive_report_runs_category_idx
  ON hrms.executive_report_runs (organization_id, category)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS executive_report_runs_status_idx
  ON hrms.executive_report_runs (run_status)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS executive_report_runs_key_idx
  ON hrms.executive_report_runs (report_key);

SELECT public.attach_updated_at_trigger('hrms.executive_report_runs'::regclass);
SELECT public.attach_audit_trigger('hrms.executive_report_runs'::regclass);

ALTER TABLE hrms.executive_report_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS executive_report_runs_select_policy ON hrms.executive_report_runs;
CREATE POLICY executive_report_runs_select_policy ON hrms.executive_report_runs
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS executive_report_runs_insert_policy ON hrms.executive_report_runs;
CREATE POLICY executive_report_runs_insert_policy ON hrms.executive_report_runs
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS executive_report_runs_update_policy ON hrms.executive_report_runs;
CREATE POLICY executive_report_runs_update_policy ON hrms.executive_report_runs
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

-- Extend audit module resolver
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
    WHEN 'report_schedule_runs' THEN 'reports'
    WHEN 'executive_report_runs' THEN 'reports'
    WHEN 'application' THEN 'dashboard'
    WHEN 'executive_approval_requests' THEN 'approvals'
    WHEN 'executive_approval_comments' THEN 'approvals'
    ELSE 'settings'
  END;
$$;

-- Grant CEO schedule permission
INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'ceo'
  AND p.code = 'reports.schedule'
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Notification templates
INSERT INTO hrms.notification_templates (
  organization_id, template_key, name, module, subject, body_template, variables, status
)
SELECT
  o.id,
  t.template_key,
  t.name,
  'reports'::hrms.notification_module,
  t.subject,
  t.body_template,
  t.variables::jsonb,
  'active'::hrms.record_status
FROM hrms.organizations o
CROSS JOIN (
  VALUES
    (
      'executive_report_ready',
      'Executive Report Ready',
      'Report ready: {{reportName}}',
      'Your executive report {{reportName}} ({{format}}) has been generated.',
      '["reportName","format"]'
    ),
    (
      'executive_report_shared',
      'Executive Report Shared',
      'Shared report: {{reportName}}',
      '{{sharedBy}} shared the executive report {{reportName}} with you.',
      '["reportName","sharedBy"]'
    ),
    (
      'executive_report_scheduled',
      'Scheduled Report Completed',
      'Scheduled report completed: {{reportName}}',
      'Scheduled report {{reportName}} finished with status {{status}}.',
      '["reportName","status"]'
    ),
    (
      'executive_report_failed',
      'Report Generation Failed',
      'Report failed: {{reportName}}',
      'Executive report {{reportName}} failed. {{reason}}',
      '["reportName","reason"]'
    )
) AS t(template_key, name, subject, body_template, variables)
WHERE o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.notification_templates nt
    WHERE nt.organization_id = o.id
      AND nt.template_key = t.template_key
      AND nt.deleted_at IS NULL
  );
