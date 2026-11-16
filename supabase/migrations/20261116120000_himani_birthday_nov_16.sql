-- Himani Bhargava Tapadiya (IF2026002): birthday is 16 November.
BEGIN;

UPDATE hrms.employee_profiles
SET
  date_of_birth = DATE '1993-11-16',
  updated_at = now()
WHERE employee_id = (
  SELECT id
  FROM hrms.employees
  WHERE upper(replace(employee_code, ' ', '')) = 'IF2026002'
    AND deleted_at IS NULL
  LIMIT 1
)
AND deleted_at IS NULL;

COMMIT;
