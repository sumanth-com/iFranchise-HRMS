-- Phase 5: Payroll module enhancements

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE hrms.bonus_type AS ENUM (
    'festival',
    'performance',
    'referral',
    'special'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.bonus_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'paid',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.reimbursement_category AS ENUM (
    'travel',
    'food',
    'fuel',
    'internet',
    'laptop',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.reimbursement_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'paid',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.salary_revision_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'applied',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- payrolls: lock flag
-- -----------------------------------------------------------------------------

ALTER TABLE hrms.payrolls
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;

-- -----------------------------------------------------------------------------
-- payroll_approvals (HR → Finance → Super Admin)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.payroll_approvals (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  payroll_id uuid NOT NULL REFERENCES hrms.payrolls (id) ON DELETE CASCADE,
  approver_employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  approval_level smallint NOT NULL DEFAULT 1 CHECK (approval_level >= 1),
  approval_status hrms.approval_status NOT NULL DEFAULT 'pending',
  comments text,
  acted_at timestamptz,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT payroll_approvals_unique_level UNIQUE (payroll_id, approval_level)
);

CREATE INDEX IF NOT EXISTS payroll_approvals_payroll_id_idx
  ON hrms.payroll_approvals (payroll_id);
CREATE INDEX IF NOT EXISTS payroll_approvals_approver_employee_id_idx
  ON hrms.payroll_approvals (approver_employee_id);
CREATE INDEX IF NOT EXISTS payroll_approvals_approval_status_idx
  ON hrms.payroll_approvals (approval_status);

-- -----------------------------------------------------------------------------
-- employee_bonuses
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.employee_bonuses (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  bonus_type hrms.bonus_type NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  currency_code char(3) NOT NULL DEFAULT 'INR',
  bonus_month date NOT NULL,
  bonus_status hrms.bonus_status NOT NULL DEFAULT 'pending',
  payroll_id uuid REFERENCES hrms.payrolls (id) ON DELETE SET NULL,
  reason text,
  approved_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  approved_at timestamptz,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT employee_bonuses_month_first_day CHECK (
    bonus_month = date_trunc('month', bonus_month)::date
  )
);

CREATE INDEX IF NOT EXISTS employee_bonuses_organization_id_idx
  ON hrms.employee_bonuses (organization_id);
CREATE INDEX IF NOT EXISTS employee_bonuses_employee_id_idx
  ON hrms.employee_bonuses (employee_id);
CREATE INDEX IF NOT EXISTS employee_bonuses_bonus_month_idx
  ON hrms.employee_bonuses (bonus_month);
CREATE INDEX IF NOT EXISTS employee_bonuses_bonus_status_idx
  ON hrms.employee_bonuses (bonus_status);

-- -----------------------------------------------------------------------------
-- employee_reimbursements
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.employee_reimbursements (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  category hrms.reimbursement_category NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  currency_code char(3) NOT NULL DEFAULT 'INR',
  expense_date date NOT NULL,
  reimbursement_status hrms.reimbursement_status NOT NULL DEFAULT 'pending',
  payroll_id uuid REFERENCES hrms.payrolls (id) ON DELETE SET NULL,
  description text,
  receipt_path text,
  approver_employee_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejection_reason text,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS employee_reimbursements_organization_id_idx
  ON hrms.employee_reimbursements (organization_id);
CREATE INDEX IF NOT EXISTS employee_reimbursements_employee_id_idx
  ON hrms.employee_reimbursements (employee_id);
CREATE INDEX IF NOT EXISTS employee_reimbursements_status_idx
  ON hrms.employee_reimbursements (reimbursement_status);

-- -----------------------------------------------------------------------------
-- salary_revisions (never overwrite — track history)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.salary_revisions (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  previous_structure_id uuid REFERENCES hrms.salary_structures (id) ON DELETE SET NULL,
  new_structure_id uuid REFERENCES hrms.salary_structures (id) ON DELETE SET NULL,
  old_gross_salary numeric(12, 2) NOT NULL DEFAULT 0,
  new_gross_salary numeric(12, 2) NOT NULL DEFAULT 0,
  old_net_salary numeric(12, 2) NOT NULL DEFAULT 0,
  new_net_salary numeric(12, 2) NOT NULL DEFAULT 0,
  effective_from date NOT NULL,
  revision_status hrms.salary_revision_status NOT NULL DEFAULT 'pending',
  reason text,
  approver_employee_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL,
  approved_at timestamptz,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS salary_revisions_employee_id_idx
  ON hrms.salary_revisions (employee_id);
CREATE INDEX IF NOT EXISTS salary_revisions_effective_from_idx
  ON hrms.salary_revisions (effective_from);

-- -----------------------------------------------------------------------------
-- Permissions
-- -----------------------------------------------------------------------------

INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT v.code, v.module, v.action, v.resource, v.description, 'active'::hrms.record_status
FROM (
  VALUES
    ('payroll.create', 'payroll', 'create', 'payroll', 'Create payroll runs'),
    ('payroll.edit', 'payroll', 'edit', 'payroll', 'Edit payroll runs'),
    ('payroll.run', 'payroll', 'run', 'payroll', 'Run payroll processing'),
    ('payroll.download', 'payroll', 'download', 'payroll', 'Download payroll and payslips'),
    ('salary.view', 'payroll', 'view', 'salary', 'View salary information'),
    ('salary.edit', 'payroll', 'edit', 'salary', 'Edit salary information'),
    ('bonus.view', 'payroll', 'view', 'bonus', 'View employee bonuses'),
    ('bonus.create', 'payroll', 'create', 'bonus', 'Create employee bonuses'),
    ('bonus.approve', 'payroll', 'approve', 'bonus', 'Approve employee bonuses'),
    ('reimbursement.view', 'payroll', 'view', 'reimbursement', 'View reimbursements'),
    ('reimbursement.create', 'payroll', 'create', 'reimbursement', 'Create reimbursements'),
    ('reimbursement.approve', 'payroll', 'approve', 'reimbursement', 'Approve reimbursements')
) AS v(code, module, action, resource, description)
WHERE NOT EXISTS (
  SELECT 1 FROM hrms.permissions p
  WHERE p.code = v.code AND p.deleted_at IS NULL
);

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'super_admin'
  AND p.code IN (
    'payroll.create', 'payroll.edit', 'payroll.run', 'payroll.download',
    'salary.view', 'salary.edit',
    'bonus.view', 'bonus.create', 'bonus.approve',
    'reimbursement.view', 'reimbursement.create', 'reimbursement.approve',
    'payroll.pay'
  )
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'hr_admin'
  AND p.code IN (
    'payroll.create', 'payroll.edit', 'payroll.run', 'payroll.download',
    'salary.view', 'salary.edit',
    'bonus.view', 'bonus.create', 'bonus.approve',
    'reimbursement.view', 'reimbursement.create', 'reimbursement.approve'
  )
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

ALTER TABLE hrms.payroll_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.employee_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.employee_reimbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.salary_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY payroll_approvals_select_policy ON hrms.payroll_approvals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hrms.payrolls p
      WHERE p.id = payroll_id
        AND p.organization_id IN (SELECT hrms.current_user_organization_ids())
        AND p.deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

CREATE POLICY payroll_approvals_insert_policy ON hrms.payroll_approvals
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hrms.payrolls p
      WHERE p.id = payroll_id
        AND p.organization_id IN (SELECT hrms.current_user_organization_ids())
    )
  );

CREATE POLICY payroll_approvals_update_policy ON hrms.payroll_approvals
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hrms.payrolls p
      WHERE p.id = payroll_id
        AND p.organization_id IN (SELECT hrms.current_user_organization_ids())
    )
  );

