-- Phase 4: Leave module enhancements (columns, types, permissions)

-- -----------------------------------------------------------------------------
-- leave.edit permission
-- -----------------------------------------------------------------------------

INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT 'leave.edit', 'leave', 'edit', 'leave', 'Edit leave requests', 'active'
WHERE NOT EXISTS (
  SELECT 1
  FROM hrms.permissions
  WHERE code = 'leave.edit'
    AND deleted_at IS NULL
);

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code IN ('super_admin', 'hr_admin')
  AND p.code = 'leave.edit'
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- -----------------------------------------------------------------------------
-- leave_requests: half day, emergency contact, attachment
-- -----------------------------------------------------------------------------

ALTER TABLE hrms.leave_requests
  ADD COLUMN IF NOT EXISTS is_half_day boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS half_day_period text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS attachment_path text;

ALTER TABLE hrms.leave_requests
  DROP CONSTRAINT IF EXISTS leave_requests_half_day_period_check;

ALTER TABLE hrms.leave_requests
  ADD CONSTRAINT leave_requests_half_day_period_check
  CHECK (
    half_day_period IS NULL
    OR half_day_period IN ('morning', 'afternoon')
  );

-- -----------------------------------------------------------------------------
-- Additional leave types
-- -----------------------------------------------------------------------------

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
VALUES
  (
    'b0000000-0000-4000-8000-000000000502',
    'a0000000-0000-4000-8000-000000000001',
    'Casual Leave',
    'CL',
    'Casual leave for personal matters',
    6,
    true,
    false,
    0,
    'active'
  ),
  (
    'b0000000-0000-4000-8000-000000000503',
    'a0000000-0000-4000-8000-000000000001',
    'Sick Leave',
    'SL',
    'Medical leave',
    6,
    true,
    false,
    0,
    'active'
  ),
  (
    'b0000000-0000-4000-8000-000000000504',
    'a0000000-0000-4000-8000-000000000001',
    'Loss Of Pay',
    'LOP',
    'Unpaid leave',
    0,
    false,
    false,
    0,
    'active'
  ),
  (
    'b0000000-0000-4000-8000-000000000505',
    'a0000000-0000-4000-8000-000000000001',
    'Comp Off',
    'COMP_OFF',
    'Compensatory off',
    0,
    true,
    false,
    0,
    'active'
  ),
  (
    'b0000000-0000-4000-8000-000000000506',
    'a0000000-0000-4000-8000-000000000001',
    'Maternity Leave',
    'MATERNITY',
    'Maternity leave',
    180,
    true,
    false,
    0,
    'active'
  ),
  (
    'b0000000-0000-4000-8000-000000000507',
    'a0000000-0000-4000-8000-000000000001',
    'Paternity Leave',
    'PATERNITY',
    'Paternity leave',
    15,
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
  updated_at = public.utc_now();

-- -----------------------------------------------------------------------------
-- Default leave balances for all active employees (2026)
-- -----------------------------------------------------------------------------

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
  2026,
  lt.days_per_year,
  0,
  0,
  lt.days_per_year,
  'active'::hrms.record_status
FROM hrms.employees e
CROSS JOIN hrms.leave_types lt
WHERE e.organization_id = 'a0000000-0000-4000-8000-000000000001'
  AND lt.organization_id = 'a0000000-0000-4000-8000-000000000001'
  AND e.deleted_at IS NULL
  AND e.employment_status IN ('active', 'probation', 'on_leave')
  AND lt.deleted_at IS NULL
  AND lt.status = 'active'
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.leave_balances lb
    WHERE lb.employee_id = e.id
      AND lb.leave_type_id = lt.id
      AND lb.balance_year = 2026
      AND lb.deleted_at IS NULL
  );

-- -----------------------------------------------------------------------------
-- Update leave_rules to two-level approval
-- -----------------------------------------------------------------------------

UPDATE hrms.organization_settings
SET
  settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{leave_rules,approval_levels}',
    '2'::jsonb,
    true
  ),
  updated_at = public.utc_now()
WHERE organization_id = 'a0000000-0000-4000-8000-000000000001';
