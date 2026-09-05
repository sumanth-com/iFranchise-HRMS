-- Correct full-time payroll items that were seeded with a stipend-only earnings breakdown.
-- Preserves month-specific bonus/incentive/reimbursement lines on each payroll item.

DO $$
DECLARE
  rec record;
  v_gross numeric;
  v_basic numeric;
  v_hra numeric;
  v_lta numeric;
  v_special numeric;
  v_extras jsonb;
  v_earnings jsonb;
BEGIN
  FOR rec IN
    SELECT
      pi.id,
      pi.gross_salary,
      pi.breakdown,
      e.employee_code,
      lower(COALESCE(et.name, '')) AS employment_type_name
    FROM hrms.payroll_items pi
    JOIN hrms.payrolls p ON p.id = pi.payroll_id
    JOIN hrms.employees e ON e.id = pi.employee_id
    LEFT JOIN hrms.employment_types et ON et.id = e.employment_type_id
    WHERE pi.deleted_at IS NULL
      AND p.deleted_at IS NULL
      AND e.deleted_at IS NULL
      AND COALESCE(pi.gross_salary, 0) > 0
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(pi.breakdown -> 'earnings', '[]'::jsonb)) elem
        WHERE elem ->> 'code' = 'stipend'
          AND COALESCE((elem ->> 'amount')::numeric, 0) > 0
      )
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(pi.breakdown -> 'earnings', '[]'::jsonb)) elem
        WHERE elem ->> 'code' = 'basic'
          AND COALESCE((elem ->> 'amount')::numeric, 0) > 0
      )
      AND lower(COALESCE(et.name, '')) NOT LIKE '%intern%'
      AND lower(COALESCE(et.name, '')) NOT LIKE '%probation%'
      AND lower(COALESCE(et.name, '')) NOT LIKE '%trainee%'
  LOOP
    v_gross := round(rec.gross_salary::numeric, 2);
    v_basic := round(v_gross * 0.50, 2);
    v_hra := round(v_gross * 0.25, 2);
    v_lta := round(v_gross * 0.10, 2);
    v_special := round(v_gross - v_basic - v_hra - v_lta, 2);

    SELECT COALESCE(jsonb_agg(elem ORDER BY elem ->> 'code'), '[]'::jsonb)
    INTO v_extras
    FROM jsonb_array_elements(COALESCE(rec.breakdown -> 'earnings', '[]'::jsonb)) elem
    WHERE elem ->> 'code' LIKE 'bonus%'
       OR elem ->> 'code' LIKE 'hr_%'
       OR elem ->> 'code' LIKE 'reimb_%'
       OR elem ->> 'code' IN ('overtime', 'claims');

    v_earnings :=
      jsonb_build_array(
        jsonb_build_object(
          'code', 'basic',
          'label', 'Basic Salary',
          'amount', v_basic,
          'type', 'earning'
        ),
        jsonb_build_object(
          'code', 'hra',
          'label', 'House Rent Allowance (HRA)',
          'amount', v_hra,
          'type', 'earning'
        ),
        jsonb_build_object(
          'code', 'transport',
          'label', 'Leave Travel Allowance (LTA)',
          'amount', v_lta,
          'type', 'earning'
        ),
        jsonb_build_object(
          'code', 'special_allowance',
          'label', 'Special Allowance',
          'amount', v_special,
          'type', 'earning'
        )
      ) || COALESCE(v_extras, '[]'::jsonb);

    UPDATE hrms.payroll_items
    SET
      breakdown = jsonb_set(COALESCE(rec.breakdown, '{}'::jsonb), '{earnings}', v_earnings),
      basic_salary = v_basic,
      updated_at = public.utc_now()
    WHERE id = rec.id;
  END LOOP;
END $$;
