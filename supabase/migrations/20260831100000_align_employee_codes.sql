-- Align employee IDs to the official iFranchise code list.
-- IT Team keeps a unique system code so IF2026009 can be restored to Gangaram Sumanth Reddy.

UPDATE hrms.employees
SET employee_code = 'IF2026000',
    updated_at = public.utc_now()
WHERE employee_code = 'IF2026009'
  AND first_name = 'IT'
  AND last_name = 'Team'
  AND deleted_at IS NULL;

UPDATE hrms.employees
SET employee_code = 'IF2026009',
    updated_at = public.utc_now()
WHERE employee_code IN ('IF-PENDING-SA')
  AND first_name = 'Gangaram Sumanth'
  AND last_name = 'Reddy'
  AND deleted_at IS NULL;

UPDATE hrms.employees
SET employee_code = 'IF2026019',
    updated_at = public.utc_now()
WHERE employee_code = 'EMP-2026029'
  AND last_name = 'Hemavathi'
  AND deleted_at IS NULL;
