-- When an employee is permanently deleted, also soft-delete their onboarding cases.
-- This replaces the previous behavior that only set status='cancelled'.

CREATE OR REPLACE FUNCTION hrms.cleanup_onboarding_on_employee_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE hrms.onboarding_cases
  SET deleted_at = now(), updated_at = now()
  WHERE organization_id = OLD.organization_id
    AND deleted_at IS NULL
    AND (
      employee_id = OLD.id
      OR personal_email = OLD.email
    );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_onboarding_on_employee_delete ON hrms.employees;

CREATE TRIGGER trg_cleanup_onboarding_on_employee_delete
  BEFORE DELETE ON hrms.employees
  FOR EACH ROW
  EXECUTE FUNCTION hrms.cleanup_onboarding_on_employee_delete();
