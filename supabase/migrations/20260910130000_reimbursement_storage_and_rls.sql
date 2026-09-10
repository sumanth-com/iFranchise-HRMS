-- Align employee-documents MIME allowlist with reimbursement receipt uploads
-- (common phone/camera formats) while keeping the bucket private.
-- Also tighten employee_reimbursements write policies so employees can only
-- insert/update their own rows unless they hold reimbursement create/approve.

UPDATE storage.buckets
SET
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/jpg',
    'image/pjpeg',
    'image/png',
    'image/x-png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'image/avif',
    'application/json',
    'text/csv',
    'text/plain'
  ]
WHERE id = 'employee-documents';

-- Employees: insert only for self. Reviewers/creators with reimbursement.create may create for others.
DROP POLICY IF EXISTS employee_reimbursements_insert_policy ON hrms.employee_reimbursements;
CREATE POLICY employee_reimbursements_insert_policy ON hrms.employee_reimbursements
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND (
      employee_id = hrms.current_user_employee_id()
      OR hrms.user_has_permission('reimbursement.create')
      OR hrms.user_has_permission('payroll.create')
    )
  );

-- Employees may update only their own pending claims (cancel/edit).
-- Approvers may update any org claim (status decisions). Soft-delete/status via service role remains preferred in app.
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
      OR hrms.user_has_permission('payroll.approve')
      OR hrms.user_has_permission('portal.ceo.access')
      OR hrms.user_has_permission('portal.hr.access')
    )
  )
  WITH CHECK (
    organization_id IN (SELECT hrms.current_user_organization_ids())
  );
