-- =============================================================================
-- Migration: enterprise_super_admin
-- Description: System Administration layer, permissions, bootstrap accounts
-- =============================================================================

-- -----------------------------------------------------------------------------
-- System administration permissions
-- -----------------------------------------------------------------------------

INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT v.code, v.module, v.action, v.resource, v.description, 'active'::hrms.record_status
FROM (VALUES
  ('system.admin.access', 'system', 'access', 'admin', 'Access System Administration', 'active'),
  ('system.dashboard.view', 'system', 'view', 'dashboard', 'View system dashboard', 'active'),
  ('system.config.view', 'system', 'view', 'config', 'View system configuration', 'active'),
  ('system.config.edit', 'system', 'edit', 'config', 'Edit system configuration', 'active'),
  ('system.security.view', 'system', 'view', 'security', 'View security center', 'active'),
  ('system.logs.view', 'system', 'view', 'logs', 'View system logs', 'active'),
  ('system.integrations.view', 'system', 'view', 'integrations', 'View integrations', 'active'),
  ('system.maintenance.manage', 'system', 'manage', 'maintenance', 'Manage maintenance mode', 'active')
) AS v(code, module, action, resource, description)
WHERE NOT EXISTS (
  SELECT 1 FROM hrms.permissions p WHERE p.code = v.code AND p.deleted_at IS NULL
);

-- Super Admin receives all system permissions
INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'
FROM hrms.roles r
JOIN hrms.permissions p ON p.code LIKE 'system.%' AND p.deleted_at IS NULL
WHERE r.code = 'super_admin'
  AND r.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  );

-- Super Admin can access every portal
INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'
FROM hrms.roles r
JOIN hrms.permissions p ON p.code LIKE 'portal.%.access' AND p.deleted_at IS NULL
WHERE r.code = 'super_admin'
  AND r.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  );

-- HR Admin can assign and change user roles (if not already granted)
INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'
FROM hrms.roles r
JOIN hrms.permissions p ON p.code IN (
  'user_role.assign',
  'user_role.view',
  'role.view',
  'permission.view',
  'permission.assign'
) AND p.deleted_at IS NULL
WHERE r.code IN ('hr_admin', 'hr_executive')
  AND r.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  );

-- -----------------------------------------------------------------------------
-- System settings (maintenance mode, feature flags, environment)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.system_settings (
  organization_id uuid PRIMARY KEY REFERENCES hrms.organizations (id) ON DELETE CASCADE,
  maintenance_mode boolean NOT NULL DEFAULT false,
  maintenance_message text,
  feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  environment_label text NOT NULL DEFAULT 'production',
  smtp_configured boolean NOT NULL DEFAULT false,
  license_plan text,
  license_expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

ALTER TABLE hrms.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS system_settings_select_policy ON hrms.system_settings;
CREATE POLICY system_settings_select_policy ON hrms.system_settings
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS system_settings_manage_policy ON hrms.system_settings;
CREATE POLICY system_settings_manage_policy ON hrms.system_settings
  FOR ALL TO authenticated
  USING (
    hrms.user_belongs_to_organization(organization_id)
    AND hrms.user_has_permission('system.config.edit')
  )
  WITH CHECK (
    hrms.user_belongs_to_organization(organization_id)
    AND hrms.user_has_permission('system.config.edit')
  );

INSERT INTO hrms.system_settings (organization_id)
SELECT o.id
FROM hrms.organizations o
WHERE o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM hrms.system_settings ss WHERE ss.organization_id = o.id
  );

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hrms.user_is_super_admin(p_user_id uuid DEFAULT public.current_user_id())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM hrms.user_roles ur
    JOIN hrms.roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.status = 'active'
      AND ur.deleted_at IS NULL
      AND r.code = 'super_admin'
      AND r.deleted_at IS NULL
  );
$$;

COMMENT ON FUNCTION hrms.user_is_super_admin(uuid) IS
  'Returns true when the user has an active super_admin role assignment.';

