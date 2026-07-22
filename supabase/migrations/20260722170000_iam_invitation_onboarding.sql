-- =============================================================================
-- Migration: iam_invitation_onboarding
-- Description: Enterprise IAM invitation workflow — portal routes in DB,
--              invitation records, role inheritance in RLS, account lifecycle.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Account lifecycle extensions
-- -----------------------------------------------------------------------------

ALTER TYPE hrms.employee_account_status ADD VALUE IF NOT EXISTS 'invitation_accepted';
ALTER TYPE hrms.employee_account_status ADD VALUE IF NOT EXISTS 'archived';

ALTER TABLE hrms.roles
  ADD COLUMN IF NOT EXISTS portal_route text,
  ADD COLUMN IF NOT EXISTS is_inviteable boolean NOT NULL DEFAULT false;

ALTER TABLE hrms.employees
  ADD COLUMN IF NOT EXISTS invited_role_id uuid REFERENCES hrms.roles(id);

COMMENT ON COLUMN hrms.roles.portal_route IS
  'Canonical post-login route for this role (e.g. /dashboard, /ceo, /manager, /employee).';
COMMENT ON COLUMN hrms.roles.is_inviteable IS
  'When true, HR may assign this role during employee invitation onboarding.';
COMMENT ON COLUMN hrms.employees.invited_role_id IS
  'Role selected at invitation time; drives portal and permissions until changed.';

CREATE INDEX IF NOT EXISTS employees_invited_role_id_idx
  ON hrms.employees (invited_role_id)
  WHERE deleted_at IS NULL;

-- Portal routes and inviteable flags (database-driven IAM mapping).
UPDATE hrms.roles
SET
  portal_key = CASE code
    WHEN 'founder' THEN 'ceo'
    WHEN 'co_founder' THEN 'ceo'
    WHEN 'ceo' THEN 'ceo'
    WHEN 'hr_admin' THEN 'hr'
    WHEN 'hr_executive' THEN 'hr'
    WHEN 'manager' THEN 'manager'
    WHEN 'employee' THEN 'employee'
    WHEN 'super_admin' THEN 'hr'
    ELSE portal_key
  END,
  portal_route = CASE code
    WHEN 'founder' THEN '/ceo'
    WHEN 'co_founder' THEN '/ceo'
    WHEN 'ceo' THEN '/ceo'
    WHEN 'hr_admin' THEN '/dashboard'
    WHEN 'hr_executive' THEN '/dashboard'
    WHEN 'super_admin' THEN '/dashboard'
    WHEN 'manager' THEN '/manager'
    WHEN 'employee' THEN '/employee'
    ELSE portal_route
  END,
  is_inviteable = CASE
    WHEN code IN ('super_admin') THEN false
    ELSE true
  END,
  updated_at = public.utc_now()
WHERE organization_id = 'a0000000-0000-4000-8000-000000000001'
  AND deleted_at IS NULL;

-- Portal permissions for executive and HR executive roles.
INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'
FROM hrms.roles r
JOIN hrms.permissions p
  ON (
    (r.code IN ('founder', 'co_founder') AND p.code = 'portal.ceo.access')
    OR (r.code = 'hr_executive' AND p.code = 'portal.hr.access')
  )
WHERE r.organization_id = 'a0000000-0000-4000-8000-000000000001'
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  );

-- -----------------------------------------------------------------------------
-- Employee invitations (enterprise audit trail)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.employee_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations(id),
  employee_id uuid NOT NULL REFERENCES hrms.employees(id),
  role_id uuid NOT NULL REFERENCES hrms.roles(id),
  email extensions.citext NOT NULL,
  full_name text NOT NULL,
  department_id uuid REFERENCES hrms.departments(id),
  designation_id uuid REFERENCES hrms.designations(id),
  employment_type_id uuid REFERENCES hrms.employment_types(id),
  branch_id uuid REFERENCES hrms.branches(id),
  reporting_manager_id uuid REFERENCES hrms.employees(id),
  invitation_token uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
  portal_route text,
  created_by uuid,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS employee_invitations_employee_idx
  ON hrms.employee_invitations (employee_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS employee_invitations_token_idx
  ON hrms.employee_invitations (invitation_token)
  WHERE deleted_at IS NULL AND status = 'pending';

CREATE INDEX IF NOT EXISTS employee_invitations_org_status_idx
  ON hrms.employee_invitations (organization_id, status)
  WHERE deleted_at IS NULL;

ALTER TABLE hrms.employee_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_invitations_select_org
  ON hrms.employee_invitations
  FOR SELECT
  TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id));

