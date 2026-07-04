-- Seed attendance from legacy Excel sheet (Apr–Jul 2026)
-- Source: src/assets/Attendence Sheet 2026.xlsx
-- Idempotent: safe to re-run
-- Skipped employees not in HRMS: Abdul, Abrar, Diksha, Ehtesham

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
  v.organization_id,
  e.branch_id,
  v.employee_id,
  v.attendance_date,
  v.check_in_at,
  v.check_out_at,
  v.attendance_status,
  v.work_hours,
  v.status
FROM (
  VALUES
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-01',
  ((DATE '2026-04-01' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-01' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-01',
  ((DATE '2026-04-01' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-01' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-01',
  ((DATE '2026-04-01' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-01' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-01',
  ((DATE '2026-04-01' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-01' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-02',
  ((DATE '2026-04-02' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-02' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-02',
  ((DATE '2026-04-02' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-02' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-02',
  ((DATE '2026-04-02' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-02' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-02',
  ((DATE '2026-04-02' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-02' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-03',
  ((DATE '2026-04-03' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-03' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-03',
  ((DATE '2026-04-03' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-03' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-03',
  ((DATE '2026-04-03' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-03' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-03',
  ((DATE '2026-04-03' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-03' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-04',
  ((DATE '2026-04-04' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-04' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-04',
  ((DATE '2026-04-04' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-04' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-04',
  ((DATE '2026-04-04' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-04' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-04',
  ((DATE '2026-04-04' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-04' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-05',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-05',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-05',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-05',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-06',
  ((DATE '2026-04-06' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-06' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-06',
  ((DATE '2026-04-06' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-06' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-06',
  ((DATE '2026-04-06' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-06' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-06',
  ((DATE '2026-04-06' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-06' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-07',
  ((DATE '2026-04-07' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-07' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-07',
  ((DATE '2026-04-07' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-07' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-07',
  ((DATE '2026-04-07' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-07' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-07',
  ((DATE '2026-04-07' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-07' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-08',
  ((DATE '2026-04-08' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-08' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-08',
  ((DATE '2026-04-08' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-08' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-08',
  ((DATE '2026-04-08' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-08' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-08',
  ((DATE '2026-04-08' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-08' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-09',
  ((DATE '2026-04-09' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-09' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-09',
  ((DATE '2026-04-09' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-09' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-09',
  ((DATE '2026-04-09' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-09' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-09',
  ((DATE '2026-04-09' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-09' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-10',
  ((DATE '2026-04-10' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-10' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-10',
  ((DATE '2026-04-10' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-10' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-10',
  ((DATE '2026-04-10' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-10' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-10',
  ((DATE '2026-04-10' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-10' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-11',
  ((DATE '2026-04-11' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-11' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-11',
  ((DATE '2026-04-11' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-11' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-11',
  ((DATE '2026-04-11' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-11' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-11',
  ((DATE '2026-04-11' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-11' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-12',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-12',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-12',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-12',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-13',
  ((DATE '2026-04-13' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-13' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-13',
  ((DATE '2026-04-13' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-13' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-13',
  ((DATE '2026-04-13' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-13' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-13',
  ((DATE '2026-04-13' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-13' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-14',
  ((DATE '2026-04-14' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-14' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-14',
  NULL::timestamptz,
  NULL::timestamptz,
  'on_leave'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-14',
  ((DATE '2026-04-14' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-14' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-14',
  ((DATE '2026-04-14' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-14' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-15',
  ((DATE '2026-04-15' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-15' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-15',
  ((DATE '2026-04-15' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-15' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-15',
  ((DATE '2026-04-15' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-15' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-15',
  ((DATE '2026-04-15' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-15' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-16',
  ((DATE '2026-04-16' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-16' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-16',
  ((DATE '2026-04-16' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-16' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-16',
  ((DATE '2026-04-16' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-16' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-16',
  ((DATE '2026-04-16' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-16' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-17',
  ((DATE '2026-04-17' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-17' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-17',
  ((DATE '2026-04-17' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-17' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-17',
  ((DATE '2026-04-17' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-17' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-17',
  ((DATE '2026-04-17' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-17' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-18',
  ((DATE '2026-04-18' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-18' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-18',
  ((DATE '2026-04-18' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-18' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-18',
  ((DATE '2026-04-18' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-18' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-18',
  ((DATE '2026-04-18' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-18' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-19',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-19',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-19',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-19',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-20',
  ((DATE '2026-04-20' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-20' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-20',
  ((DATE '2026-04-20' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-20' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-20',
  ((DATE '2026-04-20' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-20' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-20',
  ((DATE '2026-04-20' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-20' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-21',
  ((DATE '2026-04-21' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-21' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-21',
  ((DATE '2026-04-21' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-21' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-21',
  ((DATE '2026-04-21' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-21' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-21',
  ((DATE '2026-04-21' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-21' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-22',
  ((DATE '2026-04-22' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-22' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-22',
  ((DATE '2026-04-22' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-22' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-22',
  ((DATE '2026-04-22' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-22' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-22',
  ((DATE '2026-04-22' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-22' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-23',
  ((DATE '2026-04-23' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-23' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-23',
  ((DATE '2026-04-23' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-23' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-23',
  ((DATE '2026-04-23' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-23' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-23',
  NULL::timestamptz,
  NULL::timestamptz,
  'on_leave'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-24',
  ((DATE '2026-04-24' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-24' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-24',
  ((DATE '2026-04-24' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-24' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-24',
  NULL::timestamptz,
  NULL::timestamptz,
  'on_leave'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-24',
  NULL::timestamptz,
  NULL::timestamptz,
  'on_leave'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-25',
  ((DATE '2026-04-25' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-25' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-25',
  ((DATE '2026-04-25' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-25' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-25',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-26',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
)
) AS v (
  organization_id,
  employee_id,
  attendance_date,
  check_in_at,
  check_out_at,
  attendance_status,
  work_hours,
  status
)
JOIN hrms.employees e ON e.id = v.employee_id
ON CONFLICT (employee_id, attendance_date) DO UPDATE
SET
  check_in_at = EXCLUDED.check_in_at,
  check_out_at = EXCLUDED.check_out_at,
  attendance_status = EXCLUDED.attendance_status,
  work_hours = EXCLUDED.work_hours,
  status = EXCLUDED.status,
  deleted_at = NULL,
  updated_at = public.utc_now();

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
  v.organization_id,
  e.branch_id,
  v.employee_id,
  v.attendance_date,
  v.check_in_at,
  v.check_out_at,
  v.attendance_status,
  v.work_hours,
  v.status
FROM (
  VALUES
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-26',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-26',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-26',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-27',
  ((DATE '2026-04-27' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-27' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-27',
  ((DATE '2026-04-27' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-27' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-27',
  ((DATE '2026-04-27' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-27' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-27',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-28',
  ((DATE '2026-04-28' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-28' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-28',
  ((DATE '2026-04-28' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-28' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-28',
  ((DATE '2026-04-28' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-28' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-28',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-29',
  ((DATE '2026-04-29' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-29' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-29',
  ((DATE '2026-04-29' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-29' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-29',
  ((DATE '2026-04-29' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-29' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-29',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-04-30',
  ((DATE '2026-04-30' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-30' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-04-30',
  ((DATE '2026-04-30' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-30' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-04-30',
  ((DATE '2026-04-30' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-04-30' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-04-30',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-01',
  ((DATE '2026-05-01' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-01' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-01',
  ((DATE '2026-05-01' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-01' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-01',
  ((DATE '2026-05-01' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-01' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-01',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-01',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-01',
  ((DATE '2026-05-01' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-01' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-01',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-02',
  ((DATE '2026-05-02' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-02' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-02',
  ((DATE '2026-05-02' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-02' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-02',
  ((DATE '2026-05-02' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-02' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-02',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-02',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-02',
  ((DATE '2026-05-02' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-02' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-02',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-03',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-03',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-03',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-03',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-03',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-03',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-03',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-04',
  ((DATE '2026-05-04' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-04' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-04',
  ((DATE '2026-05-04' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-04' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-04',
  ((DATE '2026-05-04' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-04' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-04',
  ((DATE '2026-05-04' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-04' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-04',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-04',
  ((DATE '2026-05-04' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-04' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-04',
  ((DATE '2026-05-04' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-04' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-05',
  ((DATE '2026-05-05' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-05' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-05',
  ((DATE '2026-05-05' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-05' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-05',
  ((DATE '2026-05-05' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-05' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-05',
  ((DATE '2026-05-05' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-05' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-05',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-05',
  ((DATE '2026-05-05' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-05' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-05',
  ((DATE '2026-05-05' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-05' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-06',
  ((DATE '2026-05-06' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-06' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-06',
  ((DATE '2026-05-06' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-06' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-06',
  ((DATE '2026-05-06' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-06' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-06',
  ((DATE '2026-05-06' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-06' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-06',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-06',
  ((DATE '2026-05-06' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-06' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-06',
  ((DATE '2026-05-06' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-06' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-07',
  ((DATE '2026-05-07' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-07' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-07',
  ((DATE '2026-05-07' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-07' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-07',
  ((DATE '2026-05-07' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-07' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-07',
  ((DATE '2026-05-07' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-07' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-07',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-07',
  ((DATE '2026-05-07' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-07' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-07',
  ((DATE '2026-05-07' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-07' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-08',
  ((DATE '2026-05-08' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-08' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-08',
  NULL::timestamptz,
  NULL::timestamptz,
  'on_leave'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-08',
  ((DATE '2026-05-08' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-08' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-08',
  ((DATE '2026-05-08' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-08' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-08',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-08',
  ((DATE '2026-05-08' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-08' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-08',
  ((DATE '2026-05-08' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-08' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-09',
  ((DATE '2026-05-09' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-09' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-09',
  ((DATE '2026-05-09' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-09' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-09',
  ((DATE '2026-05-09' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-09' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-09',
  ((DATE '2026-05-09' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-09' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-09',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-09',
  ((DATE '2026-05-09' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-09' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-09',
  ((DATE '2026-05-09' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-09' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-10',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-10',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-10',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-10',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-10',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-10',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-10',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-11',
  ((DATE '2026-05-11' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-11' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-11',
  ((DATE '2026-05-11' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-11' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-11',
  ((DATE '2026-05-11' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-11' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-11',
  ((DATE '2026-05-11' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-11' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-11',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-11',
  ((DATE '2026-05-11' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-11' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-11',
  ((DATE '2026-05-11' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-11' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-12',
  ((DATE '2026-05-12' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-12' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-12',
  ((DATE '2026-05-12' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-12' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-12',
  ((DATE '2026-05-12' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-12' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-12',
  ((DATE '2026-05-12' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-12' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
)
) AS v (
  organization_id,
  employee_id,
  attendance_date,
  check_in_at,
  check_out_at,
  attendance_status,
  work_hours,
  status
)
JOIN hrms.employees e ON e.id = v.employee_id
ON CONFLICT (employee_id, attendance_date) DO UPDATE
SET
  check_in_at = EXCLUDED.check_in_at,
  check_out_at = EXCLUDED.check_out_at,
  attendance_status = EXCLUDED.attendance_status,
  work_hours = EXCLUDED.work_hours,
  status = EXCLUDED.status,
  deleted_at = NULL,
  updated_at = public.utc_now();

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
  v.organization_id,
  e.branch_id,
  v.employee_id,
  v.attendance_date,
  v.check_in_at,
  v.check_out_at,
  v.attendance_status,
  v.work_hours,
  v.status
FROM (
  VALUES
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-12',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-12',
  ((DATE '2026-05-12' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-12' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-12',
  ((DATE '2026-05-12' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-12' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-13',
  ((DATE '2026-05-13' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-13' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-13',
  ((DATE '2026-05-13' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-13' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-13',
  ((DATE '2026-05-13' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-13' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-13',
  ((DATE '2026-05-13' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-13' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-13',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-13',
  ((DATE '2026-05-13' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-13' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-13',
  ((DATE '2026-05-13' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-13' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-14',
  NULL::timestamptz,
  NULL::timestamptz,
  'on_leave'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-14',
  ((DATE '2026-05-14' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-14' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-14',
  ((DATE '2026-05-14' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-14' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-14',
  ((DATE '2026-05-14' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-14' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-14',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-14',
  ((DATE '2026-05-14' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-14' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-14',
  ((DATE '2026-05-14' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-14' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-15',
  ((DATE '2026-05-15' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-15' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-15',
  ((DATE '2026-05-15' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-15' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-15',
  ((DATE '2026-05-15' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-15' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-15',
  ((DATE '2026-05-15' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-15' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-15',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-15',
  ((DATE '2026-05-15' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-15' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-15',
  ((DATE '2026-05-15' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-15' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-16',
  ((DATE '2026-05-16' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-16' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-16',
  ((DATE '2026-05-16' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-16' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-16',
  ((DATE '2026-05-16' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-16' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-16',
  ((DATE '2026-05-16' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-16' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-16',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-16',
  ((DATE '2026-05-16' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-16' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-16',
  ((DATE '2026-05-16' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-16' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-17',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-17',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-17',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-17',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-17',
  NULL::timestamptz,
  NULL::timestamptz,
  'absent'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-17',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-17',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-18',
  ((DATE '2026-05-18' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-18' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-18',
  NULL::timestamptz,
  NULL::timestamptz,
  'on_leave'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-18',
  ((DATE '2026-05-18' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-18' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-18',
  ((DATE '2026-05-18' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-18' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-18',
  ((DATE '2026-05-18' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-18' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-18',
  ((DATE '2026-05-18' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-18' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-18',
  ((DATE '2026-05-18' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-18' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-19',
  ((DATE '2026-05-19' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-19' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-19',
  ((DATE '2026-05-19' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-19' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-19',
  ((DATE '2026-05-19' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-19' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-19',
  ((DATE '2026-05-19' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-19' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-19',
  ((DATE '2026-05-19' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-19' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-19',
  ((DATE '2026-05-19' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-19' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-19',
  ((DATE '2026-05-19' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-19' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-20',
  ((DATE '2026-05-20' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-20' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-20',
  ((DATE '2026-05-20' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-20' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-20',
  ((DATE '2026-05-20' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-20' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-20',
  ((DATE '2026-05-20' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-20' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-20',
  ((DATE '2026-05-20' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-20' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-20',
  ((DATE '2026-05-20' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-20' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-20',
  ((DATE '2026-05-20' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-20' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-21',
  ((DATE '2026-05-21' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-21' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-21',
  ((DATE '2026-05-21' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-21' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-21',
  NULL::timestamptz,
  NULL::timestamptz,
  'on_leave'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-21',
  ((DATE '2026-05-21' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-21' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-21',
  ((DATE '2026-05-21' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-21' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-21',
  ((DATE '2026-05-21' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-21' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-21',
  ((DATE '2026-05-21' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-21' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-22',
  ((DATE '2026-05-22' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-22' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-22',
  ((DATE '2026-05-22' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-22' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-22',
  ((DATE '2026-05-22' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-22' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-22',
  ((DATE '2026-05-22' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-22' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-22',
  ((DATE '2026-05-22' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-22' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-22',
  ((DATE '2026-05-22' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-22' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-22',
  ((DATE '2026-05-22' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-22' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-23',
  ((DATE '2026-05-23' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-23' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-23',
  ((DATE '2026-05-23' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-23' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-23',
  ((DATE '2026-05-23' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-23' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-23',
  ((DATE '2026-05-23' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-23' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-23',
  ((DATE '2026-05-23' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-23' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-23',
  ((DATE '2026-05-23' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-23' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-23',
  ((DATE '2026-05-23' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-23' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-24',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-24',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-24',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-24',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-24',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-24',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-24',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-25',
  ((DATE '2026-05-25' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-25' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-25',
  ((DATE '2026-05-25' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-25' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-25',
  NULL::timestamptz,
  NULL::timestamptz,
  'on_leave'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-25',
  ((DATE '2026-05-25' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-25' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-25',
  ((DATE '2026-05-25' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-25' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-25',
  ((DATE '2026-05-25' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-25' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-25',
  ((DATE '2026-05-25' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-25' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-26',
  ((DATE '2026-05-26' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-26' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-26',
  ((DATE '2026-05-26' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-26' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-26',
  ((DATE '2026-05-26' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-26' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-26',
  ((DATE '2026-05-26' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-26' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-26',
  ((DATE '2026-05-26' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-26' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-26',
  ((DATE '2026-05-26' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-26' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
)
) AS v (
  organization_id,
  employee_id,
  attendance_date,
  check_in_at,
  check_out_at,
  attendance_status,
  work_hours,
  status
)
JOIN hrms.employees e ON e.id = v.employee_id
ON CONFLICT (employee_id, attendance_date) DO UPDATE
SET
  check_in_at = EXCLUDED.check_in_at,
  check_out_at = EXCLUDED.check_out_at,
  attendance_status = EXCLUDED.attendance_status,
  work_hours = EXCLUDED.work_hours,
  status = EXCLUDED.status,
  deleted_at = NULL,
  updated_at = public.utc_now();

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
  v.organization_id,
  e.branch_id,
  v.employee_id,
  v.attendance_date,
  v.check_in_at,
  v.check_out_at,
  v.attendance_status,
  v.work_hours,
  v.status
FROM (
  VALUES
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-26',
  ((DATE '2026-05-26' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-26' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-27',
  ((DATE '2026-05-27' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-27' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-27',
  ((DATE '2026-05-27' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-27' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-27',
  ((DATE '2026-05-27' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-27' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-27',
  ((DATE '2026-05-27' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-27' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-27',
  ((DATE '2026-05-27' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-27' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-27',
  ((DATE '2026-05-27' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-27' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-27',
  ((DATE '2026-05-27' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-27' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-28',
  ((DATE '2026-05-28' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-28' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-28',
  ((DATE '2026-05-28' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-28' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-28',
  ((DATE '2026-05-28' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-28' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-28',
  ((DATE '2026-05-28' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-28' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-28',
  ((DATE '2026-05-28' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-28' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-28',
  ((DATE '2026-05-28' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-28' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-28',
  ((DATE '2026-05-28' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-28' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-29',
  ((DATE '2026-05-29' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-29' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-29',
  ((DATE '2026-05-29' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-29' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-29',
  ((DATE '2026-05-29' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-29' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-29',
  ((DATE '2026-05-29' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-29' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-29',
  ((DATE '2026-05-29' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-29' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-29',
  ((DATE '2026-05-29' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-29' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-29',
  ((DATE '2026-05-29' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-29' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-30',
  NULL::timestamptz,
  NULL::timestamptz,
  'on_leave'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-30',
  ((DATE '2026-05-30' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-30' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-30',
  ((DATE '2026-05-30' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-30' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-30',
  ((DATE '2026-05-30' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-30' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-30',
  ((DATE '2026-05-30' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-30' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-30',
  ((DATE '2026-05-30' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-30' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-30',
  ((DATE '2026-05-30' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-05-30' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-05-31',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-05-31',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-05-31',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-05-31',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-05-31',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-05-31',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-05-31',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-01',
  ((DATE '2026-06-01' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-01' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-01',
  ((DATE '2026-06-01' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-01' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-01',
  ((DATE '2026-06-01' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-01' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-01',
  ((DATE '2026-06-01' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-01' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-01',
  ((DATE '2026-06-01' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-01' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-01',
  ((DATE '2026-06-01' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-01' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-01',
  ((DATE '2026-06-01' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-01' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-02',
  ((DATE '2026-06-02' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-02' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-02',
  ((DATE '2026-06-02' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-02' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-02',
  ((DATE '2026-06-02' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-02' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-02',
  ((DATE '2026-06-02' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-02' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-02',
  ((DATE '2026-06-02' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-02' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-02',
  ((DATE '2026-06-02' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-02' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-02',
  ((DATE '2026-06-02' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-02' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-03',
  ((DATE '2026-06-03' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-03' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-03',
  ((DATE '2026-06-03' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-03' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-03',
  ((DATE '2026-06-03' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-03' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-03',
  ((DATE '2026-06-03' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-03' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-03',
  ((DATE '2026-06-03' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-03' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-03',
  ((DATE '2026-06-03' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-03' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-03',
  ((DATE '2026-06-03' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-03' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-04',
  ((DATE '2026-06-04' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-04' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-04',
  NULL::timestamptz,
  NULL::timestamptz,
  'on_leave'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-04',
  ((DATE '2026-06-04' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-04' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-04',
  ((DATE '2026-06-04' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-04' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-04',
  ((DATE '2026-06-04' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-04' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-04',
  ((DATE '2026-06-04' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-04' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-04',
  ((DATE '2026-06-04' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-04' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-05',
  ((DATE '2026-06-05' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-05' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-05',
  ((DATE '2026-06-05' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-05' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-05',
  ((DATE '2026-06-05' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-05' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-05',
  ((DATE '2026-06-05' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-05' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-05',
  ((DATE '2026-06-05' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-05' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-05',
  ((DATE '2026-06-05' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-05' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-05',
  ((DATE '2026-06-05' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-05' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-06',
  ((DATE '2026-06-06' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-06' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-06',
  ((DATE '2026-06-06' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-06' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-06',
  ((DATE '2026-06-06' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-06' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-06',
  ((DATE '2026-06-06' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-06' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-06',
  ((DATE '2026-06-06' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-06' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-06',
  ((DATE '2026-06-06' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-06' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-06',
  ((DATE '2026-06-06' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-06' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-07',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-07',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-07',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-07',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-07',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-07',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-07',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-08',
  ((DATE '2026-06-08' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-08' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-08',
  ((DATE '2026-06-08' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-08' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-08',
  ((DATE '2026-06-08' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-08' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-08',
  ((DATE '2026-06-08' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-08' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-08',
  NULL::timestamptz,
  NULL::timestamptz,
  'on_leave'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-08',
  ((DATE '2026-06-08' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-08' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-08',
  ((DATE '2026-06-08' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-08' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-09',
  ((DATE '2026-06-09' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-09' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-09',
  ((DATE '2026-06-09' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-09' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-09',
  ((DATE '2026-06-09' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-09' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-09',
  ((DATE '2026-06-09' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-09' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-09',
  ((DATE '2026-06-09' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-09' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-09',
  ((DATE '2026-06-09' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-09' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-09',
  ((DATE '2026-06-09' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-09' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-10',
  ((DATE '2026-06-10' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-10' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
)
) AS v (
  organization_id,
  employee_id,
  attendance_date,
  check_in_at,
  check_out_at,
  attendance_status,
  work_hours,
  status
)
JOIN hrms.employees e ON e.id = v.employee_id
ON CONFLICT (employee_id, attendance_date) DO UPDATE
SET
  check_in_at = EXCLUDED.check_in_at,
  check_out_at = EXCLUDED.check_out_at,
  attendance_status = EXCLUDED.attendance_status,
  work_hours = EXCLUDED.work_hours,
  status = EXCLUDED.status,
  deleted_at = NULL,
  updated_at = public.utc_now();

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
  v.organization_id,
  e.branch_id,
  v.employee_id,
  v.attendance_date,
  v.check_in_at,
  v.check_out_at,
  v.attendance_status,
  v.work_hours,
  v.status
FROM (
  VALUES
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-10',
  ((DATE '2026-06-10' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-10' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-10',
  ((DATE '2026-06-10' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-10' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-10',
  ((DATE '2026-06-10' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-10' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-10',
  ((DATE '2026-06-10' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-10' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-10',
  ((DATE '2026-06-10' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-10' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-10',
  ((DATE '2026-06-10' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-10' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-11',
  ((DATE '2026-06-11' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-11' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-11',
  ((DATE '2026-06-11' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-11' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-11',
  ((DATE '2026-06-11' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-11' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-11',
  ((DATE '2026-06-11' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-11' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-11',
  ((DATE '2026-06-11' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-11' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-11',
  ((DATE '2026-06-11' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-11' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-11',
  ((DATE '2026-06-11' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-11' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-12',
  ((DATE '2026-06-12' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-12' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-12',
  ((DATE '2026-06-12' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-12' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-12',
  ((DATE '2026-06-12' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-12' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-12',
  ((DATE '2026-06-12' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-12' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-12',
  ((DATE '2026-06-12' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-12' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-12',
  ((DATE '2026-06-12' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-12' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-12',
  ((DATE '2026-06-12' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-12' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-13',
  ((DATE '2026-06-13' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-13' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-13',
  ((DATE '2026-06-13' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-13' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-13',
  ((DATE '2026-06-13' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-13' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-13',
  ((DATE '2026-06-13' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-13' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-13',
  ((DATE '2026-06-13' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-13' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-13',
  ((DATE '2026-06-13' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-13' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-13',
  ((DATE '2026-06-13' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-13' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-14',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-14',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-14',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-14',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-14',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-14',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-14',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-15',
  ((DATE '2026-06-15' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-15' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-15',
  ((DATE '2026-06-15' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-15' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-15',
  NULL::timestamptz,
  NULL::timestamptz,
  'on_leave'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-15',
  ((DATE '2026-06-15' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-15' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-15',
  ((DATE '2026-06-15' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-15' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-15',
  ((DATE '2026-06-15' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-15' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-15',
  ((DATE '2026-06-15' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-15' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-16',
  NULL::timestamptz,
  NULL::timestamptz,
  'on_leave'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-16',
  ((DATE '2026-06-16' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-16' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-16',
  ((DATE '2026-06-16' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-16' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-16',
  ((DATE '2026-06-16' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-16' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-16',
  ((DATE '2026-06-16' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-16' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-16',
  ((DATE '2026-06-16' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-16' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-16',
  ((DATE '2026-06-16' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-16' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-17',
  ((DATE '2026-06-17' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-17' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-17',
  ((DATE '2026-06-17' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-17' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-17',
  ((DATE '2026-06-17' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-17' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-17',
  ((DATE '2026-06-17' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-17' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-17',
  ((DATE '2026-06-17' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-17' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-17',
  ((DATE '2026-06-17' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-17' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-17',
  ((DATE '2026-06-17' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-17' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-18',
  ((DATE '2026-06-18' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-18' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-18',
  ((DATE '2026-06-18' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-18' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-18',
  ((DATE '2026-06-18' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-18' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-18',
  ((DATE '2026-06-18' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-18' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-18',
  ((DATE '2026-06-18' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-18' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-18',
  ((DATE '2026-06-18' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-18' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-18',
  ((DATE '2026-06-18' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-18' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-19',
  ((DATE '2026-06-19' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-19' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-19',
  ((DATE '2026-06-19' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-19' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-19',
  ((DATE '2026-06-19' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-19' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-19',
  ((DATE '2026-06-19' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-19' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-19',
  ((DATE '2026-06-19' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-19' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-19',
  ((DATE '2026-06-19' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-19' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-19',
  ((DATE '2026-06-19' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-19' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-20',
  ((DATE '2026-06-20' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-20' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-20',
  ((DATE '2026-06-20' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-20' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-20',
  ((DATE '2026-06-20' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-20' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-20',
  ((DATE '2026-06-20' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-20' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-20',
  ((DATE '2026-06-20' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-20' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-20',
  ((DATE '2026-06-20' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-20' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-20',
  ((DATE '2026-06-20' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-20' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-21',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-21',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-21',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-21',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-21',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-21',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-21',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-22',
  ((DATE '2026-06-22' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-22' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-22',
  ((DATE '2026-06-22' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-22' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-22',
  ((DATE '2026-06-22' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-22' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-22',
  ((DATE '2026-06-22' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-22' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-22',
  ((DATE '2026-06-22' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-22' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-22',
  ((DATE '2026-06-22' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-22' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-22',
  ((DATE '2026-06-22' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-22' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-23',
  ((DATE '2026-06-23' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-23' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-23',
  ((DATE '2026-06-23' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-23' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-23',
  ((DATE '2026-06-23' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-23' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-23',
  ((DATE '2026-06-23' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-23' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-23',
  ((DATE '2026-06-23' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-23' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-23',
  ((DATE '2026-06-23' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-23' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-23',
  ((DATE '2026-06-23' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-23' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-24',
  ((DATE '2026-06-24' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-24' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-24',
  ((DATE '2026-06-24' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-24' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-24',
  ((DATE '2026-06-24' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-24' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
)
) AS v (
  organization_id,
  employee_id,
  attendance_date,
  check_in_at,
  check_out_at,
  attendance_status,
  work_hours,
  status
)
JOIN hrms.employees e ON e.id = v.employee_id
ON CONFLICT (employee_id, attendance_date) DO UPDATE
SET
  check_in_at = EXCLUDED.check_in_at,
  check_out_at = EXCLUDED.check_out_at,
  attendance_status = EXCLUDED.attendance_status,
  work_hours = EXCLUDED.work_hours,
  status = EXCLUDED.status,
  deleted_at = NULL,
  updated_at = public.utc_now();

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
  v.organization_id,
  e.branch_id,
  v.employee_id,
  v.attendance_date,
  v.check_in_at,
  v.check_out_at,
  v.attendance_status,
  v.work_hours,
  v.status
FROM (
  VALUES
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-24',
  ((DATE '2026-06-24' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-24' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-24',
  ((DATE '2026-06-24' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-24' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-24',
  ((DATE '2026-06-24' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-24' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-24',
  ((DATE '2026-06-24' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-24' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-25',
  ((DATE '2026-06-25' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-25' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-25',
  ((DATE '2026-06-25' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-25' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-25',
  ((DATE '2026-06-25' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-25' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-25',
  ((DATE '2026-06-25' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-25' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-25',
  ((DATE '2026-06-25' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-25' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-25',
  ((DATE '2026-06-25' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-25' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-25',
  ((DATE '2026-06-25' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-25' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-26',
  ((DATE '2026-06-26' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-26' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-26',
  ((DATE '2026-06-26' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-26' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-26',
  ((DATE '2026-06-26' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-26' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-26',
  ((DATE '2026-06-26' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-26' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-26',
  ((DATE '2026-06-26' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-26' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-26',
  ((DATE '2026-06-26' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-26' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-26',
  ((DATE '2026-06-26' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-26' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-27',
  ((DATE '2026-06-27' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-27' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-27',
  ((DATE '2026-06-27' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-27' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-27',
  ((DATE '2026-06-27' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-27' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-27',
  ((DATE '2026-06-27' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-27' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-27',
  ((DATE '2026-06-27' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-27' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-27',
  ((DATE '2026-06-27' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-27' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-27',
  ((DATE '2026-06-27' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-27' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-28',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-28',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-28',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-28',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-28',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-28',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-28',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-29',
  ((DATE '2026-06-29' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-29' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-29',
  ((DATE '2026-06-29' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-29' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-29',
  ((DATE '2026-06-29' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-29' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-29',
  ((DATE '2026-06-29' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-29' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-29',
  ((DATE '2026-06-29' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-29' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-29',
  ((DATE '2026-06-29' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-29' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-29',
  ((DATE '2026-06-29' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-29' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-06-30',
  NULL::timestamptz,
  NULL::timestamptz,
  'on_leave'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-06-30',
  ((DATE '2026-06-30' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-30' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-06-30',
  NULL::timestamptz,
  NULL::timestamptz,
  'on_leave'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-06-30',
  ((DATE '2026-06-30' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-30' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-06-30',
  ((DATE '2026-06-30' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-30' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-06-30',
  ((DATE '2026-06-30' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-30' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-06-30',
  ((DATE '2026-06-30' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-06-30' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-07-01',
  ((DATE '2026-07-01' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-01' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-07-01',
  ((DATE '2026-07-01' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-01' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-07-01',
  ((DATE '2026-07-01' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-01' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-07-01',
  ((DATE '2026-07-01' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-01' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-07-01',
  ((DATE '2026-07-01' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-01' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-07-01',
  ((DATE '2026-07-01' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-01' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-07-01',
  ((DATE '2026-07-01' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-01' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000009'::uuid,
  DATE '2026-07-01',
  ((DATE '2026-07-01' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-01' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000010'::uuid,
  DATE '2026-07-01',
  ((DATE '2026-07-01' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-01' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-07-02',
  ((DATE '2026-07-02' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-02' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-07-02',
  ((DATE '2026-07-02' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-02' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-07-02',
  ((DATE '2026-07-02' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-02' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-07-02',
  ((DATE '2026-07-02' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-02' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-07-02',
  NULL::timestamptz,
  NULL::timestamptz,
  'on_leave'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-07-02',
  ((DATE '2026-07-02' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-02' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-07-02',
  ((DATE '2026-07-02' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-02' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000009'::uuid,
  DATE '2026-07-02',
  ((DATE '2026-07-02' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-02' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000010'::uuid,
  DATE '2026-07-02',
  ((DATE '2026-07-02' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-02' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-07-03',
  ((DATE '2026-07-03' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-03' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-07-03',
  ((DATE '2026-07-03' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-03' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-07-03',
  ((DATE '2026-07-03' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-03' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-07-03',
  ((DATE '2026-07-03' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-03' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-07-03',
  ((DATE '2026-07-03' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-03' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-07-03',
  ((DATE '2026-07-03' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-03' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-07-03',
  ((DATE '2026-07-03' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-03' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000009'::uuid,
  DATE '2026-07-03',
  ((DATE '2026-07-03' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-03' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000010'::uuid,
  DATE '2026-07-03',
  ((DATE '2026-07-03' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-03' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-07-04',
  ((DATE '2026-07-04' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-04' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-07-04',
  ((DATE '2026-07-04' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-04' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-07-04',
  ((DATE '2026-07-04' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-04' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-07-04',
  ((DATE '2026-07-04' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-04' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-07-04',
  ((DATE '2026-07-04' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-04' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-07-04',
  ((DATE '2026-07-04' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-04' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-07-04',
  ((DATE '2026-07-04' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-04' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000009'::uuid,
  DATE '2026-07-04',
  ((DATE '2026-07-04' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-04' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000010'::uuid,
  DATE '2026-07-04',
  ((DATE '2026-07-04' + time '10:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  ((DATE '2026-07-04' + time '19:00:00') AT TIME ZONE 'Asia/Kolkata')::timestamptz,
  'present'::hrms.attendance_status,
  9,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-07-05',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-07-05',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-07-05',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-07-05',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-07-05',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-07-05',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-07-05',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000009'::uuid,
  DATE '2026-07-05',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000010'::uuid,
  DATE '2026-07-05',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-07-12',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-07-12',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-07-12',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-07-12',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-07-12',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-07-12',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-07-12',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000009'::uuid,
  DATE '2026-07-12',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000010'::uuid,
  DATE '2026-07-12',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
)
) AS v (
  organization_id,
  employee_id,
  attendance_date,
  check_in_at,
  check_out_at,
  attendance_status,
  work_hours,
  status
)
JOIN hrms.employees e ON e.id = v.employee_id
ON CONFLICT (employee_id, attendance_date) DO UPDATE
SET
  check_in_at = EXCLUDED.check_in_at,
  check_out_at = EXCLUDED.check_out_at,
  attendance_status = EXCLUDED.attendance_status,
  work_hours = EXCLUDED.work_hours,
  status = EXCLUDED.status,
  deleted_at = NULL,
  updated_at = public.utc_now();

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
  v.organization_id,
  e.branch_id,
  v.employee_id,
  v.attendance_date,
  v.check_in_at,
  v.check_out_at,
  v.attendance_status,
  v.work_hours,
  v.status
FROM (
  VALUES
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-07-19',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-07-19',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-07-19',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-07-19',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-07-19',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-07-19',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-07-19',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000009'::uuid,
  DATE '2026-07-19',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000010'::uuid,
  DATE '2026-07-19',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000001'::uuid,
  DATE '2026-07-26',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000002'::uuid,
  DATE '2026-07-26',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000003'::uuid,
  DATE '2026-07-26',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000004'::uuid,
  DATE '2026-07-26',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000005'::uuid,
  DATE '2026-07-26',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000007'::uuid,
  DATE '2026-07-26',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000008'::uuid,
  DATE '2026-07-26',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000009'::uuid,
  DATE '2026-07-26',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
),
(
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'e1000000-0000-4000-8000-000000000010'::uuid,
  DATE '2026-07-26',
  NULL::timestamptz,
  NULL::timestamptz,
  'week_off'::hrms.attendance_status,
  0,
  'active'::hrms.record_status
)
) AS v (
  organization_id,
  employee_id,
  attendance_date,
  check_in_at,
  check_out_at,
  attendance_status,
  work_hours,
  status
)
JOIN hrms.employees e ON e.id = v.employee_id
ON CONFLICT (employee_id, attendance_date) DO UPDATE
SET
  check_in_at = EXCLUDED.check_in_at,
  check_out_at = EXCLUDED.check_out_at,
  attendance_status = EXCLUDED.attendance_status,
  work_hours = EXCLUDED.work_hours,
  status = EXCLUDED.status,
  deleted_at = NULL,
  updated_at = public.utc_now();

