-- Fix attendance check-in/check-out to India office hours (10:00 AM – 7:00 PM IST)

UPDATE hrms.attendance
SET
  check_in_at = ((attendance_date + time '10:00:00') AT TIME ZONE 'Asia/Kolkata'),
  check_out_at = ((attendance_date + time '19:00:00') AT TIME ZONE 'Asia/Kolkata'),
  work_hours = 9
WHERE deleted_at IS NULL
  AND check_in_at IS NOT NULL
  AND check_out_at IS NOT NULL;
