-- September 2026 Team Payroll: match approved Sept-2026 Excel Final Payouts.
-- Excel is source of truth for this month only. Does not change calculator formulas.
--
-- Also: rename IF2026016 Abhisek Gore → Anmol Prasad (Excel roster name) and
-- keep Hemavathi reimbursement at ₹0 (strip claim earning line; HR override = 0).

BEGIN;

-- 1) Rename Abhisek Gore → Anmol Prasad (Excel roster)
UPDATE hrms.employees
SET
  first_name = 'Anmol',
  last_name = 'Prasad',
  updated_at = now()
WHERE upper(replace(employee_code, ' ', '')) = 'IF2026016'
  AND deleted_at IS NULL;

-- 2) Soft-delete IT system account line from Sept 2026 run (never workforce payroll)
UPDATE hrms.payroll_items pi
SET
  deleted_at = now(),
  updated_at = now()
FROM hrms.payrolls p,
     hrms.employees e
WHERE pi.payroll_id = p.id
  AND pi.employee_id = e.id
  AND p.payroll_month = DATE '2026-09-01'
  AND p.deleted_at IS NULL
  AND pi.deleted_at IS NULL
  AND upper(replace(e.employee_code, ' ', '')) = 'IF2026000';

-- 3) Stamp excel.finalPayout / excel.reimbursement on each Sept 2026 eligible item
WITH sept AS (
  SELECT p.id AS payroll_id
  FROM hrms.payrolls p
  WHERE p.payroll_month = DATE '2026-09-01'
    AND p.deleted_at IS NULL
  LIMIT 1
),
targets (employee_code, final_payout, reimbursement) AS (
  VALUES
    ('IF2025002', 20633::numeric, 0::numeric),  -- Om
    ('IF2026002', 20633::numeric, 0::numeric),  -- Himani
    ('IF2026012', 5833::numeric, 0::numeric),   -- Akshita
    ('IF2026001', 20633::numeric, 0::numeric),  -- Ekta
    ('IF2026011', 39800::numeric, 0::numeric),  -- Diksha
    ('IF2026010', 41467::numeric, 0::numeric),  -- Swetha
    ('IF2026009', 10000::numeric, 0::numeric),  -- Sumanth
    ('IF2026014', 8333::numeric, 0::numeric),   -- Sneha Mahajan
    ('IF2026015', 8333::numeric, 0::numeric),   -- Prajjwal Negi
    ('IF2026017', 8333::numeric, 0::numeric),   -- Syed Samit Ali
    ('IF2026018', 44939::numeric, 0::numeric),  -- Vivek Rawat
    ('IF2026019', 8333::numeric, 0::numeric),   -- Venupusa Hemavathi
    ('IF2026021', 41467::numeric, 0::numeric),  -- Shakshay Gupta
    ('IF2026020', 41467::numeric, 0::numeric),  -- Shiwali Singh
    ('IF2026016', 11800::numeric, 0::numeric)   -- Anmol Prasad
)
UPDATE hrms.payroll_items pi
SET
  breakdown = jsonb_set(
    jsonb_set(
      COALESCE(pi.breakdown, '{}'::jsonb),
      '{excel}',
      COALESCE(pi.breakdown->'excel', '{}'::jsonb)
        || jsonb_build_object(
          'finalPayout', t.final_payout,
          'reimbursement', t.reimbursement
        ),
      true
    ),
    '{payrollLifecycle}',
    COALESCE(pi.breakdown->'payrollLifecycle', '{}'::jsonb)
      || jsonb_build_object('itemStatus', 'reviewed'),
    true
  ),
  updated_at = now()
FROM sept,
     hrms.employees e,
     targets t
WHERE pi.payroll_id = sept.payroll_id
  AND pi.employee_id = e.id
  AND upper(replace(e.employee_code, ' ', '')) = t.employee_code
  AND pi.deleted_at IS NULL;

