-- Allow HR Admin to apply and withdraw their own leave (self-service Leave module).
INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT 'a0000000-0000-4000-8000-000000000102'::uuid, p.id, 'active'::hrms.record_status
FROM hrms.permissions p
WHERE p.deleted_at IS NULL
  AND p.code = ANY (ARRAY['leave.create', 'leave.withdraw'])
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = 'a0000000-0000-4000-8000-000000000102'::uuid
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  );
