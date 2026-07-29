-- CEO review: directory permission, manager salary/doc restrictions

INSERT INTO hrms.permissions (code, module, action, resource, description, status)
VALUES
  ('employee.directory.view', 'employee', 'view', 'directory', 'View organization employee directory', 'active')
ON CONFLICT (code) WHERE deleted_at IS NULL DO NOTHING;

INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'::hrms.record_status
FROM hrms.roles r
JOIN hrms.permissions p ON p.code = 'employee.directory.view' AND p.deleted_at IS NULL
WHERE r.code IN ('super_admin', 'hr_admin', 'manager')
  AND r.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL
  );

-- Managers must not access payslips / salary via permissions
UPDATE hrms.role_permissions rp
SET deleted_at = public.utc_now(), status = 'inactive'::hrms.record_status
FROM hrms.roles r, hrms.permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.code = 'manager'
  AND p.code IN ('payslip.view', 'payslip.generate', 'payroll.view', 'salary_structure.view', 'bank_account.view')
  AND rp.deleted_at IS NULL;
