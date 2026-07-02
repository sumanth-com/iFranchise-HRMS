-- =============================================================================
-- Migration: hrms_attendance_tables
-- Description: Attendance tracking and correction workflow tables
-- =============================================================================

-- -----------------------------------------------------------------------------
-- attendance
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.attendance (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  branch_id uuid NOT NULL REFERENCES hrms.branches (id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  attendance_date date NOT NULL,
  check_in_at timestamptz,
  check_out_at timestamptz,
  attendance_status hrms.attendance_status NOT NULL DEFAULT 'present',
  work_hours numeric(5, 2) NOT NULL DEFAULT 0 CHECK (work_hours >= 0),
  overtime_hours numeric(5, 2) NOT NULL DEFAULT 0 CHECK (overtime_hours >= 0),
  notes text,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT attendance_checkout_after_checkin CHECK (
    check_out_at IS NULL OR check_in_at IS NULL OR check_out_at >= check_in_at
  ),
  CONSTRAINT attendance_unique_per_employee_date UNIQUE (employee_id, attendance_date)
);

CREATE INDEX attendance_organization_id_idx ON hrms.attendance (organization_id);
CREATE INDEX attendance_branch_id_idx ON hrms.attendance (branch_id);
CREATE INDEX attendance_employee_id_idx ON hrms.attendance (employee_id);
CREATE INDEX attendance_attendance_date_idx ON hrms.attendance (attendance_date);
CREATE INDEX attendance_attendance_status_idx ON hrms.attendance (attendance_status);
CREATE INDEX attendance_status_idx ON hrms.attendance (status);
CREATE INDEX attendance_deleted_at_idx ON hrms.attendance (deleted_at);
CREATE INDEX attendance_org_date_idx ON hrms.attendance (organization_id, attendance_date);
CREATE INDEX attendance_employee_date_idx ON hrms.attendance (employee_id, attendance_date);

-- -----------------------------------------------------------------------------
-- attendance_corrections
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.attendance_corrections (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  attendance_id uuid NOT NULL REFERENCES hrms.attendance (id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  requested_check_in_at timestamptz,
  requested_check_out_at timestamptz,
  reason text NOT NULL,
  correction_status hrms.correction_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT attendance_corrections_reason_not_empty CHECK (length(trim(reason)) > 0),
  CONSTRAINT attendance_corrections_requested_checkout_after_checkin CHECK (
    requested_check_out_at IS NULL
    OR requested_check_in_at IS NULL
    OR requested_check_out_at >= requested_check_in_at
  )
);

CREATE INDEX attendance_corrections_attendance_id_idx ON hrms.attendance_corrections (attendance_id);
CREATE INDEX attendance_corrections_employee_id_idx ON hrms.attendance_corrections (employee_id);
CREATE INDEX attendance_corrections_correction_status_idx ON hrms.attendance_corrections (correction_status);
CREATE INDEX attendance_corrections_reviewed_by_idx ON hrms.attendance_corrections (reviewed_by);
CREATE INDEX attendance_corrections_status_idx ON hrms.attendance_corrections (status);
CREATE INDEX attendance_corrections_deleted_at_idx ON hrms.attendance_corrections (deleted_at);
