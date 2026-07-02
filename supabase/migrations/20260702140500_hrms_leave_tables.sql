-- =============================================================================
-- Migration: hrms_leave_tables
-- Description: Leave types, balances, requests, and approvals
-- =============================================================================

-- -----------------------------------------------------------------------------
-- leave_types
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.leave_types (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  days_per_year numeric(5, 2) NOT NULL DEFAULT 0 CHECK (days_per_year >= 0),
  is_paid boolean NOT NULL DEFAULT true,
  is_carry_forward boolean NOT NULL DEFAULT false,
  max_carry_forward_days numeric(5, 2) NOT NULL DEFAULT 0 CHECK (max_carry_forward_days >= 0),
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT leave_types_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT leave_types_code_not_empty CHECK (length(trim(code)) > 0)
);

CREATE INDEX leave_types_organization_id_idx ON hrms.leave_types (organization_id);
CREATE INDEX leave_types_status_idx ON hrms.leave_types (status);
CREATE INDEX leave_types_deleted_at_idx ON hrms.leave_types (deleted_at);
CREATE UNIQUE INDEX leave_types_org_code_active_idx
  ON hrms.leave_types (organization_id, code)
  WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- leave_balances
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.leave_balances (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  leave_type_id uuid NOT NULL REFERENCES hrms.leave_types (id) ON DELETE RESTRICT,
  balance_year smallint NOT NULL CHECK (balance_year >= 2000),
  allocated_days numeric(5, 2) NOT NULL DEFAULT 0 CHECK (allocated_days >= 0),
  used_days numeric(5, 2) NOT NULL DEFAULT 0 CHECK (used_days >= 0),
  pending_days numeric(5, 2) NOT NULL DEFAULT 0 CHECK (pending_days >= 0),
  balance_days numeric(5, 2) NOT NULL DEFAULT 0,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT leave_balances_unique_per_year UNIQUE (employee_id, leave_type_id, balance_year),
  CONSTRAINT leave_balances_days_consistency CHECK (
    balance_days = allocated_days - used_days - pending_days
  )
);

CREATE INDEX leave_balances_employee_id_idx ON hrms.leave_balances (employee_id);
CREATE INDEX leave_balances_leave_type_id_idx ON hrms.leave_balances (leave_type_id);
CREATE INDEX leave_balances_balance_year_idx ON hrms.leave_balances (balance_year);
CREATE INDEX leave_balances_status_idx ON hrms.leave_balances (status);
CREATE INDEX leave_balances_deleted_at_idx ON hrms.leave_balances (deleted_at);

-- -----------------------------------------------------------------------------
-- leave_requests
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.leave_requests (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  leave_type_id uuid NOT NULL REFERENCES hrms.leave_types (id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_days numeric(5, 2) NOT NULL CHECK (total_days > 0),
  reason text,
  leave_status hrms.leave_status NOT NULL DEFAULT 'pending',
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT leave_requests_end_after_start CHECK (end_date >= start_date)
);

CREATE INDEX leave_requests_employee_id_idx ON hrms.leave_requests (employee_id);
CREATE INDEX leave_requests_leave_type_id_idx ON hrms.leave_requests (leave_type_id);
CREATE INDEX leave_requests_start_date_idx ON hrms.leave_requests (start_date);
CREATE INDEX leave_requests_end_date_idx ON hrms.leave_requests (end_date);
CREATE INDEX leave_requests_leave_status_idx ON hrms.leave_requests (leave_status);
CREATE INDEX leave_requests_status_idx ON hrms.leave_requests (status);
CREATE INDEX leave_requests_deleted_at_idx ON hrms.leave_requests (deleted_at);
CREATE INDEX leave_requests_employee_dates_idx ON hrms.leave_requests (employee_id, start_date, end_date);

-- -----------------------------------------------------------------------------
-- leave_approvals
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.leave_approvals (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  leave_request_id uuid NOT NULL REFERENCES hrms.leave_requests (id) ON DELETE CASCADE,
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
  CONSTRAINT leave_approvals_unique_level UNIQUE (leave_request_id, approval_level)
);

CREATE INDEX leave_approvals_leave_request_id_idx ON hrms.leave_approvals (leave_request_id);
CREATE INDEX leave_approvals_approver_employee_id_idx ON hrms.leave_approvals (approver_employee_id);
CREATE INDEX leave_approvals_approval_status_idx ON hrms.leave_approvals (approval_status);
CREATE INDEX leave_approvals_status_idx ON hrms.leave_approvals (status);
CREATE INDEX leave_approvals_deleted_at_idx ON hrms.leave_approvals (deleted_at);
