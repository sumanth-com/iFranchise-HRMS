-- Re-seed May 2026 payslip using employee_code (production employee UUID differs from seed UUID).

DO $$
DECLARE
  v_employee_id uuid;
  v_org_id uuid;
  v_payroll_id uuid := 'd0000000-0000-4000-8000-000000000501';
  v_item_id uuid := 'd0000000-0000-4000-8000-000000000502';
  v_payslip_id uuid := 'd0000000-0000-4000-8000-000000000503';
  v_breakdown jsonb := jsonb_build_object(
    'earnings', jsonb_build_array(
      jsonb_build_object('code', 'basic', 'label', 'Basic', 'amount', 0, 'type', 'earning'),
      jsonb_build_object('code', 'hra', 'label', 'House Rent Allowance', 'amount', 0, 'type', 'earning'),
      jsonb_build_object('code', 'stipend', 'label', 'Stipend', 'amount', 12000, 'type', 'earning')
    ),
    'deductions', jsonb_build_array(
      jsonb_build_object('code', 'income_tax', 'label', 'Income Tax', 'amount', 0, 'type', 'deduction'),
      jsonb_build_object('code', 'pf', 'label', 'Provident Fund', 'amount', 0, 'type', 'deduction')
    ),
    'attendance', jsonb_build_object(
      'workingDays', 31,
      'presentDays', 31,
      'absentDays', 0,
      'lopDays', 0,
      'leaveLopDays', 0,
      'overtimeHours', 0
    )
  );
BEGIN
  SELECT id, organization_id
  INTO v_employee_id, v_org_id
  FROM hrms.employees
  WHERE employee_code = 'IF2026009'
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO hrms.payrolls (
    id,
    organization_id,
    payroll_month,
    payroll_status,
    total_gross,
    total_deductions,
    total_net,
    processed_at,
    approved_at,
    status
  )
  VALUES (
    v_payroll_id,
    v_org_id,
    DATE '2026-05-01',
    'paid',
    12000,
    0,
    12000,
    TIMESTAMPTZ '2026-06-01 10:00:00+00',
    TIMESTAMPTZ '2026-06-01 12:00:00+00',
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    organization_id = EXCLUDED.organization_id,
    payroll_status = EXCLUDED.payroll_status,
    total_gross = EXCLUDED.total_gross,
    total_deductions = EXCLUDED.total_deductions,
    total_net = EXCLUDED.total_net,
    processed_at = EXCLUDED.processed_at,
    approved_at = EXCLUDED.approved_at,
    updated_at = public.utc_now(),
    deleted_at = NULL;

  INSERT INTO hrms.payroll_items (
    id,
    payroll_id,
    employee_id,
    basic_salary,
    total_allowances,
    total_deductions,
    gross_salary,
    net_salary,
    breakdown,
    status
  )
  VALUES (
    v_item_id,
    v_payroll_id,
    v_employee_id,
    0,
    12000,
    0,
    12000,
    12000,
    v_breakdown,
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    employee_id = EXCLUDED.employee_id,
    basic_salary = EXCLUDED.basic_salary,
    total_allowances = EXCLUDED.total_allowances,
    total_deductions = EXCLUDED.total_deductions,
    gross_salary = EXCLUDED.gross_salary,
    net_salary = EXCLUDED.net_salary,
    breakdown = EXCLUDED.breakdown,
    updated_at = public.utc_now(),
    deleted_at = NULL;

  INSERT INTO hrms.payslips (
    id,
    payroll_id,
    payroll_item_id,
    employee_id,
    payslip_number,
    issued_at,
    status
  )
  VALUES (
    v_payslip_id,
    v_payroll_id,
    v_item_id,
    v_employee_id,
    'PS-202605-IF2026009',
    TIMESTAMPTZ '2026-06-02 09:00:00+00',
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    employee_id = EXCLUDED.employee_id,
    payslip_number = EXCLUDED.payslip_number,
    issued_at = EXCLUDED.issued_at,
    updated_at = public.utc_now(),
    deleted_at = NULL;
END $$;
