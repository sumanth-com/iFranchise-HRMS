-- =============================================================================
-- Migration: system_admin_enterprise
-- Description: Enterprise System Administration tables and permissions
-- =============================================================================

INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT v.code, v.module, v.action, v.resource, v.description, 'active'::hrms.record_status
FROM (VALUES
  ('system.api_keys.manage', 'system', 'manage', 'api_keys', 'Manage system API keys', 'active'),
  ('system.backup.manage', 'system', 'manage', 'backup', 'Manage backups and restore', 'active'),
  ('system.import_export.manage', 'system', 'manage', 'import_export', 'Import and export data', 'active'),
  ('system.storage.manage', 'system', 'manage', 'storage', 'Manage storage buckets', 'active'),
  ('system.email.manage', 'system', 'manage', 'email', 'Manage email services', 'active')
) AS v(code, module, action, resource, description)
WHERE NOT EXISTS (
  SELECT 1 FROM hrms.permissions p WHERE p.code = v.code AND p.deleted_at IS NULL
);

INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'
FROM hrms.roles r
JOIN hrms.permissions p ON p.code LIKE 'system.%' AND p.deleted_at IS NULL
WHERE r.code = 'super_admin'
  AND r.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  );

ALTER TABLE hrms.system_settings
  ADD COLUMN IF NOT EXISTS maintenance_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS maintenance_allowed_users jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS maintenance_banner text,
  ADD COLUMN IF NOT EXISTS emergency_shutdown boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS license_key text,
  ADD COLUMN IF NOT EXISTS license_employee_limit integer,
  ADD COLUMN IF NOT EXISTS license_org_limit integer,
  ADD COLUMN IF NOT EXISTS license_storage_limit_gb integer,
  ADD COLUMN IF NOT EXISTS feature_flag_rollouts jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS api_usage_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS hrms.system_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  allowed_ips jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at timestamptz,
  last_used_at timestamptz,
  last_used_ip text,
  usage_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS system_api_keys_org_idx
  ON hrms.system_api_keys (organization_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS hrms.system_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE CASCADE,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('connected', 'disconnected', 'error', 'syncing')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  deleted_at timestamptz,
  UNIQUE (organization_id, provider)
);

CREATE TABLE IF NOT EXISTS hrms.system_backup_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE CASCADE,
  backup_type text NOT NULL,
  format text NOT NULL CHECK (format IN ('json', 'csv')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  storage_path text,
  file_size_bytes bigint,
  duration_ms integer,
  record_count integer,
  error_message text,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  completed_at timestamptz,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS system_backup_jobs_org_idx
  ON hrms.system_backup_jobs (organization_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS hrms.system_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE CASCADE,
  to_email text NOT NULL,
  subject text,
  status text NOT NULL CHECK (status IN ('queued', 'sent', 'failed')),
  error_message text,
  message_id text,
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  sent_at timestamptz,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS system_email_logs_org_idx
  ON hrms.system_email_logs (organization_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS hrms.system_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE CASCADE,
  module text NOT NULL,
  format text NOT NULL CHECK (format IN ('json', 'csv')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'rolled_back')),
  record_count integer,
  success_count integer,
  error_count integer,
  errors jsonb,
  storage_path text,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  completed_at timestamptz,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS hrms.system_scheduled_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE CASCADE,
  job_key text NOT NULL,
  job_name text NOT NULL,
  schedule text NOT NULL,
  last_run_at timestamptz,
  last_status text,
  next_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  UNIQUE (organization_id, job_key)
);

INSERT INTO hrms.system_scheduled_jobs (organization_id, job_key, job_name, schedule, last_status)
SELECT o.id, v.job_key, v.job_name, v.schedule, 'idle'
FROM hrms.organizations o
CROSS JOIN (VALUES
  ('daily_backup', 'Daily Backup', '0 2 * * *'),
  ('weekly_backup', 'Weekly Backup', '0 3 * * 0'),
  ('monthly_backup', 'Monthly Backup', '0 4 1 * *'),
  ('email_queue', 'Email Queue Processor', '*/5 * * * *'),
  ('payslip_publish', 'Payslip Publication', '0 6 * * *')
) AS v(job_key, job_name, schedule)
WHERE o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM hrms.system_scheduled_jobs j
    WHERE j.organization_id = o.id AND j.job_key = v.job_key
  );

ALTER TABLE hrms.system_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.system_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.system_backup_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.system_email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.system_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.system_scheduled_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY system_api_keys_policy ON hrms.system_api_keys
  FOR ALL TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND hrms.user_has_permission('system.api_keys.manage'))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id) AND hrms.user_has_permission('system.api_keys.manage'));

CREATE POLICY system_integrations_policy ON hrms.system_integrations
  FOR ALL TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND hrms.user_has_permission('system.integrations.view'))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id) AND hrms.user_has_permission('system.integrations.view'));

CREATE POLICY system_backup_jobs_policy ON hrms.system_backup_jobs
  FOR ALL TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND hrms.user_has_permission('system.backup.manage'))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id) AND hrms.user_has_permission('system.backup.manage'));

CREATE POLICY system_email_logs_policy ON hrms.system_email_logs
  FOR ALL TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND hrms.user_has_permission('system.email.manage'))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id) AND hrms.user_has_permission('system.email.manage'));

CREATE POLICY system_import_jobs_policy ON hrms.system_import_jobs
  FOR ALL TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND hrms.user_has_permission('system.import_export.manage'))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id) AND hrms.user_has_permission('system.import_export.manage'));

CREATE POLICY system_scheduled_jobs_select_policy ON hrms.system_scheduled_jobs
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND hrms.user_has_permission('system.dashboard.view'));

CREATE POLICY system_scheduled_jobs_manage_policy ON hrms.system_scheduled_jobs
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND hrms.user_has_permission('system.config.edit'))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id) AND hrms.user_has_permission('system.config.edit'));

INSERT INTO hrms.system_integrations (organization_id, provider, status)
SELECT o.id, v.provider, 'disconnected'
FROM hrms.organizations o
CROSS JOIN (VALUES
  ('microsoft365'),
  ('google_workspace'),
  ('slack'),
  ('teams'),
  ('zoom'),
  ('webhook'),
  ('rest_api'),
  ('zapier')
) AS v(provider)
WHERE o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM hrms.system_integrations i
    WHERE i.organization_id = o.id AND i.provider = v.provider AND i.deleted_at IS NULL
  );
