-- Allow executives (portal.ceo.access) to view and generate payroll in their org.

CREATE OR REPLACE FUNCTION hrms.user_can_view_employee_payroll(p_employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT
    p_employee_id = hrms.current_user_employee_id()
    OR (
      (
        hrms.user_has_permission('payroll.view')
        OR hrms.user_has_permission('portal.ceo.access')
      )
      AND hrms.employee_belongs_to_user_org(p_employee_id)
    );
$$;

COMMENT ON FUNCTION hrms.user_can_view_employee_payroll(uuid) IS
  'Self, payroll.view, or executive portal users within the same organization.';

DROP POLICY IF EXISTS payrolls_select_policy ON hrms.payrolls;
CREATE POLICY payrolls_select_policy ON hrms.payrolls
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND hrms.user_belongs_to_organization(organization_id)
    AND (
      hrms.user_has_permission('payroll.view')
      OR hrms.user_has_permission('portal.ceo.access')
    )
  );
