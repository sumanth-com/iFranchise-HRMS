-- Align Probation employment_type for employees who were misclassified as Full Time.
-- Filter pills use employment_types.code (PROBATION / INTERN / FULL_TIME) as source of truth.
-- Only employment_type_id is updated; no profile, salary, attendance, leave, or payroll changes.

UPDATE hrms.employees e
SET
  employment_type_id = t.id,
  updated_at = public.utc_now()
FROM hrms.employment_types t
WHERE t.organization_id = e.organization_id
  AND t.code = 'PROBATION'
  AND t.deleted_at IS NULL
  AND t.status = 'active'
  AND e.deleted_at IS NULL
  AND e.employee_code IN ('IF2026020', 'IF2026021', 'IF2026018')
  AND (
    e.employment_type_id IS DISTINCT FROM t.id
  );
