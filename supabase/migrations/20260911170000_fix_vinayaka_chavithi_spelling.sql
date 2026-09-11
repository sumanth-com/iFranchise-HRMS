-- Correct misspelled holiday display name (Vinavaka → Vinayaka).
UPDATE hrms.holidays
SET
  name = regexp_replace(name, 'Vinavaka', 'Vinayaka', 'gi'),
  updated_at = now()
WHERE deleted_at IS NULL
  AND name ILIKE '%vinavaka%';
