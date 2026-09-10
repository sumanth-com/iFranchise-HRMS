-- Tighten reimbursement RLS so payroll.create / payroll.approve (granted to Accountant)
-- cannot create org claims for others or approve/update claims. Approvaling stays on
-- reimbursement.create / reimbursement.approve (+ HR/CEO portal access).

DROP POLICY IF EXISTS employee_reimbursements_insert_policy ON hrms.employee_reimbursements;
CREATE POLICY employee_reimbursements_insert_policy ON hrms.employee_reimbursements
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND (
      employee_id = hrms.current_user_employee_id()
      OR hrms.user_has_permission('reimbursement.create')
    )
  );

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
      OR hrms.user_has_permission('portal.hr.access')
    )
  )
  WITH CHECK (
    organization_id IN (SELECT hrms.current_user_organization_ids())
  );
