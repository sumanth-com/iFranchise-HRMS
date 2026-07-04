-- Seed today's attendance as present for all active workforce employees.
-- Idempotent: safe to re-run.

INSERT INTO hrms.attendance (
  organization_id,
  branch_id,
  employee_id,
  attendance_date,
  check_in_at,
  check_out_at,
  attendance_status,
  work_hours,
  status
)
SELECT
  e.organization_id,
  e.branch_id,
  e.id,
  CURRENT_DATE,
  ((CURRENT_DATE + time '10:00:00') AT TIME ZONE 'Asia/Kolkata'),
  ((CURRENT_DATE + time '19:00:00') AT TIME ZONE 'Asia/Kolkata'),
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
FROM hrms.employees e
WHERE e.deleted_at IS NULL
  AND e.employment_status IN ('active', 'probation', 'on_leave')
  AND e.date_of_joining <= CURRENT_DATE
ON CONFLICT (employee_id, attendance_date) DO UPDATE
SET
  check_in_at = EXCLUDED.check_in_at,
  check_out_at = EXCLUDED.check_out_at,
  attendance_status = EXCLUDED.attendance_status,
  work_hours = EXCLUDED.work_hours,
  status = EXCLUDED.status,
  deleted_at = NULL,
  updated_at = public.utc_now();