GRANT EXECUTE ON FUNCTION hrms.user_is_super_admin(uuid) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Bootstrap: Super Admin + HR test account
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  v_org_id uuid;
  v_super_admin_role_id uuid := 'a0000000-0000-4000-8000-000000000101'::uuid;
  v_hr_admin_role_id uuid := 'a0000000-0000-4000-8000-000000000102'::uuid;
  v_super_user_id uuid;
  v_hr_user_id uuid;
  v_super_employee_id uuid;
  v_hr_employee_id uuid;
BEGIN
  SELECT id INTO v_org_id FROM hrms.organizations WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1;
  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  -- Promote sumanth.reddy@ifranchise.in to Super Admin
  SELECT id INTO v_super_user_id
  FROM auth.users
  WHERE lower(email) = 'sumanth.reddy@ifranchise.in'
  LIMIT 1;

  IF v_super_user_id IS NOT NULL THEN
    PERFORM hrms.initialize_super_admin(
      'sumanth.reddy@ifranchise.in',
      'Sumanth',
      'Reddy',
      NULL
    );

    SELECT id INTO v_super_employee_id
    FROM hrms.employees
    WHERE organization_id = v_org_id
      AND lower(email::text) = 'sumanth.reddy@ifranchise.in'
      AND deleted_at IS NULL
    LIMIT 1;

    -- Deactivate hr_admin assignment if super_admin is active
    UPDATE hrms.user_roles ur
    SET status = 'inactive', deleted_at = public.utc_now(), updated_at = public.utc_now()
    FROM hrms.roles r
    WHERE ur.role_id = r.id
      AND r.code = 'hr_admin'
      AND ur.user_id = v_super_user_id
      AND ur.organization_id = v_org_id
      AND ur.deleted_at IS NULL
      AND EXISTS (
        SELECT 1
        FROM hrms.user_roles sur
        WHERE sur.user_id = v_super_user_id
          AND sur.role_id = v_super_admin_role_id
          AND sur.status = 'active'
          AND sur.deleted_at IS NULL
      );
  END IF;

  -- Ensure hello.codegai@gmail.com is HR Admin (test HR account)
  SELECT id INTO v_hr_user_id
  FROM auth.users
  WHERE lower(email) = 'hello.codegai@gmail.com'
  LIMIT 1;

  IF v_hr_user_id IS NOT NULL THEN
    SELECT id INTO v_hr_employee_id
    FROM hrms.employees
    WHERE organization_id = v_org_id
      AND lower(email::text) = 'hello.codegai@gmail.com'
      AND deleted_at IS NULL
    LIMIT 1;

    IF v_hr_employee_id IS NOT NULL THEN
      UPDATE hrms.employees
      SET
        user_id = v_hr_user_id,
        account_status = 'active',
        employment_status = CASE
          WHEN employment_status = 'draft' THEN 'active'::hrms.employment_status
          ELSE employment_status
        END,
        status = 'active',
        updated_at = public.utc_now()
      WHERE id = v_hr_employee_id;

      IF EXISTS (
        SELECT 1 FROM hrms.user_roles
        WHERE user_id = v_hr_user_id AND role_id = v_hr_admin_role_id AND organization_id = v_org_id
      ) THEN
        UPDATE hrms.user_roles
        SET employee_id = v_hr_employee_id, status = 'active', deleted_at = NULL, updated_at = public.utc_now()
        WHERE user_id = v_hr_user_id AND role_id = v_hr_admin_role_id AND organization_id = v_org_id;
      ELSE
        INSERT INTO hrms.user_roles (organization_id, user_id, employee_id, role_id, status)
        VALUES (v_org_id, v_hr_user_id, v_hr_employee_id, v_hr_admin_role_id, 'active');
      END IF;

      -- Remove super_admin if incorrectly assigned
      UPDATE hrms.user_roles ur
      SET status = 'inactive', deleted_at = public.utc_now(), updated_at = public.utc_now()
      WHERE ur.user_id = v_hr_user_id
        AND ur.role_id = v_super_admin_role_id
        AND ur.organization_id = v_org_id
        AND ur.deleted_at IS NULL;
    END IF;
  END IF;
END $$;
