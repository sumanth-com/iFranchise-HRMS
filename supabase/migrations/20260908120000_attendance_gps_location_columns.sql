-- =============================================================================
-- Additive GPS location columns for attendance punch viewing.
-- Does not change status, work hours, or punch RPC calculation logic.
-- =============================================================================

ALTER TABLE hrms.attendance
  ADD COLUMN IF NOT EXISTS check_in_latitude double precision,
  ADD COLUMN IF NOT EXISTS check_in_longitude double precision,
  ADD COLUMN IF NOT EXISTS check_in_accuracy_m double precision,
  ADD COLUMN IF NOT EXISTS check_in_address text,
  ADD COLUMN IF NOT EXISTS check_in_location_at timestamptz,
  ADD COLUMN IF NOT EXISTS check_out_latitude double precision,
  ADD COLUMN IF NOT EXISTS check_out_longitude double precision,
  ADD COLUMN IF NOT EXISTS check_out_accuracy_m double precision,
  ADD COLUMN IF NOT EXISTS check_out_address text,
  ADD COLUMN IF NOT EXISTS check_out_location_at timestamptz;

ALTER TABLE hrms.attendance
  DROP CONSTRAINT IF EXISTS attendance_check_in_latitude_range,
  DROP CONSTRAINT IF EXISTS attendance_check_in_longitude_range,
  DROP CONSTRAINT IF EXISTS attendance_check_out_latitude_range,
  DROP CONSTRAINT IF EXISTS attendance_check_out_longitude_range,
  DROP CONSTRAINT IF EXISTS attendance_check_in_accuracy_nonneg,
  DROP CONSTRAINT IF EXISTS attendance_check_out_accuracy_nonneg;

ALTER TABLE hrms.attendance
  ADD CONSTRAINT attendance_check_in_latitude_range
    CHECK (check_in_latitude IS NULL OR (check_in_latitude >= -90 AND check_in_latitude <= 90)),
  ADD CONSTRAINT attendance_check_in_longitude_range
    CHECK (check_in_longitude IS NULL OR (check_in_longitude >= -180 AND check_in_longitude <= 180)),
  ADD CONSTRAINT attendance_check_out_latitude_range
    CHECK (check_out_latitude IS NULL OR (check_out_latitude >= -90 AND check_out_latitude <= 90)),
  ADD CONSTRAINT attendance_check_out_longitude_range
    CHECK (check_out_longitude IS NULL OR (check_out_longitude >= -180 AND check_out_longitude <= 180)),
  ADD CONSTRAINT attendance_check_in_accuracy_nonneg
    CHECK (check_in_accuracy_m IS NULL OR check_in_accuracy_m >= 0),
  ADD CONSTRAINT attendance_check_out_accuracy_nonneg
    CHECK (check_out_accuracy_m IS NULL OR check_out_accuracy_m >= 0);

COMMENT ON COLUMN hrms.attendance.check_in_latitude IS
  'Optional GPS latitude captured at check-in (additive; unused by status/hours logic).';
COMMENT ON COLUMN hrms.attendance.check_in_longitude IS
  'Optional GPS longitude captured at check-in (additive; unused by status/hours logic).';
COMMENT ON COLUMN hrms.attendance.check_out_latitude IS
  'Optional GPS latitude captured at check-out (additive; unused by status/hours logic).';
COMMENT ON COLUMN hrms.attendance.check_out_longitude IS
  'Optional GPS longitude captured at check-out (additive; unused by status/hours logic).';
