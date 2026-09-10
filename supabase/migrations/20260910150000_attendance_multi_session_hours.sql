-- Accumulate completed session seconds for multi-session working-hours totals.
ALTER TABLE hrms.attendance
  ADD COLUMN IF NOT EXISTS prior_work_seconds integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN hrms.attendance.prior_work_seconds IS
  'Completed working seconds from earlier check-in/out sessions today before the current open session.';
