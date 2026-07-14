-- =============================================================================
-- Migration: manager_team_invite_permission
-- Description: Allow managers to invite teammates to the employee portal
-- =============================================================================

INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT v.code, v.module, v.action, v.resource, v.description, v.status::hrms.record_status
FROM (VALUES
  (
    'manager.team.invite',
    'manager',
    'invite',
    'team',
    'Invite teammates to join the employee portal under manager reporting line',
    'active'
  )
) AS v(code, module, action, resource, description, status)
WHERE NOT EXISTS (
  SELECT 1 FROM hrms.permissions p WHERE p.code = v.code AND p.deleted_at IS NULL
);

INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'::hrms.record_status
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'manager'
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND p.code = 'manager.team.invite'
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  );
