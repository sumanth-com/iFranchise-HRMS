-- =============================================================================
-- Migration: notifications_module
-- Description: Centralized notifications system extensions
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE hrms.notification_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.notification_module AS ENUM (
    'system', 'attendance', 'leave', 'payroll', 'recruitment',
    'performance', 'documents', 'assets', 'exit', 'reports', 'security'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.notification_channel AS ENUM ('in_app', 'email', 'push');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.delivery_status AS ENUM ('pending', 'delivered', 'failed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- notifications — extended columns
-- -----------------------------------------------------------------------------

ALTER TABLE hrms.notifications
  ADD COLUMN IF NOT EXISTS module hrms.notification_module NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS priority hrms.notification_priority NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS source_event_key text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS notifications_module_idx ON hrms.notifications (module);
CREATE INDEX IF NOT EXISTS notifications_priority_idx ON hrms.notifications (priority);
CREATE INDEX IF NOT EXISTS notifications_source_event_key_idx ON hrms.notifications (source_event_key);

CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedup_active_idx
  ON hrms.notifications (organization_id, user_id, source_event_key)
  WHERE deleted_at IS NULL AND source_event_key IS NOT NULL;

-- -----------------------------------------------------------------------------
-- notification_templates
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.notification_templates (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  template_key text NOT NULL,
  name text NOT NULL,
  module hrms.notification_module NOT NULL,
  subject text NOT NULL,
  body_template text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT notification_templates_key_not_empty CHECK (length(trim(template_key)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS notification_templates_org_key_active_idx
  ON hrms.notification_templates (organization_id, template_key)
  WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- notification_settings (org-level channel config per type)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.notification_settings (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES hrms.organizations (id) ON DELETE CASCADE,
  type_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

-- -----------------------------------------------------------------------------
-- notification_user_preferences
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.notification_user_preferences (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  receive_email boolean NOT NULL DEFAULT true,
  receive_in_app boolean NOT NULL DEFAULT true,
  mute_notifications boolean NOT NULL DEFAULT false,
  daily_digest boolean NOT NULL DEFAULT false,
  weekly_digest boolean NOT NULL DEFAULT false,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT notification_user_preferences_user_org_unique UNIQUE (organization_id, user_id)
);

-- -----------------------------------------------------------------------------
-- notification_deliveries
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  notification_id uuid NOT NULL REFERENCES hrms.notifications (id) ON DELETE CASCADE,
  channel hrms.notification_channel NOT NULL,
  delivery_status hrms.delivery_status NOT NULL DEFAULT 'pending',
  attempted_at timestamptz,
  delivered_at timestamptz,
  error_message text,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS notification_deliveries_notification_id_idx
  ON hrms.notification_deliveries (notification_id);
CREATE INDEX IF NOT EXISTS notification_deliveries_status_idx
  ON hrms.notification_deliveries (delivery_status);

-- -----------------------------------------------------------------------------
-- Triggers & audit
-- -----------------------------------------------------------------------------

SELECT public.attach_updated_at_trigger('hrms.notification_templates'::regclass);
SELECT public.attach_updated_at_trigger('hrms.notification_settings'::regclass);
SELECT public.attach_updated_at_trigger('hrms.notification_user_preferences'::regclass);
SELECT public.attach_updated_at_trigger('hrms.notification_deliveries'::regclass);
SELECT public.attach_audit_trigger('hrms.notifications'::regclass);
SELECT public.attach_audit_trigger('hrms.notification_templates'::regclass);
SELECT public.attach_audit_trigger('hrms.notification_settings'::regclass);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

ALTER TABLE hrms.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.notification_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_templates_select_policy ON hrms.notification_templates
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

CREATE POLICY notification_templates_insert_policy ON hrms.notification_templates
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

CREATE POLICY notification_templates_update_policy ON hrms.notification_templates
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

CREATE POLICY notification_settings_select_policy ON hrms.notification_settings
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

CREATE POLICY notification_settings_insert_policy ON hrms.notification_settings
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

CREATE POLICY notification_settings_update_policy ON hrms.notification_settings
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

CREATE POLICY notification_user_preferences_select_policy ON hrms.notification_user_preferences
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

CREATE POLICY notification_user_preferences_insert_policy ON hrms.notification_user_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND hrms.user_belongs_to_organization(organization_id));

CREATE POLICY notification_user_preferences_update_policy ON hrms.notification_user_preferences
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (user_id = auth.uid() AND hrms.user_belongs_to_organization(organization_id));

CREATE POLICY notification_deliveries_select_policy ON hrms.notification_deliveries
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

CREATE POLICY notification_deliveries_insert_policy ON hrms.notification_deliveries
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

-- Admin can view all org notifications
CREATE POLICY notifications_admin_select_policy ON hrms.notifications
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND hrms.user_belongs_to_organization(organization_id)
    AND (
      hrms.user_has_permission('notifications.manage')
      OR hrms.user_has_permission('notification.manage')
    )
  );

-- -----------------------------------------------------------------------------
-- Permissions
-- -----------------------------------------------------------------------------

INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT v.code, v.module, v.action, v.resource, v.description, v.status::hrms.record_status
FROM (VALUES
  ('notifications.view', 'notifications', 'view', 'notifications', 'View notifications module', 'active'),
  ('notifications.manage', 'notifications', 'manage', 'notifications', 'Manage notifications', 'active'),
  ('notifications.settings', 'notifications', 'settings', 'notifications', 'Manage notification settings', 'active')
) AS v(code, module, action, resource, description, status)
WHERE NOT EXISTS (
  SELECT 1 FROM hrms.permissions p WHERE p.code = v.code AND p.deleted_at IS NULL
);

INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'::hrms.record_status
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code IN ('super_admin', 'hr_admin')
  AND r.deleted_at IS NULL
  AND p.code IN ('notifications.view', 'notifications.manage', 'notifications.settings')
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL
  );

-- All roles get notifications.view for module access
INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'::hrms.record_status
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.deleted_at IS NULL
  AND p.code = 'notifications.view'
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL
  );

-- -----------------------------------------------------------------------------
-- Seed templates for bootstrap org
-- -----------------------------------------------------------------------------

INSERT INTO hrms.notification_templates (
  organization_id, template_key, name, module, subject, body_template, variables
)
SELECT 'a0000000-0000-4000-8000-000000000001', v.key, v.name, v.module::hrms.notification_module,
  v.subject, v.body, v.vars::jsonb
FROM (VALUES
  ('leave_submitted', 'Leave Submitted', 'leave', 'Leave request submitted', 'Your leave request has been submitted and is pending approval.', '["employeeName","startDate","endDate"]'),
  ('leave_approved', 'Leave Approved', 'leave', 'Leave request approved', 'Your leave request from {{startDate}} to {{endDate}} has been approved.', '["employeeName","startDate","endDate"]'),
  ('leave_rejected', 'Leave Rejected', 'leave', 'Leave request rejected', 'Your leave request has been rejected.', '["employeeName","reason"]'),
  ('attendance_correction', 'Attendance Correction', 'attendance', 'Attendance correction submitted', 'An attendance correction request requires your review.', '["employeeName","date"]'),
  ('interview_scheduled', 'Interview Scheduled', 'recruitment', 'Interview scheduled', 'Interview {{roundName}} with {{candidateName}} is scheduled for {{when}}.', '["candidateName","roundName","when"]'),
  ('offer_sent', 'Offer Sent', 'recruitment', 'Offer sent', 'An offer has been sent to {{candidateName}}.', '["candidateName"]'),
  ('employee_joined', 'Employee Joined', 'recruitment', 'Employee joined', '{{candidateName}} has joined the organization.', '["candidateName","joiningDate"]'),
  ('payroll_generated', 'Payroll Generated', 'payroll', 'Payroll generated', 'Payroll for {{month}} has been generated.', '["month"]'),
  ('payslip_available', 'Payslip Available', 'payroll', 'Payslip available', 'Your payslip for {{month}} is ready to view.', '["month","payslipNumber"]'),
  ('performance_review_due', 'Performance Review Due', 'performance', 'Performance review due', 'Your performance review is due by {{dueDate}}.', '["dueDate"]'),
  ('promotion_approved', 'Promotion Approved', 'performance', 'Promotion approved', 'Your promotion to {{designation}} has been approved.', '["designation"]'),
  ('asset_assigned', 'Asset Assigned', 'assets', 'Asset assigned', 'Asset {{assetName}} has been assigned to you.', '["assetName"]'),
  ('asset_returned', 'Asset Returned', 'assets', 'Asset returned', 'Asset {{assetName}} has been returned.', '["assetName"]'),
  ('exit_approved', 'Exit Approved', 'exit', 'Exit approved', 'Your exit request has been approved.', '["employeeName"]'),
  ('document_expiring', 'Document Expiring', 'documents', 'Document expiring soon', 'Your document {{documentName}} expires on {{expiryDate}}.', '["documentName","expiryDate"]')
) AS v(key, name, module, subject, body, vars)
WHERE NOT EXISTS (
  SELECT 1 FROM hrms.notification_templates t
  WHERE t.organization_id = 'a0000000-0000-4000-8000-000000000001'
    AND t.template_key = v.key AND t.deleted_at IS NULL
);

INSERT INTO hrms.notification_settings (organization_id, type_settings, status)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  jsonb_build_object(
    'leave', jsonb_build_object('in_app', true, 'email', true, 'push', false),
    'attendance', jsonb_build_object('in_app', true, 'email', true, 'push', false),
    'payroll', jsonb_build_object('in_app', true, 'email', true, 'push', false),
    'recruitment', jsonb_build_object('in_app', true, 'email', true, 'push', false),
    'performance', jsonb_build_object('in_app', true, 'email', false, 'push', false),
    'documents', jsonb_build_object('in_app', true, 'email', true, 'push', false),
    'assets', jsonb_build_object('in_app', true, 'email', false, 'push', false),
    'exit', jsonb_build_object('in_app', true, 'email', true, 'push', false),
    'system', jsonb_build_object('in_app', true, 'email', true, 'push', false),
    'security', jsonb_build_object('in_app', true, 'email', true, 'push', false),
    'reports', jsonb_build_object('in_app', true, 'email', false, 'push', false)
  ),
  'active'
)
ON CONFLICT (organization_id) DO NOTHING;
