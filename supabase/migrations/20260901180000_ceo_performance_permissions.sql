-- Let the CEO role manage Performance the same way HR does.

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code IN ('ceo', 'founder', 'co_founder')
  AND p.code IN (
    'performance.view',
    'performance.create',
    'performance.edit',
    'performance.review',
    'performance.approve',
    'performance.feedback',
    'performance.settings',
    'kpi.view',
    'kpi.manage',
    'kpi.progress'
  )
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
  );
