-- Allow system backup exports (JSON/CSV) in the employee-documents bucket.
-- Backups are stored under {orgId}/system-backups/...

UPDATE storage.buckets
SET
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/json',
    'text/csv',
    'text/plain'
  ],
  -- Full-system backups can exceed the general 10 MB document limit.
  file_size_limit = GREATEST(COALESCE(file_size_limit, 0), 52428800)
WHERE id = 'employee-documents';
