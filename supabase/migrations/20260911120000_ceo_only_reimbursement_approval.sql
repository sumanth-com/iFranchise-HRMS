-- CEO-only reimbursement approval: revoke HR approve grants and tighten RLS
-- so portal.hr.access cannot update claim status. Employees may still update
-- their own pending claims; CEO decides via portal.ceo.access / reimbursement.approve.

-- 1) Remove reimbursement.approve from HR roles (keep view/create for review/self-service).
DELETE FROM hrms.role_permissions rp
USING hrms.roles r, hrms.permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.code IN ('hr_admin', 'hr_executive')
  AND p.code = 'reimbursement.approve';

-- 2) Tighten UPDATE policy: no HR portal bypass for claim decisions.
DROP POLICY IF EXISTS employee_reimbursements_update_policy ON hrms.employee_reimbursements;
CREATE POLICY employee_reimbursements_update_policy ON hrms.employee_reimbursements
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND (
      (
        employee_id = hrms.current_user_employee_id()
        AND reimbursement_status = 'pending'::hrms.reimbursement_status
      )
      OR hrms.user_has_permission('reimbursement.approve')
      OR hrms.user_has_permission('portal.ceo.access')
    )
  )
  WITH CHECK (
    organization_id IN (SELECT hrms.current_user_organization_ids())
  );
