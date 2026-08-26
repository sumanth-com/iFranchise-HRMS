-- =============================================================================
-- Migration: security_leave_requests_update_rls
-- Description: Tighten leave_requests UPDATE so org membership alone cannot
--              mutate coworkers' leave rows (defense-in-depth vs PostgREST).
-- Preserves: self, reporting hierarchy, HR, CEO portal, leave approve/reject/
--            edit/cancel permissions used by existing leave mutations.
-- Idempotent: CREATE OR REPLACE + DROP POLICY IF EXISTS.
-- =============================================================================

CREATE OR REPLACE FUNCTION hrms.user_can_update_leave_for(p_employee_id uuid)
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
        OR hrms.user_has_permission('leave.edit')
        OR hrms.user_has_permission('leave.cancel')
        OR hrms.user_has_permission('leave.approve')
        OR hrms.user_has_permission('leave.reject')
        OR hrms.user_has_permission('portal.hr.access')
        OR hrms.user_has_permission('portal.ceo.access')
      )
      AND hrms.employee_belongs_to_user_org(p_employee_id)
    );
$$;

COMMENT ON FUNCTION hrms.user_can_update_leave_for(uuid) IS
  'Self, reporting hierarchy, or leave/HR/CEO permission holders within the same organization.';

GRANT EXECUTE ON FUNCTION hrms.user_can_update_leave_for(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS leave_requests_update_policy ON hrms.leave_requests;
CREATE POLICY leave_requests_update_policy ON hrms.leave_requests
  FOR UPDATE TO authenticated
  USING (hrms.user_can_update_leave_for(employee_id))
  WITH CHECK (hrms.user_can_update_leave_for(employee_id));
