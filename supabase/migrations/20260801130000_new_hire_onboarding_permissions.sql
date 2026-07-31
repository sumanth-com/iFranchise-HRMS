-- =============================================================================
-- Migration: new_hire_onboarding_permissions
-- Description: Permissions for new-hire onboarding module (HR only — not provisioning)
-- =============================================================================

INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT v.code, 'onboarding', v.action, 'onboarding', v.description, 'active'::hrms.record_status
FROM (
  VALUES
    ('onboarding.view', 'view', 'View new-hire onboarding cases'),
    ('onboarding.manage', 'manage', 'Create and manage onboarding invitations'),
    ('onboarding.review', 'review', 'Review and approve candidate onboarding'),
    ('onboarding.activate', 'activate', 'Activate employee accounts after onboarding approval')
) AS v(code, action, description)
WHERE NOT EXISTS (
  SELECT 1 FROM hrms.permissions p WHERE p.code = v.code AND p.deleted_at IS NULL
);

INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'::hrms.record_status
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code IN ('super_admin', 'hr_admin', 'hr_executive')
  AND p.code IN (
    'onboarding.view',
    'onboarding.manage',
    'onboarding.review',
    'onboarding.activate'
  )
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL
  );
