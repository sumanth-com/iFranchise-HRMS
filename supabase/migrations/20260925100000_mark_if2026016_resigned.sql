-- Mark IF2026016 as resigned (left the company).
-- Mirrors exit-completion: employment_status=resigned, status=inactive,
-- account deactivated. Preserves historical payroll/attendance/audit rows.
-- Keyed by employee_code only — no UI name filters.

BEGIN;

UPDATE hrms.employees
SET
  employment_status = 'resigned',
  date_of_leaving = COALESCE(date_of_leaving, CURRENT_DATE),
  status = 'inactive',
  account_status = CASE
    WHEN account_status IN (
      'active'::hrms.employee_account_status,
      'invited'::hrms.employee_account_status,
      'invitation_pending'::hrms.employee_account_status
    ) THEN 'inactive'::hrms.employee_account_status
    ELSE account_status
  END,
  account_deactivated_at = CASE
    WHEN account_status IN (
      'active'::hrms.employee_account_status,
      'invited'::hrms.employee_account_status,
      'invitation_pending'::hrms.employee_account_status
    ) THEN COALESCE(account_deactivated_at, now())
    ELSE account_deactivated_at
  END,
  updated_at = now()
WHERE upper(replace(employee_code, ' ', '')) = 'IF2026016'
  AND deleted_at IS NULL
  AND employment_status IN ('active', 'probation', 'on_leave', 'draft');

COMMIT;