-- 4) Hemavathi: force reimbursement = 0 (strip claim lines, HR override, allowances)
UPDATE hrms.payroll_items pi
SET
  total_allowances = GREATEST(
    0::numeric,
    round(
      (COALESCE(pi.total_allowances, 0)
        - COALESCE(
            (
              SELECT SUM((line->>'amount')::numeric)
              FROM jsonb_array_elements(COALESCE(pi.breakdown->'earnings', '[]'::jsonb)) AS line
              WHERE lower(line->>'code') IN ('reimbursement', 'hr_reimbursement')
                 OR lower(line->>'code') LIKE 'reimb_%'
                 OR lower(COALESCE(line->>'label', '')) LIKE '%reimbursement%'
            ),
            0
          )
      )::numeric,
      2
    )
  ),
  breakdown = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(pi.breakdown, '{}'::jsonb),
        '{excel}',
        COALESCE(pi.breakdown->'excel', '{}'::jsonb)
          || jsonb_build_object('reimbursement', 0, 'finalPayout', 8333),
        true
      ),
      '{hrAdjustments}',
      COALESCE(pi.breakdown->'hrAdjustments', '{}'::jsonb)
        || jsonb_build_object(
          'bonus', COALESCE((pi.breakdown->'hrAdjustments'->>'bonus')::numeric, 0),
          'incentive', COALESCE((pi.breakdown->'hrAdjustments'->>'incentive')::numeric, 0),
          'reimbursements', 0,
          'itemStatus', 'reviewed'
        ),
      true
    ),
    '{earnings}',
    COALESCE(
      (
        SELECT jsonb_agg(line)
        FROM jsonb_array_elements(COALESCE(pi.breakdown->'earnings', '[]'::jsonb)) AS line
        WHERE NOT (
          lower(line->>'code') IN ('reimbursement', 'hr_reimbursement')
          OR lower(line->>'code') LIKE 'reimb_%'
          OR lower(COALESCE(line->>'label', '')) LIKE '%reimbursement%'
        )
      ),
      '[]'::jsonb
    ),
    true
  ),
  updated_at = now()
FROM hrms.payrolls p,
     hrms.employees e
WHERE pi.payroll_id = p.id
  AND pi.employee_id = e.id
  AND p.payroll_month = DATE '2026-09-01'
  AND p.deleted_at IS NULL
  AND pi.deleted_at IS NULL
  AND upper(replace(e.employee_code, ' ', '')) = 'IF2026019';

-- 5) Anmol Prasad: align stored amounts to Excel (12 paid days × ₹1000 − PT ₹200)
UPDATE hrms.payroll_items pi
SET
  basic_salary = 6000,
  total_allowances = 6000,
  gross_salary = 12000,
  total_deductions = 200,
  net_salary = 11800,
  deleted_at = NULL,
  updated_at = now()
FROM hrms.payrolls p,
     hrms.employees e
WHERE pi.payroll_id = p.id
  AND pi.employee_id = e.id
  AND p.payroll_month = DATE '2026-09-01'
  AND p.deleted_at IS NULL
  AND upper(replace(e.employee_code, ' ', '')) = 'IF2026016';

-- 6) Excel Sept reimbursement for Hemavathi is ₹0 — reject the approved ₹160 claim
--    so period recalculation cannot re-apply it.
UPDATE hrms.employee_reimbursements er
SET
  payroll_id = NULL,
  reimbursement_status = 'rejected',
  rejection_reason = COALESCE(
    er.rejection_reason,
    'Cleared to match Sept-2026 Excel payroll (reimbursement ₹0)'
  ),
  updated_at = now()
FROM hrms.employees e
WHERE er.employee_id = e.id
  AND upper(replace(e.employee_code, ' ', '')) = 'IF2026019'
  AND er.deleted_at IS NULL
  AND er.reimbursement_status = 'approved'
  AND er.amount = 160
  AND er.expense_date >= DATE '2026-09-01'
  AND er.expense_date < DATE '2026-10-01';

COMMIT;
