-- Restore manager self-service payslip access (own payslips only; not HR payroll admin).

UPDATE hrms.role_permissions rp
SET deleted_at = NULL,
    status = 'active'::hrms.record_status,
    updated_at = public.utc_now()
FROM hrms.roles r,
     hrms.permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.code = 'manager'
  AND p.code = 'payslip.view'
  AND rp.deleted_at IS NOT NULL;

INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'::hrms.record_status
FROM hrms.roles r
JOIN hrms.permissions p ON p.code = 'payslip.view' AND p.deleted_at IS NULL
WHERE r.code = 'manager'
  AND r.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  );
