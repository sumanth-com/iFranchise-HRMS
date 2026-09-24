-- Soft-delete IT / sandbox leave requests and 1:1 meetings from CEO surfaces.
-- Keeps Sneha↔Vivek and other real workforce records.

-- Leave requests for IT + known sandbox accounts
UPDATE hrms.leave_requests lr
SET deleted_at = COALESCE(lr.deleted_at, public.utc_now())
FROM hrms.employees e
WHERE lr.employee_id = e.id
  AND lr.deleted_at IS NULL
  AND (
    lower(e.email) IN (
      'it@ifranchise.in',
      'ifranchisehr@gmail.com',
      'ifranchiseemployee@gmail.com',
      'codegai.official@gmail.com',
      'shwetha3212@gmail.com',
      'support.suprabase@gmail.com'
    )
    OR e.employee_code IN (
      'IF2026000',
      'EMP-2026021',
      'EM-2026027',
      'EMP-2026025',
      'EMP-2026023',
      'EMP-2026030'
    )
  );

-- Matching leave approvals
UPDATE hrms.leave_approvals la
SET deleted_at = COALESCE(la.deleted_at, public.utc_now())
FROM hrms.leave_requests lr
WHERE la.leave_request_id = lr.id
  AND la.deleted_at IS NULL
  AND lr.deleted_at IS NOT NULL
  AND (
    lower((
      SELECT e.email FROM hrms.employees e WHERE e.id = lr.employee_id
    )) IN (
      'it@ifranchise.in',
      'ifranchisehr@gmail.com',
      'ifranchiseemployee@gmail.com',
      'codegai.official@gmail.com',
      'shwetha3212@gmail.com',
      'support.suprabase@gmail.com'
    )
    OR (
      SELECT e.employee_code FROM hrms.employees e WHERE e.id = lr.employee_id
    ) IN (
      'IF2026000',
      'EMP-2026021',
      'EM-2026027',
      'EMP-2026025',
      'EMP-2026023',
      'EMP-2026030'
    )
  );

-- 1:1 meetings where employee or manager is IT / sandbox
UPDATE hrms.performance_one_on_ones ooo
SET deleted_at = COALESCE(ooo.deleted_at, public.utc_now())
WHERE ooo.deleted_at IS NULL
  AND (
    ooo.employee_id IN (
      SELECT id FROM hrms.employees
      WHERE lower(email) IN (
        'it@ifranchise.in',
        'ifranchisehr@gmail.com',
        'ifranchiseemployee@gmail.com',
        'codegai.official@gmail.com',
        'shwetha3212@gmail.com',
        'support.suprabase@gmail.com'
      )
      OR employee_code IN (
        'IF2026000',
        'EMP-2026021',
        'EM-2026027',
        'EMP-2026025',
        'EMP-2026023',
        'EMP-2026030'
      )
    )
    OR ooo.manager_employee_id IN (
      SELECT id FROM hrms.employees
      WHERE lower(email) IN (
        'it@ifranchise.in',
        'ifranchisehr@gmail.com',
        'ifranchiseemployee@gmail.com',
        'codegai.official@gmail.com',
        'shwetha3212@gmail.com',
        'support.suprabase@gmail.com'
      )
      OR employee_code IN (
        'IF2026000',
        'EMP-2026021',
        'EM-2026027',
        'EMP-2026025',
        'EMP-2026023',
        'EMP-2026030'
      )
    )
  );
