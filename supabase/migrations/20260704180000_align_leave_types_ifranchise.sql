-- Align leave types to iFranchise policy: CL, EL, Optional Holiday, LOP only

UPDATE hrms.leave_types
SET
  status = 'inactive',
  deleted_at = public.utc_now(),
  updated_at = public.utc_now()
WHERE organization_id = 'a0000000-0000-4000-8000-000000000001'
  AND code IN ('SL', 'COMP_OFF', 'MATERNITY', 'PATERNITY')
  AND deleted_at IS NULL;

INSERT INTO hrms.leave_types (
  id,
  organization_id,
  name,
  code,
  description,
  days_per_year,
  is_paid,
  is_carry_forward,
  max_carry_forward_days,
  status
)
VALUES (
  'b0000000-0000-4000-8000-000000000508',
  'a0000000-0000-4000-8000-000000000001',
  'Optional Holiday',
  'OH',
  'Optional festival or restricted holiday',
  2,
  true,
  false,
  0,
  'active'
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  description = EXCLUDED.description,
  days_per_year = EXCLUDED.days_per_year,
  is_paid = EXCLUDED.is_paid,
  is_carry_forward = EXCLUDED.is_carry_forward,
  max_carry_forward_days = EXCLUDED.max_carry_forward_days,
  status = EXCLUDED.status,
  deleted_at = NULL,
  updated_at = public.utc_now();

INSERT INTO hrms.leave_balances (
  employee_id,
  leave_type_id,
  balance_year,
  allocated_days,
  used_days,
  pending_days,
  balance_days,
  status
)
SELECT
  e.id,
  'b0000000-0000-4000-8000-000000000508'::uuid,
  2026,
  2,
  0,
  0,
  2,
  'active'::hrms.record_status
FROM hrms.employees e
WHERE e.organization_id = 'a0000000-0000-4000-8000-000000000001'
  AND e.deleted_at IS NULL
  AND e.employment_status IN ('active', 'probation', 'on_leave')
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.leave_balances lb
    WHERE lb.employee_id = e.id
      AND lb.leave_type_id = 'b0000000-0000-4000-8000-000000000508'::uuid
      AND lb.balance_year = 2026
      AND lb.deleted_at IS NULL
  );
