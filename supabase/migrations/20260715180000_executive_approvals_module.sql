-- =============================================================================
-- Migration: executive_approvals_module
-- Description: CEO executive approval requests, timeline, comments, and templates
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE hrms.executive_approval_type AS ENUM (
    'senior_hiring',
    'department_creation',
    'department_closure',
    'budget_approval',
    'salary_revision',
    'executive_promotion',
    'organization_policy',
    'new_branch',
    'asset_purchase',
    'strategic_recruitment',
    'organization_structure'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.executive_approval_priority AS ENUM (
    'low', 'medium', 'high', 'critical'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.executive_approval_status AS ENUM (
    'submitted',
    'reviewed',
    'escalated',
    'pending_ceo',
    'clarification_requested',
    'revision_requested',
    'approved',
    'rejected',
    'completed',
    'forwarded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE hrms.notification_module ADD VALUE IF NOT EXISTS 'approvals';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- executive_approval_requests
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.executive_approval_requests (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  request_code text NOT NULL,
  approval_type hrms.executive_approval_type NOT NULL,
  title text NOT NULL,
  summary text,
  business_justification text,
  financial_impact numeric(14, 2) NOT NULL DEFAULT 0,
  risk_assessment text,
  priority hrms.executive_approval_priority NOT NULL DEFAULT 'medium',
  request_status hrms.executive_approval_status NOT NULL DEFAULT 'pending_ceo',
  department_id uuid REFERENCES hrms.departments (id) ON DELETE SET NULL,
  requested_by_employee_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL,
  reviewed_by_employee_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL,
  escalated_by_employee_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL,
  decided_by_employee_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL,
  forwarded_to_employee_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL,
  source_module text,
  source_record_id uuid,
  submitted_at timestamptz NOT NULL DEFAULT public.utc_now(),
  reviewed_at timestamptz,
  escalated_at timestamptz,
  due_at timestamptz,
  decided_at timestamptz,
  completed_at timestamptz,
  executive_remarks text,
  decision_reason text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  supporting_documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT executive_approval_requests_code_not_empty CHECK (length(trim(request_code)) > 0),
  CONSTRAINT executive_approval_requests_title_not_empty CHECK (length(trim(title)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS executive_approval_requests_org_code_active_idx
  ON hrms.executive_approval_requests (organization_id, request_code)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS executive_approval_requests_source_active_idx
  ON hrms.executive_approval_requests (organization_id, source_module, source_record_id)
  WHERE deleted_at IS NULL
    AND source_module IS NOT NULL
    AND source_record_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS executive_approval_requests_org_idx
  ON hrms.executive_approval_requests (organization_id);
CREATE INDEX IF NOT EXISTS executive_approval_requests_type_idx
  ON hrms.executive_approval_requests (approval_type);
CREATE INDEX IF NOT EXISTS executive_approval_requests_status_idx
  ON hrms.executive_approval_requests (request_status);
CREATE INDEX IF NOT EXISTS executive_approval_requests_priority_idx
  ON hrms.executive_approval_requests (priority);
CREATE INDEX IF NOT EXISTS executive_approval_requests_department_idx
  ON hrms.executive_approval_requests (department_id);
CREATE INDEX IF NOT EXISTS executive_approval_requests_requested_by_idx
  ON hrms.executive_approval_requests (requested_by_employee_id);
CREATE INDEX IF NOT EXISTS executive_approval_requests_due_at_idx
  ON hrms.executive_approval_requests (due_at);
CREATE INDEX IF NOT EXISTS executive_approval_requests_submitted_at_idx
  ON hrms.executive_approval_requests (submitted_at);

-- -----------------------------------------------------------------------------
-- executive_approval_events (timeline / history)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.executive_approval_events (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  request_id uuid NOT NULL REFERENCES hrms.executive_approval_requests (id) ON DELETE CASCADE,
  event_key text NOT NULL,
  title text NOT NULL,
  description text,
  actor_employee_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT public.utc_now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT public.utc_now()
);

CREATE INDEX IF NOT EXISTS executive_approval_events_request_idx
  ON hrms.executive_approval_events (request_id, occurred_at);
CREATE INDEX IF NOT EXISTS executive_approval_events_org_idx
  ON hrms.executive_approval_events (organization_id);

-- -----------------------------------------------------------------------------
-- executive_approval_comments
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.executive_approval_comments (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  request_id uuid NOT NULL REFERENCES hrms.executive_approval_requests (id) ON DELETE CASCADE,
  author_employee_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL,
  author_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  comment_text text NOT NULL,
  is_executive_remark boolean NOT NULL DEFAULT false,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT executive_approval_comments_text_not_empty CHECK (length(trim(comment_text)) > 0)
);

CREATE INDEX IF NOT EXISTS executive_approval_comments_request_idx
  ON hrms.executive_approval_comments (request_id, created_at);
CREATE INDEX IF NOT EXISTS executive_approval_comments_org_idx
  ON hrms.executive_approval_comments (organization_id);

-- -----------------------------------------------------------------------------
-- Triggers / RLS / audit
-- -----------------------------------------------------------------------------

SELECT public.attach_updated_at_trigger('hrms.executive_approval_requests'::regclass);
SELECT public.attach_updated_at_trigger('hrms.executive_approval_comments'::regclass);
SELECT public.attach_audit_trigger('hrms.executive_approval_requests'::regclass);
SELECT public.attach_audit_trigger('hrms.executive_approval_comments'::regclass);

ALTER TABLE hrms.executive_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.executive_approval_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.executive_approval_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS executive_approval_requests_select_policy ON hrms.executive_approval_requests;
CREATE POLICY executive_approval_requests_select_policy ON hrms.executive_approval_requests
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS executive_approval_requests_insert_policy ON hrms.executive_approval_requests;
CREATE POLICY executive_approval_requests_insert_policy ON hrms.executive_approval_requests
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS executive_approval_requests_update_policy ON hrms.executive_approval_requests;
CREATE POLICY executive_approval_requests_update_policy ON hrms.executive_approval_requests
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS executive_approval_events_select_policy ON hrms.executive_approval_events;
CREATE POLICY executive_approval_events_select_policy ON hrms.executive_approval_events
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS executive_approval_events_insert_policy ON hrms.executive_approval_events;
CREATE POLICY executive_approval_events_insert_policy ON hrms.executive_approval_events
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS executive_approval_comments_select_policy ON hrms.executive_approval_comments;
CREATE POLICY executive_approval_comments_select_policy ON hrms.executive_approval_comments
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS executive_approval_comments_insert_policy ON hrms.executive_approval_comments;
CREATE POLICY executive_approval_comments_insert_policy ON hrms.executive_approval_comments
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS executive_approval_comments_update_policy ON hrms.executive_approval_comments;
CREATE POLICY executive_approval_comments_update_policy ON hrms.executive_approval_comments
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

-- Extend audit module resolver for executive approvals
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
    WHEN 'executive_approval_requests' THEN 'approvals'
    WHEN 'executive_approval_comments' THEN 'approvals'
    ELSE 'settings'
  END;
$$;

-- Notification templates (best-effort; ignore if org has none)
INSERT INTO hrms.notification_templates (
  organization_id, template_key, name, module, subject, body_template, variables, status
)
SELECT
  o.id,
  t.template_key,
  t.name,
  'system'::hrms.notification_module,
  t.subject,
  t.body_template,
  t.variables::jsonb,
  'active'::hrms.record_status
FROM hrms.organizations o
CROSS JOIN (
  VALUES
    (
      'executive_approval_new',
      'New Executive Approval',
      'New executive approval: {{title}}',
      'A {{approvalType}} request ({{requestCode}}) requires CEO authorization.',
      '["title","approvalType","requestCode"]'
    ),
    (
      'executive_approval_reminder',
      'Executive Approval Reminder',
      'Reminder: pending approval {{requestCode}}',
      'Approval {{title}} is still awaiting your decision. Due {{dueDate}}.',
      '["title","requestCode","dueDate"]'
    ),
    (
      'executive_approval_overdue',
      'Overdue Executive Approval',
      'Overdue approval: {{requestCode}}',
      'Approval {{title}} is overdue and requires immediate attention.',
      '["title","requestCode"]'
    ),
    (
      'executive_approval_escalated',
      'Escalated Executive Approval',
      'Escalated: {{title}}',
      'Request {{requestCode}} has been escalated for CEO decision.',
      '["title","requestCode"]'
    ),
    (
      'executive_approval_approved',
      'Executive Approval Approved',
      'Approved: {{title}}',
      'Your request {{requestCode}} has been approved by the CEO.',
      '["title","requestCode"]'
    ),
    (
      'executive_approval_rejected',
      'Executive Approval Rejected',
      'Rejected: {{title}}',
      'Your request {{requestCode}} was rejected by the CEO. {{reason}}',
      '["title","requestCode","reason"]'
    ),
    (
      'executive_approval_revision',
      'Executive Revision Requested',
      'Revision requested: {{title}}',
      'The CEO requested revisions for {{requestCode}}. {{reason}}',
      '["title","requestCode","reason"]'
    ),
    (
      'executive_approval_clarification',
      'Executive Clarification Requested',
      'More information needed: {{title}}',
      'The CEO requested clarification on {{requestCode}}. {{reason}}',
      '["title","requestCode","reason"]'
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
