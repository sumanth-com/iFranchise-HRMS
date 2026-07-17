-- =============================================================================
-- Migration: ceo_user_provisioning
-- Description: Executive roles (Founder, Co-Founder, HR Executive), user
--              provisioning permissions, and direct role_permission grants so
--              the CEO "User Provisioning" module can invite high-privilege
--              users and have them routed to the correct portal.
--
-- NOTE: The application middleware resolves portal access from DIRECTLY
--       assigned role_permissions (it does NOT walk parent_role_id
--       inheritance). New roles therefore receive their permissions copied
--       directly from their reference role, in addition to parent linkage.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Executive roles
--    Founder / Co-Founder inherit from CEO (Executive portal).
--    HR Executive inherits from HR Admin (HR portal).
-- -----------------------------------------------------------------------------
INSERT INTO hrms.roles (id, organization_id, name, code, description, is_system_role, parent_role_id, is_default, status)
VALUES
  ('a0000000-0000-4000-8000-000000000106', 'a0000000-0000-4000-8000-000000000001', 'Founder', 'founder', 'Company founder', true, 'a0000000-0000-4000-8000-000000000105'::uuid, false, 'active'),
  ('a0000000-0000-4000-8000-000000000107', 'a0000000-0000-4000-8000-000000000001', 'Co-Founder', 'co_founder', 'Company co-founder', true, 'a0000000-0000-4000-8000-000000000105'::uuid, false, 'active'),
  ('a0000000-0000-4000-8000-000000000108', 'a0000000-0000-4000-8000-000000000001', 'HR Executive', 'hr_executive', 'Human resources executive', true, 'a0000000-0000-4000-8000-000000000102'::uuid, false, 'active')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    code = EXCLUDED.code,
    description = EXCLUDED.description,
    parent_role_id = EXCLUDED.parent_role_id,
    is_system_role = EXCLUDED.is_system_role,
    status = 'active',
    updated_at = public.utc_now(),
    deleted_at = NULL;

-- -----------------------------------------------------------------------------
-- 2. Provisioning permissions
-- -----------------------------------------------------------------------------
INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT v.code, v.module, v.action, v.resource, v.description, v.status::hrms.record_status
FROM (VALUES
  ('user_provisioning.view', 'security', 'view', 'user_provisioning', 'View executive user provisioning', 'active'),
  ('user_provisioning.manage', 'security', 'manage', 'user_provisioning', 'Invite and manage executive users', 'active')
) AS v(code, module, action, resource, description, status)
WHERE NOT EXISTS (
  SELECT 1 FROM hrms.permissions p WHERE p.code = v.code AND p.deleted_at IS NULL
);

-- -----------------------------------------------------------------------------
-- 3. Grant provisioning permissions to Super Admin + CEO.
--    (Done BEFORE the CEO -> Founder/Co-Founder copy below so they inherit it.)
-- -----------------------------------------------------------------------------
INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'::hrms.record_status
FROM hrms.roles r
JOIN hrms.permissions p
  ON p.code IN ('user_provisioning.view', 'user_provisioning.manage')
WHERE r.code IN ('super_admin', 'ceo')
  AND r.organization_id = 'a0000000-0000-4000-8000-000000000001'
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.deleted_at IS NULL
  );

-- -----------------------------------------------------------------------------
-- 4. Founder + Co-Founder: copy every active CEO permission directly.
-- -----------------------------------------------------------------------------
INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT target.id, rp.permission_id, 'active'::hrms.record_status
FROM hrms.roles target
JOIN hrms.role_permissions rp
  ON rp.role_id = 'a0000000-0000-4000-8000-000000000105'::uuid
  AND rp.deleted_at IS NULL
  AND rp.status = 'active'
WHERE target.code IN ('founder', 'co_founder')
  AND target.organization_id = 'a0000000-0000-4000-8000-000000000001'
  AND target.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions existing
    WHERE existing.role_id = target.id
      AND existing.permission_id = rp.permission_id
      AND existing.deleted_at IS NULL
  );

-- -----------------------------------------------------------------------------
-- 5. HR Executive: copy every active HR Admin permission directly.
-- -----------------------------------------------------------------------------
INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT target.id, rp.permission_id, 'active'::hrms.record_status
FROM hrms.roles target
JOIN hrms.role_permissions rp
  ON rp.role_id = 'a0000000-0000-4000-8000-000000000102'::uuid
  AND rp.deleted_at IS NULL
  AND rp.status = 'active'
WHERE target.code = 'hr_executive'
  AND target.organization_id = 'a0000000-0000-4000-8000-000000000001'
  AND target.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions existing
    WHERE existing.role_id = target.id
      AND existing.permission_id = rp.permission_id
      AND existing.deleted_at IS NULL
  );
