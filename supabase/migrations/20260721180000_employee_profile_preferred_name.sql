-- Preferred display name for employee self-service profile settings

ALTER TABLE hrms.employee_profiles
  ADD COLUMN IF NOT EXISTS preferred_name text;
