-- Payroll policy document permission and default seed

INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT 'payroll_policy.manage', 'payroll', 'manage', 'payroll_policy', 'Manage employee payroll policy document', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM hrms.permissions WHERE code = 'payroll_policy.manage' AND deleted_at IS NULL
);

INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'::hrms.record_status
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND r.code IN ('super_admin', 'hr_admin')
  AND p.code = 'payroll_policy.manage'
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  );

DO $$
DECLARE
  v_org_id uuid := 'a0000000-0000-4000-8000-000000000001';
  v_doc jsonb := jsonb_build_object(
    'intro', 'This document explains how salary is processed, how income tax is deducted, and how you can access payslips and annual tax documentation. Please review the details carefully.',
    'updatedAt', public.utc_now(),
    'contact', jsonb_build_object(
      'phone', '+91-912 913 0303',
      'email', 'contact@ifranchise.in',
      'address', 'No 51, Devarabisanahalli, Bangalore, Karnataka - 560103'
    ),
    'sections', jsonb_build_array(
      jsonb_build_object(
        'id', 'salary-cycle',
        'title', 'Salary Cycle & Payment',
        'content', E'Salaries are processed monthly for the prior calendar month. Payment is typically credited to your registered bank account by the last working day of the month, subject to payroll approval and bank processing timelines.\n\nEnsure your bank account details in HR records are accurate. Any change in bank account must be updated through HR before the payroll cut-off date for that month.'
      ),
      jsonb_build_object(
        'id', 'payslips',
        'title', 'Payslips',
        'content', E'Monthly payslips are published in the HR portal after payroll is approved. Each payslip shows earnings, deductions, and net pay for the month.\n\nYou can download your latest payslip from the Payroll page. Payslip PDFs are password-protected using your employee ID for security.'
      ),
      jsonb_build_object(
        'id', 'tds',
        'title', 'Income Tax (TDS)',
        'content', E'Tax Deducted at Source (TDS) is calculated based on your annual income projection, applicable tax slabs, and any tax-saving declarations submitted to HR.\n\nIf you have not submitted investment or exemption proofs, tax may be deducted at a higher rate. Submit declarations and proofs before the company deadline each financial year.'
      ),
      jsonb_build_object(
        'id', 'tax-documents',
        'title', 'Form 16 & Tax Documents',
        'content', E'Form 16 and other annual tax documents are issued after the financial year ends and tax reconciliation is complete. These documents summarize salary paid and tax deducted for the year.\n\nTax documents are shared through the HR portal or directly by the HR/Finance team. Contact HR if you need a duplicate or corrected tax certificate.'
      ),
      jsonb_build_object(
        'id', 'pf',
        'title', 'Provident Fund (PF)',
        'content', E'If applicable, employee and employer PF contributions are deducted as per statutory rules and reflected in your payslip. UAN and PF account details should be maintained with HR.\n\nFor PF balance or passbook queries, contact HR with your UAN number.'
      ),
      jsonb_build_object(
        'id', 'queries',
        'title', 'Payroll Queries',
        'content', E'For salary discrepancies, missing payslips, tax deduction questions, or reimbursement and bonus queries, reach out to the HR department using the contact details below.\n\nPlease include your employee ID, month in question, and a brief description of the issue so we can resolve it quickly.'
      )
    )
  );
BEGIN
  UPDATE hrms.organization_settings
  SET
    settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object('payroll_policy_document', v_doc),
    updated_at = public.utc_now()
  WHERE organization_id = v_org_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    INSERT INTO hrms.organization_settings (organization_id, settings, status)
    VALUES (v_org_id, jsonb_build_object('payroll_policy_document', v_doc), 'active');
  END IF;
END $$;
