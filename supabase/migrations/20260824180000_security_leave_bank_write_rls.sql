-- =============================================================================
-- Migration: security_leave_bank_write_rls
-- Description: Tighten leave request INSERT and bank account WRITE policies so
--              org membership alone cannot mutate coworkers' leave/bank rows.
-- Idempotent: CREATE OR REPLACE helpers; DROP POLICY IF EXISTS before CREATE.
-- =============================================================================

-- Manager reporting hierarchy (matches app getManagerTeamContext / collectDescendantIds).
CREATE OR REPLACE FUNCTION hrms.user_manages_employee(p_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  WITH RECURSIVE reports AS (
    SELECT e.id
    FROM hrms.employees e
    WHERE e.reporting_manager_id = hrms.current_user_employee_id()
      AND e.deleted_at IS NULL
    UNION ALL
    SELECT child.id
    FROM hrms.employees child
    INNER JOIN reports parent ON child.reporting_manager_id = parent.id
    WHERE child.deleted_at IS NULL
  )
  SELECT EXISTS (
    SELECT 1 FROM reports WHERE id = p_employee_id
  );
$$;

COMMENT ON FUNCTION hrms.user_manages_employee(uuid) IS
  'True when the target employee is in the current user employee reporting hierarchy.';

GRANT EXECUTE ON FUNCTION hrms.user_manages_employee(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION hrms.user_can_create_leave_for(p_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT
    p_employee_id = hrms.current_user_employee_id()
    OR hrms.user_manages_employee(p_employee_id)
    OR (
      (
        hrms.user_has_permission('employee.edit')
        OR hrms.user_has_permission('leave.manage')
        OR hrms.user_has_permission('portal.hr.access')
      )
      AND hrms.employee_belongs_to_user_org(p_employee_id)
    );
$$;

COMMENT ON FUNCTION hrms.user_can_create_leave_for(uuid) IS
  'Self, reporting hierarchy manager, or HR (employee.edit / leave.manage / portal.hr.access) in the same organization.';

GRANT EXECUTE ON FUNCTION hrms.user_can_create_leave_for(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS leave_requests_insert_policy ON hrms.leave_requests;
CREATE POLICY leave_requests_insert_policy ON hrms.leave_requests
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_can_create_leave_for(employee_id));

DROP POLICY IF EXISTS bank_accounts_insert_policy ON hrms.bank_accounts;
CREATE POLICY bank_accounts_insert_policy ON hrms.bank_accounts
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_can_view_employee_financial(employee_id));

DROP POLICY IF EXISTS bank_accounts_update_policy ON hrms.bank_accounts;
CREATE POLICY bank_accounts_update_policy ON hrms.bank_accounts
  FOR UPDATE TO authenticated
  USING (hrms.user_can_view_employee_financial(employee_id))
  WITH CHECK (hrms.user_can_view_employee_financial(employee_id));
