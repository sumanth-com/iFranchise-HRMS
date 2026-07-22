-- Leave policy document permission and default seed for HR editing

INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT 'leave_policy.manage', 'leave', 'manage', 'leave_policy', 'Manage employee leave policy document', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM hrms.permissions WHERE code = 'leave_policy.manage' AND deleted_at IS NULL
);

INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'::hrms.record_status
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND r.code IN ('super_admin', 'hr_admin')
  AND p.code = 'leave_policy.manage'
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  );

-- HR Admin can manage holidays again for policy holiday lists
UPDATE hrms.role_permissions rp
SET status = 'active', updated_at = public.utc_now()
FROM hrms.permissions p
WHERE rp.permission_id = p.id
  AND rp.role_id = 'a0000000-0000-4000-8000-000000000102'::uuid
  AND p.code = 'holiday.manage'
  AND rp.deleted_at IS NULL;

DO $$
DECLARE
  v_org_id uuid := 'a0000000-0000-4000-8000-000000000001';
  v_doc jsonb := jsonb_build_object(
    'intro', 'This communication outlines the policies and criteria applicable during your probation period, which covers the first three (3) months of employment. Please review the details carefully to ensure full understanding and compliance.',
    'updatedAt', public.utc_now(),
    'contact', jsonb_build_object(
      'phone', '+91-912 913 0303',
      'email', 'contact@ifranchise.in',
      'address', 'No 51, Devarabisanahalli, Bangalore, Karnataka - 560103'
    ),
    'sections', jsonb_build_array(
      jsonb_build_object(
        'id', 'probation-entitlement',
        'title', 'Probation Period Leave Entitlement',
        'content', E'First Month of Probation: No leave is permitted during the first month of the probation period.\n\nSecond and Third Month of Probation: A total of two (2) Casual Leaves (CL) may be availed during the remaining two months of the probation period.\n\nAdditional Leave for Female Employees: Female employees are entitled to one (1) additional Period Leave (PL) during the probation period.'
      ),
      jsonb_build_object(
        'id', 'communication-guidelines',
        'title', 'Leave Communication and Approval Guidelines',
        'content', E'Casual Leave (CL) and Other Leaves\n- Leave requests must be formally communicated via email at least 24 hours in advance.\n- The email must clearly mention the reason for the leave and the date(s) for which leave is requested.\n- All leave requests are subject to approval by the reporting manager and the HR department.\n\nPeriod Leave (PL)\n- Female employees availing Period Leave must inform the HR department via email on the same day, at any time before the end of the working day.\n- Prior-day intimation is not mandatory for Period Leave; however, same-day communication is compulsory.\n\nPre-Planned or Prior Commitments\n- Any previously planned or anticipated leave must be communicated to HR and the reporting manager well in advance, preferably at the time of joining or as soon as the information becomes available.\n\nFailure to follow the above communication process may be treated as unauthorized leave.'
      ),
      jsonb_build_object(
        'id', 'carry-forward',
        'title', 'Leave Carry Forward Policy',
        'content', E'- No leave balance will be carried forward until the successful completion of the probation period.\n- Period Leave (PL) is strictly non-carry-forwardable under all circumstances.'
      ),
      jsonb_build_object(
        'id', 'post-probation-carry-forward',
        'title', 'Post-Probation Leave Carry Forward',
        'content', E'- After confirmation of probation, one (1) Casual Leave (CL) and one (1) Earned Leave (EL) may be carried forward within the current (running) calendar year.\n- Earned Leave (EL) balance will be carried forward to the next calendar year as per company policy.\n- Employees are entitled to choose two (2) Optional Holidays in a calendar year from the company''s approved holiday list.'
      ),
      jsonb_build_object(
        'id', 'sales-confirmation',
        'title', 'Probation Confirmation Criteria – Sales Team',
        'content', E'- Employees in the Sales team are required to successfully close at least one (1) deal during their probation period to be eligible for probation confirmation.\n- If a deal is not closed earlier, the employee must ensure that one deal is closed within the three-month probation period.\n- Upon successful closure of one deal at any point during the probation period (including earlier than three months), probation may be confirmed, subject to management approval.\n- Failure to meet this criterion may result in probation extension or other action as deemed appropriate by management.\n\nAdherence to both the leave policy and role-specific performance expectations is mandatory during the probation period. Non-compliance may impact probation confirmation.\n\nFor any clarification, please feel free to contact the HR department. We appreciate your cooperation and wish you a successful probation period.'
      )
    )
  );
BEGIN
  UPDATE hrms.organization_settings
  SET
    settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object('leave_policy_document', v_doc),
    updated_at = public.utc_now()
  WHERE organization_id = v_org_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    INSERT INTO hrms.organization_settings (organization_id, settings, status)
    VALUES (v_org_id, jsonb_build_object('leave_policy_document', v_doc), 'active');
  END IF;
END $$;
