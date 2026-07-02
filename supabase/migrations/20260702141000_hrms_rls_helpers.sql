-- =============================================================================
-- Migration: hrms_rls_helpers
-- Description: Helper functions for organization-scoped RLS policies
-- =============================================================================

CREATE OR REPLACE FUNCTION hrms.current_user_organization_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT DISTINCT ur.organization_id
  FROM hrms.user_roles ur
  WHERE ur.user_id = auth.uid()
    AND ur.deleted_at IS NULL
    AND ur.status = 'active'::hrms.record_status;
$$;

COMMENT ON FUNCTION hrms.current_user_organization_ids() IS
  'Returns organization IDs the current authenticated user belongs to.';

CREATE OR REPLACE FUNCTION hrms.current_user_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT e.id
  FROM hrms.employees e
  WHERE e.user_id = auth.uid()
    AND e.deleted_at IS NULL
  LIMIT 1;
$$;

COMMENT ON FUNCTION hrms.current_user_employee_id() IS
  'Returns the employee ID linked to the current authenticated user.';

CREATE OR REPLACE FUNCTION hrms.user_belongs_to_organization(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT
    p_organization_id IS NOT NULL
    AND p_organization_id IN (SELECT hrms.current_user_organization_ids());
$$;

COMMENT ON FUNCTION hrms.user_belongs_to_organization(uuid) IS
  'Returns true when the current user belongs to the given organization.';

CREATE OR REPLACE FUNCTION hrms.employee_belongs_to_user_org(p_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM hrms.employees e
    WHERE e.id = p_employee_id
      AND e.deleted_at IS NULL
      AND e.organization_id IN (SELECT hrms.current_user_organization_ids())
  );
$$;

COMMENT ON FUNCTION hrms.employee_belongs_to_user_org(uuid) IS
  'Returns true when the employee belongs to one of the current user organizations.';

CREATE OR REPLACE FUNCTION hrms.payroll_belongs_to_user_org(p_payroll_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM hrms.payrolls p
    WHERE p.id = p_payroll_id
      AND p.deleted_at IS NULL
      AND p.organization_id IN (SELECT hrms.current_user_organization_ids())
  );
$$;

COMMENT ON FUNCTION hrms.payroll_belongs_to_user_org(uuid) IS
  'Returns true when the payroll run belongs to one of the current user organizations.';

CREATE OR REPLACE FUNCTION hrms.leave_request_belongs_to_user_org(p_leave_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM hrms.leave_requests lr
    INNER JOIN hrms.employees e ON e.id = lr.employee_id
    WHERE lr.id = p_leave_request_id
      AND lr.deleted_at IS NULL
      AND e.deleted_at IS NULL
      AND e.organization_id IN (SELECT hrms.current_user_organization_ids())
  );
$$;

COMMENT ON FUNCTION hrms.leave_request_belongs_to_user_org(uuid) IS
  'Returns true when the leave request belongs to one of the current user organizations.';

GRANT EXECUTE ON FUNCTION hrms.current_user_organization_ids() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION hrms.current_user_employee_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION hrms.user_belongs_to_organization(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION hrms.employee_belongs_to_user_org(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION hrms.payroll_belongs_to_user_org(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION hrms.leave_request_belongs_to_user_org(uuid) TO authenticated, service_role;
