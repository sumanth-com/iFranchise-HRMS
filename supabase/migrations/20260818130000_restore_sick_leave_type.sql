-- Restore Sick Leave so employees can select CL, SL, EL, OH, and PL.

UPDATE hrms.leave_types
SET
  status = 'active',
  deleted_at = NULL,
  name = 'Sick Leave',
  description = 'Medical leave',
  days_per_year = CASE WHEN days_per_year > 0 THEN days_per_year ELSE 6 END,
  updated_at = public.utc_now()
WHERE code = 'SL';
