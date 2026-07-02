-- =============================================================================
-- Migration: hrms_support_tables
-- Description: Holidays, notifications, audit logs, and organization settings
-- =============================================================================

-- -----------------------------------------------------------------------------
-- holidays
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.holidays (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  branch_id uuid REFERENCES hrms.branches (id) ON DELETE SET NULL,
  name text NOT NULL,
  holiday_date date NOT NULL,
  description text,
  is_optional boolean NOT NULL DEFAULT false,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT holidays_name_not_empty CHECK (length(trim(name)) > 0)
);

CREATE INDEX holidays_organization_id_idx ON hrms.holidays (organization_id);
CREATE INDEX holidays_branch_id_idx ON hrms.holidays (branch_id);
CREATE INDEX holidays_holiday_date_idx ON hrms.holidays (holiday_date);
CREATE INDEX holidays_status_idx ON hrms.holidays (status);
CREATE INDEX holidays_deleted_at_idx ON hrms.holidays (deleted_at);
CREATE UNIQUE INDEX holidays_org_branch_date_name_active_idx
  ON hrms.holidays (
    organization_id,
    coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid),
    holiday_date,
    name
  )
  WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.notifications (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  employee_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL,
  title text NOT NULL,
  message text NOT NULL,
  notification_type text NOT NULL DEFAULT 'general',
  notification_status hrms.notification_status NOT NULL DEFAULT 'unread',
  action_url text,
  read_at timestamptz,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT notifications_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT notifications_message_not_empty CHECK (length(trim(message)) > 0)
);

CREATE INDEX notifications_organization_id_idx ON hrms.notifications (organization_id);
CREATE INDEX notifications_user_id_idx ON hrms.notifications (user_id);
CREATE INDEX notifications_employee_id_idx ON hrms.notifications (employee_id);
CREATE INDEX notifications_notification_status_idx ON hrms.notifications (notification_status);
CREATE INDEX notifications_notification_type_idx ON hrms.notifications (notification_type);
CREATE INDEX notifications_created_at_idx ON hrms.notifications (created_at);
CREATE INDEX notifications_status_idx ON hrms.notifications (status);
CREATE INDEX notifications_deleted_at_idx ON hrms.notifications (deleted_at);

-- -----------------------------------------------------------------------------
-- audit_logs
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.audit_logs (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid REFERENCES hrms.organizations (id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  schema_name text NOT NULL DEFAULT 'hrms',
  table_name text NOT NULL,
  record_id text NOT NULL,
  operation hrms.audit_operation NOT NULL,
  old_record jsonb,
  new_record jsonb,
  occurred_at timestamptz NOT NULL DEFAULT public.utc_now(),
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT audit_logs_table_name_not_empty CHECK (length(trim(table_name)) > 0),
  CONSTRAINT audit_logs_record_id_not_empty CHECK (length(trim(record_id)) > 0)
);

CREATE INDEX audit_logs_organization_id_idx ON hrms.audit_logs (organization_id);
CREATE INDEX audit_logs_user_id_idx ON hrms.audit_logs (user_id);
CREATE INDEX audit_logs_table_name_idx ON hrms.audit_logs (table_name);
CREATE INDEX audit_logs_record_id_idx ON hrms.audit_logs (record_id);
CREATE INDEX audit_logs_operation_idx ON hrms.audit_logs (operation);
CREATE INDEX audit_logs_occurred_at_idx ON hrms.audit_logs (occurred_at);
CREATE INDEX audit_logs_status_idx ON hrms.audit_logs (status);
CREATE INDEX audit_logs_deleted_at_idx ON hrms.audit_logs (deleted_at);
CREATE INDEX audit_logs_table_record_idx ON hrms.audit_logs (table_name, record_id);

-- -----------------------------------------------------------------------------
-- organization_settings
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.organization_settings (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES hrms.organizations (id) ON DELETE CASCADE,
  timezone text NOT NULL DEFAULT 'UTC',
  date_format text NOT NULL DEFAULT 'YYYY-MM-DD',
  currency_code char(3) NOT NULL DEFAULT 'USD',
  fiscal_year_start_month smallint NOT NULL DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
  payroll_cycle text NOT NULL DEFAULT 'monthly',
  work_week_start_day smallint NOT NULL DEFAULT 1 CHECK (work_week_start_day BETWEEN 0 AND 6),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE INDEX organization_settings_organization_id_idx ON hrms.organization_settings (organization_id);
CREATE INDEX organization_settings_status_idx ON hrms.organization_settings (status);
CREATE INDEX organization_settings_deleted_at_idx ON hrms.organization_settings (deleted_at);
