-- Align storage bucket limits with app upload policy:
-- profile images up to 10 MB, employee documents up to 30 MB (bucket allows 50 MB).

UPDATE storage.buckets
SET file_size_limit = 10485760
WHERE id = 'employee-profile-images';

-- Bump org document settings default where still below 30 MB (does not lower higher values).
UPDATE hrms.organization_settings
SET settings = jsonb_set(
  settings,
  '{documents,maxUploadSizeMb}',
  to_jsonb(
  GREATEST(
    COALESCE((settings->'documents'->>'maxUploadSizeMb')::int, 30),
    30
  )
  ),
  true
)
WHERE deleted_at IS NULL
  AND COALESCE((settings->'documents'->>'maxUploadSizeMb')::int, 0) < 30;
