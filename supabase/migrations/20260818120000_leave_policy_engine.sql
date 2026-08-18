-- Leave policy productionization: duration breakdown, Period Leave, Saturday/sandwich defaults,
-- and restore manager approval of team leave.

ALTER TABLE hrms.leave_requests
  ADD COLUMN IF NOT EXISTS duration_breakdown jsonb;

-- Period Leave (PL) for female employees.
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
  'Period Leave',
  'PL',
  'Period leave for female employees. Non-carry-forwardable. During probation, 1 day is allowed.',
  0,
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

-- Align working calendar + sandwich + probation defaults without wiping other settings.
UPDATE hrms.organization_settings
SET
  settings = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          COALESCE(settings, '{}'::jsonb),
          '{attendance_rules,working_days}',
          '["monday","tuesday","wednesday","thursday","friday","saturday"]'::jsonb
        ),
        '{weekend_rules}',
        jsonb_build_object(
          'saturday', 'nth_half',
          'sunday', 'off',
          'saturday_half_day_weeks', '[2, 4]'::jsonb
        )
      ),
      '{leave_policies,sandwich_leave}',
      jsonb_build_object(
        'enabled', true,
        'include_weekends', true,
        'include_holidays', true
      )
    ),
    '{leave_policies,probation}',
    jsonb_build_object(
      'duration_months', 3,
      'first_month_leave_allowed', false,
      'casual_leave_cap', 2,
      'period_leave_cap', 1,
      'period_leave_female_only', true,
      'carry_forward_allowed', false
    )
  )
WHERE deleted_at IS NULL;

UPDATE hrms.organization_settings
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{leave_rules,approval_levels}',
  '2'::jsonb
)
WHERE deleted_at IS NULL;

-- Allocate 1 Period Leave day to female employees for the current year.
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
  1,
  0,
  0,
  1,
  'active'
FROM hrms.employees e
JOIN hrms.employee_profiles ep ON ep.employee_id = e.id AND ep.deleted_at IS NULL
JOIN hrms.leave_types lt
  ON lt.organization_id = e.organization_id
  AND lt.code = 'PL'
  AND lt.deleted_at IS NULL
WHERE e.deleted_at IS NULL
  AND e.employment_status IN ('probation', 'active', 'on_leave')
  AND ep.gender = 'female'
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.leave_balances lb
    WHERE lb.employee_id = e.id
      AND lb.leave_type_id = lt.id
      AND lb.balance_year = EXTRACT(YEAR FROM CURRENT_DATE)::smallint
      AND lb.deleted_at IS NULL
  );

-- Managers can approve/reject team leave assigned to them.
UPDATE hrms.role_permissions rp
SET
  deleted_at = NULL,
  status = 'active',
  updated_at = public.utc_now()
FROM hrms.roles r,
     hrms.permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.code = 'manager'
  AND p.code IN ('leave.approve', 'leave.reject');

INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'::hrms.record_status
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'manager'
  AND p.code IN ('leave.approve', 'leave.reject')
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  );
