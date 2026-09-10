-- Narrow prior restore: keep IT Team visible in unlocked payroll runs, but
-- re-hide employees that Company/Team Payroll intentionally excludes
-- (directory-hidden / executive attendance exclusions mirrored in app filters).

UPDATE hrms.payroll_items pi
SET
  deleted_at = public.utc_now(),
  updated_at = public.utc_now()
FROM hrms.payrolls p,
     hrms.employees e
LEFT JOIN hrms.designations des ON des.id = e.designation_id
WHERE pi.payroll_id = p.id
  AND e.id = pi.employee_id
  AND pi.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND COALESCE(p.is_locked, false) = false
  AND (
    upper(replace(e.employee_code, ' ', '')) IN ('IF-MGR-001', 'IF2026016')
    OR lower(trim(coalesce(e.first_name, '') || ' ' || coalesce(e.last_name, ''))) = 'marketing manager'
    OR lower(trim(coalesce(e.first_name, '') || ' ' || coalesce(e.last_name, ''))) LIKE '%abrar%'
    OR (
      lower(trim(coalesce(e.first_name, '') || ' ' || coalesce(e.last_name, ''))) LIKE '%abdul%'
      AND (
        lower(trim(coalesce(e.first_name, '') || ' ' || coalesce(e.last_name, ''))) LIKE '%khader%'
        OR lower(trim(coalesce(e.first_name, '') || ' ' || coalesce(e.last_name, ''))) LIKE '%khadir%'
      )
    )
    OR (
      (
        lower(trim(coalesce(e.first_name, '') || ' ' || coalesce(e.last_name, ''))) LIKE '%gore%'
      )
      AND (
        lower(trim(coalesce(e.first_name, '') || ' ' || coalesce(e.last_name, ''))) LIKE '%abhisek%'
        OR lower(trim(coalesce(e.first_name, '') || ' ' || coalesce(e.last_name, ''))) LIKE '%abhishake%'
        OR lower(trim(coalesce(e.first_name, '') || ' ' || coalesce(e.last_name, ''))) LIKE '%abhishek%'
      )
    )
    OR lower(trim(coalesce(des.title, ''))) = 'marketing manager'
  )
  -- Never hide the IT Super Admin employee again.
  AND lower(e.email::text) <> 'it@ifranchise.in'
  AND upper(replace(e.employee_code, ' ', '')) <> 'IF2026000';
