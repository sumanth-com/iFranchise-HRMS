-- =============================================================================
-- Migration: hr_user_provisioning_permissions
-- Description: Grant user provisioning permissions to HR Admin so the feature
--              is available under HR Administration (same module as CEO).
-- =============================================================================

INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'::hrms.record_status
FROM hrms.roles r
JOIN hrms.permissions p
  ON p.code IN ('user_provisioning.view', 'user_provisioning.manage')
  AND p.deleted_at IS NULL
WHERE r.code IN ('super_admin', 'hr_admin')
  AND r.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  );
