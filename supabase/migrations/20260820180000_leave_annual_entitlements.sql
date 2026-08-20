-- Align annual leave entitlements and rename Period Leave → Menstruation Leave.
-- CL 12, SL 12, EL 18, PL 12

UPDATE hrms.leave_types
SET
  days_per_year = CASE code
    WHEN 'CL' THEN 12
    WHEN 'SL' THEN 12
    WHEN 'EL' THEN 18
    WHEN 'PL' THEN 12
    ELSE days_per_year
  END,
  name = CASE
    WHEN code = 'PL' THEN 'Menstruation Leave'
    ELSE name
  END,
  description = CASE
    WHEN code = 'PL' THEN
      'Menstruation leave for female employees. Non-carry-forwardable. During probation, 1 day is allowed.'
    ELSE description
  END,
  status = 'active',
  deleted_at = NULL,
  updated_at = public.utc_now()
WHERE code IN ('CL', 'SL', 'EL', 'PL')
  AND deleted_at IS NULL;

-- Ensure PL exists for every organization (in case it was missing).
INSERT INTO hrms.leave_types (
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
SELECT
  org.id,
  'Menstruation Leave',
  'PL',
  'Menstruation leave for female employees. Non-carry-forwardable. During probation, 1 day is allowed.',
  12,
  true,
  false,
  0,
  'active'
FROM hrms.organizations org
WHERE org.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.leave_types lt
    WHERE lt.organization_id = org.id
      AND lt.code = 'PL'
      AND lt.deleted_at IS NULL
  );

-- Rescale current-year balances to the new annual entitlements while preserving used/pending.
WITH target AS (
  SELECT *
  FROM (
    VALUES
      ('CL'::text, 12::numeric),
      ('SL', 12),
      ('EL', 18),
      ('PL', 12)
  ) AS t(code, days)
)
UPDATE hrms.leave_balances lb
SET
  allocated_days = target.days,
  balance_days = GREATEST(0, target.days - lb.used_days - lb.pending_days),
  updated_at = public.utc_now()
FROM hrms.leave_types lt
JOIN target ON target.code = lt.code
WHERE lb.leave_type_id = lt.id
  AND lb.deleted_at IS NULL
  AND lt.deleted_at IS NULL
  AND lb.balance_year = EXTRACT(YEAR FROM CURRENT_DATE)::smallint;

-- Create missing current-year balances for CL/SL/EL for active workforce.
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
  lt.id,
  EXTRACT(YEAR FROM CURRENT_DATE)::smallint,
  lt.days_per_year,
  0,
  0,
  lt.days_per_year,
  'active'
FROM hrms.employees e
JOIN hrms.leave_types lt
  ON lt.organization_id = e.organization_id
 AND lt.code IN ('CL', 'SL', 'EL')
 AND lt.deleted_at IS NULL
WHERE e.deleted_at IS NULL
  AND e.employment_status IN ('active', 'probation', 'on_leave')
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.leave_balances lb
    WHERE lb.employee_id = e.id
      AND lb.leave_type_id = lt.id
      AND lb.balance_year = EXTRACT(YEAR FROM CURRENT_DATE)::smallint
      AND lb.deleted_at IS NULL
  );

-- Ensure female employees have Menstruation Leave balance for the current year.
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
  lt.id,
  EXTRACT(YEAR FROM CURRENT_DATE)::smallint,
  12,
  0,
  0,
  12,
  'active'
FROM hrms.employees e
JOIN hrms.employee_profiles ep
  ON ep.employee_id = e.id
 AND ep.deleted_at IS NULL
JOIN hrms.leave_types lt
  ON lt.organization_id = e.organization_id
 AND lt.code = 'PL'
 AND lt.deleted_at IS NULL
WHERE e.deleted_at IS NULL
  AND e.employment_status IN ('active', 'probation', 'on_leave')
  AND ep.gender = 'female'
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.leave_balances lb
    WHERE lb.employee_id = e.id
      AND lb.leave_type_id = lt.id
      AND lb.balance_year = EXTRACT(YEAR FROM CURRENT_DATE)::smallint
      AND lb.deleted_at IS NULL
  );
