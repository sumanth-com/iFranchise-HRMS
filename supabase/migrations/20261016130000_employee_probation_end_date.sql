-- Per-employee probation end date (source of truth for Probation & Confirmation,
-- profiles, and leave). Does not change date_of_joining.

ALTER TABLE hrms.employees
  ADD COLUMN IF NOT EXISTS probation_end_date date;

COMMENT ON COLUMN hrms.employees.probation_end_date IS
  'Actual probation end date for this employee. Null means unknown; UI must not invent a date from org-wide duration alone when this is set.';

CREATE INDEX IF NOT EXISTS employees_probation_end_date_idx
  ON hrms.employees (organization_id, probation_end_date)
  WHERE deleted_at IS NULL AND probation_end_date IS NOT NULL;
