-- Correct Abrar employee code only. No other employee fields are changed.

UPDATE hrms.employees
SET
  employee_code = 'IF2024002',
  updated_at = public.utc_now()
WHERE email = 'abrar@ifranchise.in'
  AND deleted_at IS NULL
  AND employee_code IS DISTINCT FROM 'IF2024002'
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.employees other
    WHERE other.employee_code = 'IF2024002'
      AND other.deleted_at IS NULL
      AND other.email IS DISTINCT FROM 'abrar@ifranchise.in'
  );
