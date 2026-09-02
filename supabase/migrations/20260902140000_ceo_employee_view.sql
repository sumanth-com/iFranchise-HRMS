-- Allow CEO / founder / co-founder to use the Employees module (same as HR list/detail).
INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'::hrms.record_status
FROM hrms.roles r
JOIN hrms.permissions p ON p.code = 'employee.view' AND p.deleted_at IS NULL
WHERE r.code IN ('ceo', 'founder', 'co_founder')
  AND r.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  );
