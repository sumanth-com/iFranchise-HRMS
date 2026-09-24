-- Remove sandbox / IT / dummy demo records from CEO Exit, Regularization, and Onboarding queues.
-- Soft-delete only. Does not change real workforce employees, payroll, or permissions.

-- Exit resignations for IT + known sandbox accounts
UPDATE hrms.exit_resignations r
SET deleted_at = COALESCE(r.deleted_at, public.utc_now())
FROM hrms.employees e
WHERE r.employee_id = e.id
  AND r.deleted_at IS NULL
  AND (
    lower(e.email) IN (
      'it@ifranchise.in',
      'ifranchisehr@gmail.com',
      'ifranchiseemployee@gmail.com',
      'codegai.official@gmail.com',
      'shwetha3212@gmail.com',
      'support.suprabase@gmail.com'
    )
    OR e.employee_code IN ('IF2026000', 'EMP-2026021', 'EM-2026027', 'EMP-2026025', 'EMP-2026023', 'EMP-2026030')
  );

-- Attendance corrections for the same sandbox / IT accounts
UPDATE hrms.attendance_corrections c
SET deleted_at = COALESCE(c.deleted_at, public.utc_now())
FROM hrms.employees e
WHERE c.employee_id = e.id
  AND c.deleted_at IS NULL
  AND (
    lower(e.email) IN (
      'it@ifranchise.in',
      'ifranchisehr@gmail.com',
      'ifranchiseemployee@gmail.com',
      'codegai.official@gmail.com',
      'shwetha3212@gmail.com',
      'support.suprabase@gmail.com'
    )
    OR e.employee_code IN ('IF2026000', 'EMP-2026021', 'EM-2026027', 'EMP-2026025', 'EMP-2026023', 'EMP-2026030')
  );

-- Demo onboarding cases (personal gmail sandbox / em-dash names)
UPDATE hrms.onboarding_cases oc
SET
  deleted_at = COALESCE(oc.deleted_at, public.utc_now()),
  archived_at = COALESCE(oc.archived_at, public.utc_now())
WHERE oc.deleted_at IS NULL
  AND (
    oc.personal_email ~* '@gmail\.com$'
    OR oc.personal_email ~* '(codegai|hemavathi|kshitej|vhemavathi)'
    OR oc.full_name LIKE '%—%'
    OR oc.full_name ~* '(Thanvi Reddy|Kshitej Reddy|Hrudaya|sumanth)'
  );
