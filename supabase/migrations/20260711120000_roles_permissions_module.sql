-- =============================================================================
-- Migration: roles_permissions_module
-- Description: Roles & Permissions admin module extensions
-- =============================================================================

-- -----------------------------------------------------------------------------
-- roles — inheritance & default role
-- -----------------------------------------------------------------------------

ALTER TABLE hrms.roles
  ADD COLUMN IF NOT EXISTS parent_role_id uuid REFERENCES hrms.roles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS roles_parent_role_id_idx ON hrms.roles (parent_role_id);

ALTER TABLE hrms.roles
  ADD CONSTRAINT roles_not_self_parent CHECK (
    parent_role_id IS NULL OR parent_role_id <> id
  );

-- -----------------------------------------------------------------------------
-- Audit trigger for role_permissions
-- -----------------------------------------------------------------------------

SELECT public.attach_audit_trigger('hrms.role_permissions'::regclass);

-- -----------------------------------------------------------------------------
-- Permissions
-- -----------------------------------------------------------------------------

INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT v.code, v.module, v.action, v.resource, v.description, v.status::hrms.record_status
FROM (VALUES
  ('role.create', 'security', 'create', 'role', 'Create roles', 'active'),
  ('role.edit', 'security', 'edit', 'role', 'Edit roles', 'active'),
  ('role.delete', 'security', 'delete', 'role', 'Delete roles', 'active'),
  ('permission.assign', 'security', 'assign', 'permission', 'Assign permissions to roles', 'active')
) AS v(code, module, action, resource, description, status)
WHERE NOT EXISTS (
  SELECT 1 FROM hrms.permissions p WHERE p.code = v.code AND p.deleted_at IS NULL
);

-- Super Admin gets new permissions
INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT 'a0000000-0000-4000-8000-000000000101'::uuid, p.id, 'active'::hrms.record_status
FROM hrms.permissions p
WHERE p.deleted_at IS NULL
  AND p.code IN ('role.create', 'role.edit', 'role.delete', 'permission.assign')
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp
    WHERE rp.role_id = 'a0000000-0000-4000-8000-000000000101'::uuid
      AND rp.permission_id = p.id AND rp.deleted_at IS NULL
  );

-- HR Admin: view-only for roles (remove assign/manage)
UPDATE hrms.role_permissions rp
SET status = 'inactive', updated_at = public.utc_now()
FROM hrms.permissions p
WHERE rp.permission_id = p.id
  AND rp.role_id = 'a0000000-0000-4000-8000-000000000102'::uuid
  AND rp.deleted_at IS NULL
  AND p.code IN ('role.manage', 'user_role.assign', 'permission.assign', 'role.create', 'role.edit', 'role.delete');

-- Ensure HR Admin retains view permissions
INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT 'a0000000-0000-4000-8000-000000000102'::uuid, p.id, 'active'::hrms.record_status
FROM hrms.permissions p
WHERE p.deleted_at IS NULL
  AND p.code IN ('role.view', 'permission.view', 'user_role.view')
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp
    WHERE rp.role_id = 'a0000000-0000-4000-8000-000000000102'::uuid
      AND rp.permission_id = p.id AND rp.deleted_at IS NULL AND rp.status = 'active'
  );

-- -----------------------------------------------------------------------------
-- Permission inheritance: HR Admin inherits Employee permissions
-- -----------------------------------------------------------------------------

UPDATE hrms.roles
SET parent_role_id = 'a0000000-0000-4000-8000-000000000104'::uuid,
    updated_at = public.utc_now()
WHERE id = 'a0000000-0000-4000-8000-000000000102'::uuid
  AND parent_role_id IS NULL;

UPDATE hrms.roles
SET parent_role_id = 'a0000000-0000-4000-8000-000000000104'::uuid,
    updated_at = public.utc_now()
WHERE id = 'a0000000-0000-4000-8000-000000000103'::uuid
  AND parent_role_id IS NULL;

-- Default role flag
UPDATE hrms.roles
SET is_default = true, updated_at = public.utc_now()
WHERE code = 'employee'
  AND organization_id = 'a0000000-0000-4000-8000-000000000001';

-- CEO role (system role, inherits Manager)
INSERT INTO hrms.roles (id, organization_id, name, code, description, is_system_role, parent_role_id, is_default, status)
VALUES (
  'a0000000-0000-4000-8000-000000000105',
  'a0000000-0000-4000-8000-000000000001',
  'CEO',
  'ceo',
  'Chief Executive Officer',
  true,
  'a0000000-0000-4000-8000-000000000103'::uuid,
  false,
  'active'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, code = EXCLUDED.code, description = EXCLUDED.description,
    parent_role_id = EXCLUDED.parent_role_id, updated_at = public.utc_now();

-- CEO gets manager permissions + reports + organization view
INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT 'a0000000-0000-4000-8000-000000000105'::uuid, rp.permission_id, 'active'::hrms.record_status
FROM hrms.role_permissions rp
WHERE rp.role_id = 'a0000000-0000-4000-8000-000000000103'::uuid
  AND rp.deleted_at IS NULL AND rp.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions existing
    WHERE existing.role_id = 'a0000000-0000-4000-8000-000000000105'::uuid
      AND existing.permission_id = rp.permission_id AND existing.deleted_at IS NULL
  );

INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT 'a0000000-0000-4000-8000-000000000105'::uuid, p.id, 'active'::hrms.record_status
FROM hrms.permissions p
WHERE p.deleted_at IS NULL
  AND p.code IN ('organization.view', 'reports.view', 'reports.export', 'employee.view', 'payroll.view')
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp
    WHERE rp.role_id = 'a0000000-0000-4000-8000-000000000105'::uuid
      AND rp.permission_id = p.id AND rp.deleted_at IS NULL
  );
