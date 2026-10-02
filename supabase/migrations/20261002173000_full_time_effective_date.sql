-- Full-time CL/EL accrual starts on this date.
-- date_of_joining stays the original employment joining date.

ALTER TABLE hrms.employees
  ADD COLUMN IF NOT EXISTS full_time_effective_date date;

COMMENT ON COLUMN hrms.employees.full_time_effective_date IS
  'Date confirmed full-time leave accrual starts. Null falls back to date_of_joining. Never replaces date_of_joining.';