CREATE POLICY employee_bonuses_select_policy ON hrms.employee_bonuses
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND deleted_at IS NULL
  );

CREATE POLICY employee_bonuses_insert_policy ON hrms.employee_bonuses
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT hrms.current_user_organization_ids())
  );

CREATE POLICY employee_bonuses_update_policy ON hrms.employee_bonuses
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT hrms.current_user_organization_ids())
  );

CREATE POLICY employee_reimbursements_select_policy ON hrms.employee_reimbursements
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND deleted_at IS NULL
  );

CREATE POLICY employee_reimbursements_insert_policy ON hrms.employee_reimbursements
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT hrms.current_user_organization_ids())
  );

CREATE POLICY employee_reimbursements_update_policy ON hrms.employee_reimbursements
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT hrms.current_user_organization_ids())
  );

CREATE POLICY salary_revisions_select_policy ON hrms.salary_revisions
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND deleted_at IS NULL
  );

CREATE POLICY salary_revisions_insert_policy ON hrms.salary_revisions
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT hrms.current_user_organization_ids())
  );

CREATE POLICY salary_revisions_update_policy ON hrms.salary_revisions
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT hrms.current_user_organization_ids())
  );

SELECT public.attach_updated_at_trigger('hrms.payroll_approvals'::regclass);
SELECT public.attach_updated_at_trigger('hrms.employee_bonuses'::regclass);
SELECT public.attach_updated_at_trigger('hrms.employee_reimbursements'::regclass);
SELECT public.attach_updated_at_trigger('hrms.salary_revisions'::regclass);
