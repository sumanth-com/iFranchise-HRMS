-- Vennapusa Hemavathi (IF2026019):
-- 19 Nov 2026 afternoon half-day CL with 14:00 IST checkout;
-- 20 Nov 2026 full-day Casual Leave.
BEGIN;

UPDATE hrms.attendance
SET
  check_out_at = TIMESTAMPTZ '2026-11-19 14:00:00+05:30',
  attendance_status = 'half_day',
  work_hours = 4.1,
  overtime_hours = 0,
  notes = 'early-logout:half|src:leave:c5c06ebf-29ad-40c4-a3c4-b00195c8ef35',
  updated_at = now()
WHERE employee_id = (
  SELECT id FROM hrms.employees
  WHERE upper(replace(employee_code, ' ', '')) = 'IF2026019' AND deleted_at IS NULL
  LIMIT 1
)
AND attendance_date = DATE '2026-11-19'
AND deleted_at IS NULL;

INSERT INTO hrms.attendance (
  organization_id, branch_id, employee_id, attendance_date,
  attendance_status, check_in_at, check_out_at, work_hours, overtime_hours,
  notes, status, created_at, updated_at
)
SELECT
  e.organization_id,
  e.branch_id,
  e.id,
  DATE '2026-11-20',
  'on_leave',
  NULL,
  NULL,
  0,
  0,
  'src:CL|src:leave:05d673a2-8e9f-4061-8488-72be1fe2f5ee',
  'active',
  now(),
  now()
FROM hrms.employees e
WHERE upper(replace(e.employee_code, ' ', '')) = 'IF2026019'
  AND e.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM hrms.attendance a
    WHERE a.employee_id = e.id
      AND a.attendance_date = DATE '2026-11-20'
      AND a.deleted_at IS NULL
  );

UPDATE hrms.attendance
SET
  attendance_status = 'on_leave',
  check_in_at = NULL,
  check_out_at = NULL,
  work_hours = 0,
  overtime_hours = 0,
  notes = 'src:CL|src:leave:05d673a2-8e9f-4061-8488-72be1fe2f5ee',
  updated_at = now()
WHERE employee_id = (
  SELECT id FROM hrms.employees
  WHERE upper(replace(employee_code, ' ', '')) = 'IF2026019' AND deleted_at IS NULL
  LIMIT 1
)
AND attendance_date = DATE '2026-11-20'
AND deleted_at IS NULL;

UPDATE hrms.leave_requests
SET
  leave_status = 'approved',
  is_half_day = true,
  half_day_period = 'afternoon',
  total_days = 0.5,
  updated_at = now()
WHERE id = 'c5c06ebf-29ad-40c4-a3c4-b00195c8ef35';

UPDATE hrms.leave_requests
SET
  leave_status = 'approved',
  updated_at = now()
WHERE id = '05d673a2-8e9f-4061-8488-72be1fe2f5ee';

UPDATE hrms.leave_approvals
SET
  approval_status = 'approved',
  comments = COALESCE(comments, 'Approved per attendance record'),
  acted_at = COALESCE(acted_at, now()),
  updated_at = now()
WHERE leave_request_id IN (
  'c5c06ebf-29ad-40c4-a3c4-b00195c8ef35',
  '05d673a2-8e9f-4061-8488-72be1fe2f5ee'
)
AND approver_employee_id = (
  SELECT id FROM hrms.employees
  WHERE upper(replace(employee_code, ' ', '')) = 'IF2026001' AND deleted_at IS NULL
  LIMIT 1
)
AND approval_status = 'pending';

UPDATE hrms.leave_approvals
SET
  approval_status = 'skipped',
  comments = COALESCE(comments, 'Closed after HR recorded approved CL'),
  acted_at = COALESCE(acted_at, now()),
  updated_at = now()
WHERE leave_request_id IN (
  'c5c06ebf-29ad-40c4-a3c4-b00195c8ef35',
  '05d673a2-8e9f-4061-8488-72be1fe2f5ee'
)
AND approval_status = 'pending';

UPDATE hrms.leave_balances
SET
  used_days = 3,
  pending_days = 0,
  balance_days = 0,
  updated_at = now()
WHERE id = '1f43251a-034f-48fe-a41e-477cc9835147';

COMMIT;
