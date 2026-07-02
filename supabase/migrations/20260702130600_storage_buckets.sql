-- =============================================================================
-- Migration: storage_buckets
-- Description: Create required storage buckets for iFranchise HRMS
-- =============================================================================

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES
  (
    'employee-documents',
    'employee-documents',
    false,
    52428800,
    ARRAY[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/webp'
    ]
  ),
  (
    'employee-profile-images',
    'employee-profile-images',
    false,
    5242880,
    ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp'
    ]
  ),
  (
    'company-assets',
    'company-assets',
    false,
    10485760,
    ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/svg+xml',
      'application/pdf'
    ]
  )
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
