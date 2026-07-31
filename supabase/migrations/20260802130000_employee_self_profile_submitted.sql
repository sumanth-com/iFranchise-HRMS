-- Track one-time employee self-service profile submission (further edits require HR).

ALTER TABLE hrms.employee_profiles
  ADD COLUMN IF NOT EXISTS self_profile_submitted_at timestamptz;

COMMENT ON COLUMN hrms.employee_profiles.self_profile_submitted_at IS
  'When the employee completed their one-time self-service profile update. NULL = not yet submitted.';
