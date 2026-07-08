-- Phase 11: Enterprise Reports & Analytics
-- Schedules + permissions only. All report data is read from existing modules.

CREATE TABLE IF NOT EXISTS hrms.report_schedules (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  name text NOT NULL,
  report_key text NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  export_format text NOT NULL DEFAULT 'csv' CHECK (export_format IN ('csv', 'excel', 'pdf')),
  recipients text[] NOT NULL DEFAULT '{}',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  next_run_at timestamptz,
  last_run_at timestamptz,
  last_run_status text,
  last_run_message text,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT report_schedules_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT report_schedules_key_not_empty CHECK (length(trim(report_key)) > 0)
);

CREATE INDEX IF NOT EXISTS report_schedules_org_idx
  ON hrms.report_schedules (organization_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS report_schedules_due_idx
  ON hrms.report_schedules (next_run_at)
  WHERE deleted_at IS NULL AND is_enabled = true;

CREATE TABLE IF NOT EXISTS hrms.report_schedule_runs (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  schedule_id uuid NOT NULL REFERENCES hrms.report_schedules (id) ON DELETE CASCADE,
  report_key text NOT NULL,
  export_format text NOT NULL,
  run_status text NOT NULL DEFAULT 'completed',
  row_count integer NOT NULL DEFAULT 0,
  message text,
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS report_schedule_runs_schedule_idx
  ON hrms.report_schedule_runs (schedule_id, created_at DESC);

-- Permissions
INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT v.code, v.module, v.action, v.resource, v.description, 'active'
FROM (
  VALUES
    ('reports.view', 'reports', 'view', 'reports', 'View reports and analytics', 'reports'),
    ('reports.export', 'reports', 'export', 'reports', 'Export reports (CSV, Excel, PDF)', 'reports'),
    ('reports.schedule', 'reports', 'schedule', 'reports', 'Schedule automated reports', 'reports'),
    ('reports.settings', 'reports', 'settings', 'reports', 'Manage reports settings', 'reports')
) AS v(code, module, action, resource, description, _)
WHERE NOT EXISTS (SELECT 1 FROM hrms.permissions p WHERE p.code = v.code);

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'super_admin' AND p.code LIKE 'reports.%'
  AND NOT EXISTS (SELECT 1 FROM hrms.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'hr_admin' AND p.code LIKE 'reports.%'
  AND NOT EXISTS (SELECT 1 FROM hrms.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'manager' AND p.code IN ('reports.view', 'reports.export')
  AND NOT EXISTS (SELECT 1 FROM hrms.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);

-- Default settings
UPDATE hrms.organization_settings
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{reports}',
  COALESCE(settings->'reports', '{
    "defaultExportFormat": "csv",
    "defaultDateRangeDays": 30,
    "enabledModules": ["hr","attendance","leave","payroll","performance","recruitment","assets","exit"],
    "scheduleEmailEnabled": true,
    "scheduleRetainRuns": 90
  }'::jsonb),
  true
),
updated_at = public.utc_now()
WHERE deleted_at IS NULL;

INSERT INTO hrms.organization_settings (organization_id, settings, status)
SELECT o.id,
  jsonb_build_object('reports', '{
    "defaultExportFormat": "csv",
    "defaultDateRangeDays": 30,
    "enabledModules": ["hr","attendance","leave","payroll","performance","recruitment","assets","exit"],
    "scheduleEmailEnabled": true,
    "scheduleRetainRuns": 90
  }'::jsonb),
  'active'
FROM hrms.organizations o
WHERE o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM hrms.organization_settings s
    WHERE s.organization_id = o.id AND s.deleted_at IS NULL
  );

SELECT public.attach_updated_at_trigger('hrms.report_schedules'::regclass);

ALTER TABLE hrms.report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.report_schedule_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS report_schedules_select_policy ON hrms.report_schedules;
CREATE POLICY report_schedules_select_policy ON hrms.report_schedules
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS report_schedules_insert_policy ON hrms.report_schedules;
CREATE POLICY report_schedules_insert_policy ON hrms.report_schedules
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS report_schedules_update_policy ON hrms.report_schedules;
CREATE POLICY report_schedules_update_policy ON hrms.report_schedules
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS report_schedule_runs_select_policy ON hrms.report_schedule_runs;
CREATE POLICY report_schedule_runs_select_policy ON hrms.report_schedule_runs
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS report_schedule_runs_insert_policy ON hrms.report_schedule_runs;
CREATE POLICY report_schedule_runs_insert_policy ON hrms.report_schedule_runs
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));
