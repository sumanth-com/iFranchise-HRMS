-- =============================================================================
-- Migration: hrms_payroll_tables
-- Description: Salary structures, payroll runs, items, and payslips
-- =============================================================================

-- -----------------------------------------------------------------------------
-- salary_structures
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.salary_structures (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  effective_from date NOT NULL,
  effective_to date,
  currency_code char(3) NOT NULL DEFAULT 'USD',
  basic_salary numeric(12, 2) NOT NULL DEFAULT 0 CHECK (basic_salary >= 0),
  hra_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (hra_amount >= 0),
  transport_allowance numeric(12, 2) NOT NULL DEFAULT 0 CHECK (transport_allowance >= 0),
  other_allowances numeric(12, 2) NOT NULL DEFAULT 0 CHECK (other_allowances >= 0),
  tax_deduction numeric(12, 2) NOT NULL DEFAULT 0 CHECK (tax_deduction >= 0),
  other_deductions numeric(12, 2) NOT NULL DEFAULT 0 CHECK (other_deductions >= 0),
  gross_salary numeric(12, 2) NOT NULL DEFAULT 0 CHECK (gross_salary >= 0),
  net_salary numeric(12, 2) NOT NULL DEFAULT 0 CHECK (net_salary >= 0),
  components jsonb NOT NULL DEFAULT '{}'::jsonb,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT salary_structures_effective_range CHECK (
    effective_to IS NULL OR effective_to >= effective_from
  ),
  CONSTRAINT salary_structures_gross_consistency CHECK (
    gross_salary = basic_salary + hra_amount + transport_allowance + other_allowances
  ),
  CONSTRAINT salary_structures_net_consistency CHECK (
    net_salary = gross_salary - tax_deduction - other_deductions
  )
);

CREATE INDEX salary_structures_employee_id_idx ON hrms.salary_structures (employee_id);
CREATE INDEX salary_structures_effective_from_idx ON hrms.salary_structures (effective_from);
CREATE INDEX salary_structures_effective_to_idx ON hrms.salary_structures (effective_to);
CREATE INDEX salary_structures_status_idx ON hrms.salary_structures (status);
CREATE INDEX salary_structures_deleted_at_idx ON hrms.salary_structures (deleted_at);
CREATE INDEX salary_structures_employee_effective_idx
  ON hrms.salary_structures (employee_id, effective_from DESC);

-- -----------------------------------------------------------------------------
-- payrolls
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.payrolls (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  branch_id uuid REFERENCES hrms.branches (id) ON DELETE SET NULL,
  payroll_month date NOT NULL,
  payroll_status hrms.payroll_status NOT NULL DEFAULT 'draft',
  processed_at timestamptz,
  processed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  total_gross numeric(14, 2) NOT NULL DEFAULT 0 CHECK (total_gross >= 0),
  total_deductions numeric(14, 2) NOT NULL DEFAULT 0 CHECK (total_deductions >= 0),
  total_net numeric(14, 2) NOT NULL DEFAULT 0 CHECK (total_net >= 0),
  notes text,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT payrolls_month_first_day CHECK (
    payroll_month = date_trunc('month', payroll_month)::date
  ),
  CONSTRAINT payrolls_totals_consistency CHECK (
    total_net = total_gross - total_deductions
  )
);

CREATE INDEX payrolls_organization_id_idx ON hrms.payrolls (organization_id);
CREATE INDEX payrolls_branch_id_idx ON hrms.payrolls (branch_id);
CREATE INDEX payrolls_payroll_month_idx ON hrms.payrolls (payroll_month);
CREATE INDEX payrolls_payroll_status_idx ON hrms.payrolls (payroll_status);
CREATE INDEX payrolls_status_idx ON hrms.payrolls (status);
CREATE INDEX payrolls_deleted_at_idx ON hrms.payrolls (deleted_at);
CREATE UNIQUE INDEX payrolls_org_branch_month_active_idx
  ON hrms.payrolls (organization_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), payroll_month)
  WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- payroll_items
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.payroll_items (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  payroll_id uuid NOT NULL REFERENCES hrms.payrolls (id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  salary_structure_id uuid REFERENCES hrms.salary_structures (id) ON DELETE SET NULL,
  basic_salary numeric(12, 2) NOT NULL DEFAULT 0 CHECK (basic_salary >= 0),
  total_allowances numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total_allowances >= 0),
  total_deductions numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total_deductions >= 0),
  gross_salary numeric(12, 2) NOT NULL DEFAULT 0 CHECK (gross_salary >= 0),
  net_salary numeric(12, 2) NOT NULL DEFAULT 0 CHECK (net_salary >= 0),
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT payroll_items_unique_per_employee UNIQUE (payroll_id, employee_id),
  CONSTRAINT payroll_items_net_consistency CHECK (
    net_salary = gross_salary - total_deductions
  )
);

CREATE INDEX payroll_items_payroll_id_idx ON hrms.payroll_items (payroll_id);
CREATE INDEX payroll_items_employee_id_idx ON hrms.payroll_items (employee_id);
CREATE INDEX payroll_items_salary_structure_id_idx ON hrms.payroll_items (salary_structure_id);
CREATE INDEX payroll_items_status_idx ON hrms.payroll_items (status);
CREATE INDEX payroll_items_deleted_at_idx ON hrms.payroll_items (deleted_at);

-- -----------------------------------------------------------------------------
-- payslips
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.payslips (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  payroll_id uuid NOT NULL REFERENCES hrms.payrolls (id) ON DELETE RESTRICT,
  payroll_item_id uuid NOT NULL UNIQUE REFERENCES hrms.payroll_items (id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  payslip_number text NOT NULL,
  storage_path text,
  issued_at timestamptz NOT NULL DEFAULT public.utc_now(),
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT payslips_number_not_empty CHECK (length(trim(payslip_number)) > 0)
);

COMMENT ON COLUMN hrms.payslips.storage_path IS
  'Optional generated payslip PDF path in employee-documents bucket.';

CREATE INDEX payslips_payroll_id_idx ON hrms.payslips (payroll_id);
CREATE INDEX payslips_payroll_item_id_idx ON hrms.payslips (payroll_item_id);
CREATE INDEX payslips_employee_id_idx ON hrms.payslips (employee_id);
CREATE INDEX payslips_issued_at_idx ON hrms.payslips (issued_at);
CREATE INDEX payslips_status_idx ON hrms.payslips (status);
CREATE INDEX payslips_deleted_at_idx ON hrms.payslips (deleted_at);
CREATE UNIQUE INDEX payslips_number_active_idx
  ON hrms.payslips (payslip_number)
  WHERE deleted_at IS NULL;
