-- =============================================================================
-- Migration: ceo_profile_settings_module
-- Description: User preferences, executive alert prefs, login sessions,
--              and self-scoped audit visibility for CEO Profile & Settings
-- =============================================================================

-- -----------------------------------------------------------------------------
-- user_preferences — theme, locale, portal defaults
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.user_preferences (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'system'
    CHECK (theme IN ('light', 'dark', 'system')),
  language text NOT NULL DEFAULT 'en',
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  date_format text NOT NULL DEFAULT 'dd MMM yyyy',
  time_format text NOT NULL DEFAULT '24h'
    CHECK (time_format IN ('12h', '24h')),
  default_dashboard text NOT NULL DEFAULT '/ceo',
  default_landing_page text NOT NULL DEFAULT '/ceo',
  sidebar_state text NOT NULL DEFAULT 'expanded'
    CHECK (sidebar_state IN ('expanded', 'collapsed')),
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT user_preferences_org_user_unique UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS user_preferences_user_idx
  ON hrms.user_preferences (user_id)
  WHERE deleted_at IS NULL;

SELECT public.attach_updated_at_trigger('hrms.user_preferences'::regclass);
SELECT public.attach_audit_trigger('hrms.user_preferences'::regclass);

ALTER TABLE hrms.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_preferences_select_policy ON hrms.user_preferences;
CREATE POLICY user_preferences_select_policy ON hrms.user_preferences
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_id = auth.uid()
    AND hrms.user_belongs_to_organization(organization_id)
  );

DROP POLICY IF EXISTS user_preferences_insert_policy ON hrms.user_preferences;
CREATE POLICY user_preferences_insert_policy ON hrms.user_preferences
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND hrms.user_belongs_to_organization(organization_id)
  );

DROP POLICY IF EXISTS user_preferences_update_policy ON hrms.user_preferences;
CREATE POLICY user_preferences_update_policy ON hrms.user_preferences
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND hrms.user_belongs_to_organization(organization_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND hrms.user_belongs_to_organization(organization_id)
  );

-- -----------------------------------------------------------------------------
-- Executive alert category preferences on notification_user_preferences
-- -----------------------------------------------------------------------------

ALTER TABLE hrms.notification_user_preferences
  ADD COLUMN IF NOT EXISTS alert_preferences jsonb NOT NULL DEFAULT '{
    "executiveAlerts": true,
    "payrollAlerts": true,
    "recruitmentAlerts": true,
    "attendanceAlerts": true,
    "performanceAlerts": true,
    "approvals": true,
    "companyAnnouncements": true,
    "emailNotifications": true,
    "pushNotifications": false,
    "desktopNotifications": true
  }'::jsonb;

ALTER TABLE hrms.notification_user_preferences
  ADD COLUMN IF NOT EXISTS receive_push boolean NOT NULL DEFAULT false;

ALTER TABLE hrms.notification_user_preferences
  ADD COLUMN IF NOT EXISTS receive_desktop boolean NOT NULL DEFAULT true;

-- -----------------------------------------------------------------------------
-- user_login_sessions — security / device history
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.user_login_sessions (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  employee_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL,
  device_type text,
  browser text,
  operating_system text,
  ip_address text,
  location text,
  user_agent text,
  is_current boolean NOT NULL DEFAULT false,
  logged_in_at timestamptz NOT NULL DEFAULT public.utc_now(),
  last_seen_at timestamptz NOT NULL DEFAULT public.utc_now(),
  revoked_at timestamptz,
  revoke_reason text,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS user_login_sessions_user_idx
  ON hrms.user_login_sessions (user_id, logged_in_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS user_login_sessions_active_idx
  ON hrms.user_login_sessions (user_id)
  WHERE deleted_at IS NULL AND revoked_at IS NULL;

SELECT public.attach_updated_at_trigger('hrms.user_login_sessions'::regclass);
SELECT public.attach_audit_trigger('hrms.user_login_sessions'::regclass);

ALTER TABLE hrms.user_login_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_login_sessions_select_policy ON hrms.user_login_sessions;
CREATE POLICY user_login_sessions_select_policy ON hrms.user_login_sessions
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_id = auth.uid()
    AND hrms.user_belongs_to_organization(organization_id)
  );

DROP POLICY IF EXISTS user_login_sessions_insert_policy ON hrms.user_login_sessions;
CREATE POLICY user_login_sessions_insert_policy ON hrms.user_login_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND hrms.user_belongs_to_organization(organization_id)
  );

DROP POLICY IF EXISTS user_login_sessions_update_policy ON hrms.user_login_sessions;
CREATE POLICY user_login_sessions_update_policy ON hrms.user_login_sessions
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND hrms.user_belongs_to_organization(organization_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND hrms.user_belongs_to_organization(organization_id)
  );

-- Allow authenticated users to read their own audit trail (self-service)
DROP POLICY IF EXISTS audit_logs_select_policy ON hrms.audit_logs;
CREATE POLICY audit_logs_select_policy ON hrms.audit_logs
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND archived_at IS NULL
    AND (
      user_id = auth.uid()
      OR (
        hrms.user_has_permission('audit.view')
        AND (
          organization_id IS NULL
          OR hrms.user_belongs_to_organization(organization_id)
        )
      )
    )
  );

-- Resolve audit modules for new tables (preserve existing mapping)
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
    WHEN 'notification_user_preferences' THEN 'notifications'
    WHEN 'organization_settings' THEN 'settings'
    WHEN 'user_preferences' THEN 'settings'
    WHEN 'user_login_sessions' THEN 'security'
    WHEN 'report_schedules' THEN 'reports'
    WHEN 'report_schedule_runs' THEN 'reports'
    WHEN 'executive_report_runs' THEN 'reports'
    WHEN 'application' THEN 'dashboard'
    WHEN 'executive_approval_requests' THEN 'approvals'
    WHEN 'executive_approval_comments' THEN 'approvals'
    ELSE 'settings'
  END;
$$;
