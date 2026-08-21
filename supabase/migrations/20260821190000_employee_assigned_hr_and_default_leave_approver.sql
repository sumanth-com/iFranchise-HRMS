-- =============================================================================
-- Migration: employee_assigned_hr_and_default_leave_approver
-- Description: Employee-level assigned HR + org default HR for leave approval
-- =============================================================================

ALTER TABLE hrms.employees
  ADD COLUMN IF NOT EXISTS assigned_hr_employee_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employees_assigned_hr_employee_id_fkey'
  ) THEN
    ALTER TABLE hrms.employees
      ADD CONSTRAINT employees_assigned_hr_employee_id_fkey
      FOREIGN KEY (assigned_hr_employee_id)
      REFERENCES hrms.employees (id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employees_not_self_assigned_hr'
  ) THEN
    ALTER TABLE hrms.employees
      ADD CONSTRAINT employees_not_self_assigned_hr
      CHECK (
        assigned_hr_employee_id IS NULL
        OR assigned_hr_employee_id <> id
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS employees_assigned_hr_employee_id_idx
  ON hrms.employees (assigned_hr_employee_id);

COMMENT ON COLUMN hrms.employees.assigned_hr_employee_id IS
  'Primary HR leave approver for this employee. Must be an eligible HR (hr_admin / hr_executive). Organization leave_rules.default_hr_approver_employee_id is the fallback.';

-- Clear assigned HR references when an employee is permanently deleted
CREATE OR REPLACE FUNCTION hrms.clear_assigned_hr_on_employee_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hrms, public
AS $$
BEGIN
  UPDATE hrms.employees
  SET assigned_hr_employee_id = NULL,
      updated_at = public.utc_now()
  WHERE assigned_hr_employee_id = OLD.id
    AND deleted_at IS NULL;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS employees_clear_assigned_hr_before_delete ON hrms.employees;
CREATE TRIGGER employees_clear_assigned_hr_before_delete
  BEFORE DELETE ON hrms.employees
  FOR EACH ROW
  EXECUTE FUNCTION hrms.clear_assigned_hr_on_employee_delete();

-- Clear dangling assigned_hr pointers to deleted employees
UPDATE hrms.employees e
SET assigned_hr_employee_id = NULL,
    updated_at = public.utc_now()
WHERE e.assigned_hr_employee_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.employees hr
    WHERE hr.id = e.assigned_hr_employee_id
      AND hr.deleted_at IS NULL
  );