CREATE POLICY employee_invitations_manage_org
  ON hrms.employee_invitations
  FOR ALL
  TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

-- -----------------------------------------------------------------------------
-- Permission resolution with role inheritance (RLS + middleware parity)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hrms.user_role_ids_with_ancestors(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  WITH RECURSIVE role_chain AS (
    SELECT r.id, r.parent_role_id
    FROM hrms.user_roles ur
    INNER JOIN hrms.roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.deleted_at IS NULL
      AND ur.status = 'active'::hrms.record_status
      AND r.deleted_at IS NULL
      AND r.status = 'active'::hrms.record_status
    UNION
    SELECT r.id, r.parent_role_id
    FROM hrms.roles r
    INNER JOIN role_chain rc ON r.id = rc.parent_role_id
    WHERE r.deleted_at IS NULL
      AND r.status = 'active'::hrms.record_status
  )
  SELECT DISTINCT id FROM role_chain;
$$;

CREATE OR REPLACE FUNCTION hrms.user_has_permission(p_permission_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM hrms.user_role_ids_with_ancestors(auth.uid()) AS resolved_role_id
    INNER JOIN hrms.role_permissions rp ON rp.role_id = resolved_role_id
    INNER JOIN hrms.permissions p ON p.id = rp.permission_id
    WHERE rp.deleted_at IS NULL
      AND rp.status = 'active'::hrms.record_status
      AND p.deleted_at IS NULL
      AND p.status = 'active'::hrms.record_status
      AND p.code = p_permission_code
  );
$$;

CREATE OR REPLACE FUNCTION hrms.get_user_permission_codes(p_user_id uuid)
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT DISTINCT p.code
  FROM hrms.user_role_ids_with_ancestors(p_user_id) AS resolved_role_id
  INNER JOIN hrms.role_permissions rp ON rp.role_id = resolved_role_id
  INNER JOIN hrms.permissions p ON p.id = rp.permission_id
  WHERE rp.deleted_at IS NULL
      AND rp.status = 'active'::hrms.record_status
      AND p.deleted_at IS NULL
      AND p.status = 'active'::hrms.record_status;
$$;

CREATE OR REPLACE FUNCTION hrms.get_user_portal_route(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT COALESCE(
    (
      SELECT r.portal_route
      FROM hrms.user_roles ur
      INNER JOIN hrms.roles r ON r.id = ur.role_id
      WHERE ur.user_id = p_user_id
        AND ur.deleted_at IS NULL
        AND ur.status = 'active'::hrms.record_status
        AND r.deleted_at IS NULL
        AND r.status = 'active'::hrms.record_status
        AND r.portal_route IS NOT NULL
      ORDER BY CASE r.portal_key
        WHEN 'hr' THEN 1
        WHEN 'ceo' THEN 2
        WHEN 'manager' THEN 3
        WHEN 'employee' THEN 4
        ELSE 5
      END
      LIMIT 1
    ),
    '/employee'
  );
$$;

CREATE OR REPLACE FUNCTION hrms.user_account_allows_portal_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM hrms.employees e
    WHERE e.user_id = p_user_id
      AND e.deleted_at IS NULL
      AND e.status = 'active'::hrms.record_status
      AND e.account_status::text IN (
        'active',
        'invited',
        'invitation_pending',
        'invitation_accepted'
      )
  );
$$;

GRANT EXECUTE ON FUNCTION hrms.user_role_ids_with_ancestors(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION hrms.get_user_permission_codes(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION hrms.get_user_portal_route(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION hrms.user_account_allows_portal_access(uuid) TO authenticated, service_role;
