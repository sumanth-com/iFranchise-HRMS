-- Link designations to employment types (replaces level in organization UI)

ALTER TABLE hrms.designations
  ADD COLUMN IF NOT EXISTS employment_type_id uuid REFERENCES hrms.employment_types (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS designations_employment_type_id_idx
  ON hrms.designations (employment_type_id);
