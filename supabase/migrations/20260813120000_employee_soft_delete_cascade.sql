-- When an employee is soft-deleted (HR/manager/portal), cascade soft-delete related
-- payroll and portal records so they cannot reappear in Team Payroll or elsewhere.

CREATE OR REPLACE FUNCTION hrms.cascade_soft_delete_employee_related(
  p_employee_id uuid,
  p_deleted_by uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, hrms
AS $$
DECLARE
  v_now timestamptz := public.utc_now();
BEGIN
  IF p_employee_id IS NULL THEN
    RETURN;
  END IF;

  -- Payroll
  UPDATE hrms.salary_structures
  SET deleted_at = v_now, updated_at = v_now, updated_by = p_deleted_by
  WHERE employee_id = p_employee_id AND deleted_at IS NULL;

  UPDATE hrms.employee_bonuses
  SET deleted_at = v_now, updated_at = v_now, updated_by = p_deleted_by
  WHERE employee_id = p_employee_id AND deleted_at IS NULL;

  UPDATE hrms.employee_reimbursements
  SET deleted_at = v_now, updated_at = v_now, updated_by = p_deleted_by
  WHERE employee_id = p_employee_id AND deleted_at IS NULL;

  UPDATE hrms.salary_revisions
  SET deleted_at = v_now, updated_at = v_now, updated_by = p_deleted_by
  WHERE employee_id = p_employee_id AND deleted_at IS NULL;

  UPDATE hrms.payslips
  SET deleted_at = v_now, updated_at = v_now, updated_by = p_deleted_by
  WHERE employee_id = p_employee_id AND deleted_at IS NULL;

  UPDATE hrms.payroll_items
  SET deleted_at = v_now, updated_at = v_now, updated_by = p_deleted_by
  WHERE employee_id = p_employee_id AND deleted_at IS NULL;

  -- Portal access
  UPDATE hrms.user_roles
  SET deleted_at = v_now, updated_at = v_now, updated_by = p_deleted_by
  WHERE employee_id = p_employee_id AND deleted_at IS NULL;

  -- Profile / master data
  UPDATE hrms.employee_profiles
  SET deleted_at = v_now, updated_at = v_now, updated_by = p_deleted_by
  WHERE employee_id = p_employee_id AND deleted_at IS NULL;

  UPDATE hrms.employee_addresses
  SET deleted_at = v_now, updated_at = v_now, updated_by = p_deleted_by
  WHERE employee_id = p_employee_id AND deleted_at IS NULL;

  UPDATE hrms.emergency_contacts
  SET deleted_at = v_now, updated_at = v_now, updated_by = p_deleted_by
  WHERE employee_id = p_employee_id AND deleted_at IS NULL;

  UPDATE hrms.bank_accounts
  SET deleted_at = v_now, updated_at = v_now, updated_by = p_deleted_by
  WHERE employee_id = p_employee_id AND deleted_at IS NULL;

  UPDATE hrms.employee_documents
  SET deleted_at = v_now, updated_at = v_now, updated_by = p_deleted_by
  WHERE employee_id = p_employee_id AND deleted_at IS NULL;

  -- Attendance / leave (own records only — do not hide other employees' approvals)
  UPDATE hrms.attendance_corrections
  SET deleted_at = v_now, updated_at = v_now, updated_by = p_deleted_by
  WHERE employee_id = p_employee_id AND deleted_at IS NULL;

  UPDATE hrms.attendance
  SET deleted_at = v_now, updated_at = v_now, updated_by = p_deleted_by
  WHERE employee_id = p_employee_id AND deleted_at IS NULL;

  UPDATE hrms.leave_approvals
  SET deleted_at = v_now, updated_at = v_now, updated_by = p_deleted_by
  WHERE leave_request_id IN (
      SELECT id FROM hrms.leave_requests
      WHERE employee_id = p_employee_id AND deleted_at IS NULL
    )
    AND deleted_at IS NULL;

  UPDATE hrms.leave_requests
  SET deleted_at = v_now, updated_at = v_now, updated_by = p_deleted_by
  WHERE employee_id = p_employee_id AND deleted_at IS NULL;

  UPDATE hrms.leave_balances
  SET deleted_at = v_now, updated_at = v_now, updated_by = p_deleted_by
  WHERE employee_id = p_employee_id AND deleted_at IS NULL;
END;
$$;

COMMENT ON FUNCTION hrms.cascade_soft_delete_employee_related(uuid, uuid) IS
  'Soft-deletes payroll, portal roles, and related employee records when an employee is removed.';

REVOKE ALL ON FUNCTION hrms.cascade_soft_delete_employee_related(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms.cascade_soft_delete_employee_related(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION hrms.cascade_soft_delete_employee_related(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION hrms.trg_employees_soft_delete_cascade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, hrms
AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    PERFORM hrms.cascade_soft_delete_employee_related(NEW.id, COALESCE(NEW.updated_by, auth.uid()));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS employees_soft_delete_cascade_trg ON hrms.employees;
CREATE TRIGGER employees_soft_delete_cascade_trg
  AFTER UPDATE OF deleted_at ON hrms.employees
  FOR EACH ROW
  EXECUTE FUNCTION hrms.trg_employees_soft_delete_cascade();

-- Backfill: hide orphan related rows for employees already soft-deleted
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id, updated_by
    FROM hrms.employees
    WHERE deleted_at IS NOT NULL
  LOOP
    PERFORM hrms.cascade_soft_delete_employee_related(r.id, r.updated_by);
  END LOOP;
END;
$$;
