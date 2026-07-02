-- =============================================================================
-- Migration: hrms_security_tables
-- Description: Roles, permissions, and user role assignments
-- =============================================================================

-- -----------------------------------------------------------------------------
-- permissions (global catalog)
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.permissions (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  code text NOT NULL,
  module text NOT NULL,
  action text NOT NULL,
  resource text NOT NULL,
  description text,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT permissions_code_not_empty CHECK (length(trim(code)) > 0),
  CONSTRAINT permissions_module_not_empty CHECK (length(trim(module)) > 0),
  CONSTRAINT permissions_action_not_empty CHECK (length(trim(action)) > 0),
  CONSTRAINT permissions_resource_not_empty CHECK (length(trim(resource)) > 0)
);

CREATE UNIQUE INDEX permissions_code_active_idx
  ON hrms.permissions (code)
  WHERE deleted_at IS NULL;
CREATE INDEX permissions_module_idx ON hrms.permissions (module);
CREATE INDEX permissions_status_idx ON hrms.permissions (status);
CREATE INDEX permissions_deleted_at_idx ON hrms.permissions (deleted_at);

-- -----------------------------------------------------------------------------
-- roles (organization-scoped)
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.roles (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  is_system_role boolean NOT NULL DEFAULT false,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT roles_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT roles_code_not_empty CHECK (length(trim(code)) > 0)
);

CREATE INDEX roles_organization_id_idx ON hrms.roles (organization_id);
CREATE INDEX roles_status_idx ON hrms.roles (status);
CREATE INDEX roles_deleted_at_idx ON hrms.roles (deleted_at);
CREATE UNIQUE INDEX roles_org_code_active_idx
  ON hrms.roles (organization_id, code)
  WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- role_permissions
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.role_permissions (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  role_id uuid NOT NULL REFERENCES hrms.roles (id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES hrms.permissions (id) ON DELETE RESTRICT,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE INDEX role_permissions_role_id_idx ON hrms.role_permissions (role_id);
CREATE INDEX role_permissions_permission_id_idx ON hrms.role_permissions (permission_id);
CREATE INDEX role_permissions_status_idx ON hrms.role_permissions (status);
CREATE INDEX role_permissions_deleted_at_idx ON hrms.role_permissions (deleted_at);
CREATE UNIQUE INDEX role_permissions_role_permission_active_idx
  ON hrms.role_permissions (role_id, permission_id)
  WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- user_roles
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.user_roles (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES hrms.roles (id) ON DELETE RESTRICT,
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  employee_id uuid,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE INDEX user_roles_user_id_idx ON hrms.user_roles (user_id);
CREATE INDEX user_roles_role_id_idx ON hrms.user_roles (role_id);
CREATE INDEX user_roles_organization_id_idx ON hrms.user_roles (organization_id);
CREATE INDEX user_roles_employee_id_idx ON hrms.user_roles (employee_id);
CREATE INDEX user_roles_status_idx ON hrms.user_roles (status);
CREATE INDEX user_roles_deleted_at_idx ON hrms.user_roles (deleted_at);
CREATE UNIQUE INDEX user_roles_user_role_org_active_idx
  ON hrms.user_roles (user_id, role_id, organization_id)
  WHERE deleted_at IS NULL;
