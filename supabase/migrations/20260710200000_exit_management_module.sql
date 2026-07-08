-- Phase 10: Enterprise Exit Management

DO $$ BEGIN
  CREATE TYPE hrms.exit_status AS ENUM (
    'submitted',
    'manager_approved',
    'hr_approved',
    'clearance',
    'asset_return',
    'settlement',
    'interview',
    'documents',
    'completed',
    'rejected',
    'withdrawn'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.exit_clearance_status AS ENUM (
    'pending', 'approved', 'rejected', 'not_required'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.exit_asset_return_status AS ENUM (
    'pending', 'returned', 'damaged', 'lost', 'replacement_required'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.exit_settlement_status AS ENUM (
    'draft', 'pending', 'approved', 'paid'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- Resignations
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.exit_resignations (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  resignation_date date NOT NULL,
  last_working_day date NOT NULL,
  notice_period_days integer NOT NULL DEFAULT 30,
  reason text NOT NULL,
  comments text,
  exit_status hrms.exit_status NOT NULL DEFAULT 'submitted',
  manager_employee_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL,
  manager_acted_at timestamptz,
  manager_remarks text,
  hr_acted_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  hr_acted_at timestamptz,
  hr_remarks text,
  rejected_reason text,
  withdrawn_at timestamptz,
  completed_at timestamptz,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT exit_resignations_reason_not_empty CHECK (length(trim(reason)) > 0),
  CONSTRAINT exit_resignations_lwd_after_resignation CHECK (last_working_day >= resignation_date),
  CONSTRAINT exit_resignations_notice_positive CHECK (notice_period_days >= 0)
);

CREATE INDEX IF NOT EXISTS exit_resignations_org_idx ON hrms.exit_resignations (organization_id);
CREATE INDEX IF NOT EXISTS exit_resignations_employee_idx ON hrms.exit_resignations (employee_id);
CREATE INDEX IF NOT EXISTS exit_resignations_status_idx ON hrms.exit_resignations (exit_status);
CREATE INDEX IF NOT EXISTS exit_resignations_lwd_idx ON hrms.exit_resignations (last_working_day);

CREATE UNIQUE INDEX IF NOT EXISTS exit_resignations_active_employee_idx
  ON hrms.exit_resignations (organization_id, employee_id)
  WHERE deleted_at IS NULL
    AND exit_status NOT IN ('completed', 'rejected', 'withdrawn');

-- -----------------------------------------------------------------------------
-- Clearance checklist
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.exit_clearance_items (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  resignation_id uuid NOT NULL REFERENCES hrms.exit_resignations (id) ON DELETE CASCADE,
  department_key text NOT NULL,
  department_label text NOT NULL,
  clearance_status hrms.exit_clearance_status NOT NULL DEFAULT 'pending',
  remarks text,
  acted_by_employee_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL,
  acted_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  acted_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT exit_clearance_dept_not_empty CHECK (length(trim(department_key)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS exit_clearance_unique_dept_idx
  ON hrms.exit_clearance_items (resignation_id, department_key)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS exit_clearance_resignation_idx ON hrms.exit_clearance_items (resignation_id);

-- -----------------------------------------------------------------------------
-- Asset returns linked to exit
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.exit_asset_returns (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  resignation_id uuid NOT NULL REFERENCES hrms.exit_resignations (id) ON DELETE CASCADE,
  asset_id uuid REFERENCES hrms.assets (id) ON DELETE SET NULL,
  assignment_id uuid REFERENCES hrms.asset_assignments (id) ON DELETE SET NULL,
  asset_code text,
  asset_name text NOT NULL,
  category_name text,
  return_status hrms.exit_asset_return_status NOT NULL DEFAULT 'pending',
  condition_notes text,
  recovery_amount numeric(14, 2) DEFAULT 0,
  returned_at timestamptz,
  acted_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS exit_asset_returns_resignation_idx ON hrms.exit_asset_returns (resignation_id);

-- -----------------------------------------------------------------------------
-- Final settlement
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.exit_settlements (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  resignation_id uuid NOT NULL REFERENCES hrms.exit_resignations (id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  pending_salary numeric(14, 2) NOT NULL DEFAULT 0,
  leave_encashment numeric(14, 2) NOT NULL DEFAULT 0,
  bonus numeric(14, 2) NOT NULL DEFAULT 0,
  reimbursements numeric(14, 2) NOT NULL DEFAULT 0,
  deductions numeric(14, 2) NOT NULL DEFAULT 0,
  asset_damage_recovery numeric(14, 2) NOT NULL DEFAULT 0,
  net_payable numeric(14, 2) NOT NULL DEFAULT 0,
  leave_balance_days numeric(8, 2) NOT NULL DEFAULT 0,
  settlement_status hrms.exit_settlement_status NOT NULL DEFAULT 'draft',
  notes text,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  paid_at timestamptz,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS exit_settlements_resignation_idx
  ON hrms.exit_settlements (resignation_id)
  WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- Exit interview
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.exit_interviews (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  resignation_id uuid NOT NULL REFERENCES hrms.exit_resignations (id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  reason_for_leaving text,
  manager_rating integer CHECK (manager_rating IS NULL OR (manager_rating BETWEEN 1 AND 5)),
  work_environment_rating integer CHECK (work_environment_rating IS NULL OR (work_environment_rating BETWEEN 1 AND 5)),
  salary_satisfaction_rating integer CHECK (salary_satisfaction_rating IS NULL OR (salary_satisfaction_rating BETWEEN 1 AND 5)),
  growth_opportunities_rating integer CHECK (growth_opportunities_rating IS NULL OR (growth_opportunities_rating BETWEEN 1 AND 5)),
  company_culture_rating integer CHECK (company_culture_rating IS NULL OR (company_culture_rating BETWEEN 1 AND 5)),
  suggestions text,
  overall_rating integer CHECK (overall_rating IS NULL OR (overall_rating BETWEEN 1 AND 5)),
  hr_private_notes text,
  conducted_at timestamptz,
  conducted_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS exit_interviews_resignation_idx
  ON hrms.exit_interviews (resignation_id)
  WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- Timeline
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.exit_timeline (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  resignation_id uuid NOT NULL REFERENCES hrms.exit_resignations (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS exit_timeline_resignation_idx ON hrms.exit_timeline (resignation_id);

-- -----------------------------------------------------------------------------
-- Permissions
-- -----------------------------------------------------------------------------

INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT v.code, v.module, v.action, v.resource, v.description, 'active'
FROM (
  VALUES
    ('exit.view', 'exit', 'view', 'exit', 'View exit management', 'exit'),
    ('exit.create', 'exit', 'create', 'exit', 'Submit resignations', 'exit'),
    ('exit.approve', 'exit', 'approve', 'exit', 'Approve or reject resignations', 'exit'),
    ('exit.clearance', 'exit', 'clearance', 'exit', 'Manage exit clearance', 'exit'),
    ('exit.settlement', 'exit', 'settlement', 'exit', 'Manage final settlements', 'exit'),
    ('exit.documents', 'exit', 'documents', 'exit', 'Generate exit documents', 'exit'),
    ('exit.settings', 'exit', 'settings', 'exit', 'Manage exit settings', 'exit')
) AS v(code, module, action, resource, description, _)
WHERE NOT EXISTS (SELECT 1 FROM hrms.permissions p WHERE p.code = v.code);

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'super_admin' AND p.code LIKE 'exit.%'
  AND NOT EXISTS (SELECT 1 FROM hrms.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'hr_admin' AND p.code LIKE 'exit.%'
  AND NOT EXISTS (SELECT 1 FROM hrms.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'manager' AND p.code IN ('exit.view', 'exit.approve', 'exit.clearance')
  AND NOT EXISTS (SELECT 1 FROM hrms.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'employee' AND p.code IN ('exit.view', 'exit.create')
  AND NOT EXISTS (SELECT 1 FROM hrms.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);

-- -----------------------------------------------------------------------------
-- Settings
-- -----------------------------------------------------------------------------

UPDATE hrms.organization_settings
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{exit}',
  COALESCE(settings->'exit', '{
    "defaultNoticePeriodDays": 30,
    "clearanceDepartments": [
      {"key": "manager", "label": "Reporting Manager"},
      {"key": "hr", "label": "HR"},
      {"key": "it", "label": "IT"},
      {"key": "finance", "label": "Finance"},
      {"key": "admin", "label": "Administration"}
    ],
    "enableExitInterview": true,
    "autoGenerateDocuments": true,
    "autoArchiveEmployee": true,
    "retentionPeriodDays": 2555
  }'::jsonb),
  true
),
updated_at = public.utc_now()
WHERE deleted_at IS NULL;

INSERT INTO hrms.organization_settings (organization_id, settings, status)
SELECT o.id,
  jsonb_build_object('exit', '{
    "defaultNoticePeriodDays": 30,
    "clearanceDepartments": [
      {"key": "manager", "label": "Reporting Manager"},
      {"key": "hr", "label": "HR"},
      {"key": "it", "label": "IT"},
      {"key": "finance", "label": "Finance"},
      {"key": "admin", "label": "Administration"}
    ],
    "enableExitInterview": true,
    "autoGenerateDocuments": true,
    "autoArchiveEmployee": true,
    "retentionPeriodDays": 2555
  }'::jsonb),
  'active'
FROM hrms.organizations o
WHERE o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM hrms.organization_settings s
    WHERE s.organization_id = o.id AND s.deleted_at IS NULL
  );

-- -----------------------------------------------------------------------------
-- Triggers + RLS
-- -----------------------------------------------------------------------------

SELECT public.attach_updated_at_trigger('hrms.exit_resignations'::regclass);
SELECT public.attach_updated_at_trigger('hrms.exit_clearance_items'::regclass);
SELECT public.attach_updated_at_trigger('hrms.exit_asset_returns'::regclass);
SELECT public.attach_updated_at_trigger('hrms.exit_settlements'::regclass);
SELECT public.attach_updated_at_trigger('hrms.exit_interviews'::regclass);

ALTER TABLE hrms.exit_resignations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.exit_clearance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.exit_asset_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.exit_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.exit_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.exit_timeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exit_resignations_select_policy ON hrms.exit_resignations;
CREATE POLICY exit_resignations_select_policy ON hrms.exit_resignations
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS exit_resignations_insert_policy ON hrms.exit_resignations;
CREATE POLICY exit_resignations_insert_policy ON hrms.exit_resignations
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS exit_resignations_update_policy ON hrms.exit_resignations;
CREATE POLICY exit_resignations_update_policy ON hrms.exit_resignations
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS exit_clearance_select_policy ON hrms.exit_clearance_items;
CREATE POLICY exit_clearance_select_policy ON hrms.exit_clearance_items
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS exit_clearance_insert_policy ON hrms.exit_clearance_items;
CREATE POLICY exit_clearance_insert_policy ON hrms.exit_clearance_items
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS exit_clearance_update_policy ON hrms.exit_clearance_items;
CREATE POLICY exit_clearance_update_policy ON hrms.exit_clearance_items
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS exit_asset_returns_select_policy ON hrms.exit_asset_returns;
CREATE POLICY exit_asset_returns_select_policy ON hrms.exit_asset_returns
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS exit_asset_returns_insert_policy ON hrms.exit_asset_returns;
CREATE POLICY exit_asset_returns_insert_policy ON hrms.exit_asset_returns
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS exit_asset_returns_update_policy ON hrms.exit_asset_returns;
CREATE POLICY exit_asset_returns_update_policy ON hrms.exit_asset_returns
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS exit_settlements_select_policy ON hrms.exit_settlements;
CREATE POLICY exit_settlements_select_policy ON hrms.exit_settlements
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS exit_settlements_insert_policy ON hrms.exit_settlements;
CREATE POLICY exit_settlements_insert_policy ON hrms.exit_settlements
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS exit_settlements_update_policy ON hrms.exit_settlements;
CREATE POLICY exit_settlements_update_policy ON hrms.exit_settlements
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS exit_interviews_select_policy ON hrms.exit_interviews;
CREATE POLICY exit_interviews_select_policy ON hrms.exit_interviews
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS exit_interviews_insert_policy ON hrms.exit_interviews;
CREATE POLICY exit_interviews_insert_policy ON hrms.exit_interviews
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS exit_interviews_update_policy ON hrms.exit_interviews;
CREATE POLICY exit_interviews_update_policy ON hrms.exit_interviews
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS exit_timeline_select_policy ON hrms.exit_timeline;
CREATE POLICY exit_timeline_select_policy ON hrms.exit_timeline
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS exit_timeline_insert_policy ON hrms.exit_timeline;
CREATE POLICY exit_timeline_insert_policy ON hrms.exit_timeline
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

-- -----------------------------------------------------------------------------
-- Default exit letter templates
-- -----------------------------------------------------------------------------

INSERT INTO hrms.document_templates (
  organization_id, name, letter_type, document_type_code, subject, body_html, is_default, status
)
SELECT
  o.id,
  t.name,
  t.letter_type,
  t.document_type_code,
  t.subject,
  t.body_html,
  true,
  'active'
FROM hrms.organizations o
CROSS JOIN (
  VALUES
    (
      'Acceptance of Resignation',
      'resignation_acceptance_letter',
      'RESIGNATION_ACCEPTANCE_LETTER',
      'Acceptance of Resignation — {{employeeName}}',
      '<p>Dear {{employeeName}},</p><p>We hereby accept your resignation. Your last working day is noted as per HR records. Please complete clearance and asset return formalities.</p><p>Regards,<br/>{{companyName}}</p>'
    ),
    (
      'Final Settlement Letter',
      'settlement_letter',
      'SETTLEMENT_LETTER',
      'Final Settlement — {{employeeName}}',
      '<p>Dear {{employeeName}},</p><p>This letter confirms your final settlement. Please contact HR for any clarifications regarding dues and recoveries.</p><p>Employee Code: {{employeeCode}}<br/>Designation: {{designation}}<br/>Department: {{department}}</p><p>Regards,<br/>{{companyName}}</p>'
    )
) AS t(name, letter_type, document_type_code, subject, body_html)
WHERE o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM hrms.document_templates dt
    WHERE dt.organization_id = o.id
      AND dt.letter_type = t.letter_type
      AND dt.deleted_at IS NULL
  );
