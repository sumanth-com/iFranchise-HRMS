-- =============================================================================
-- Migration: storage_policies
-- Description: Placeholder storage policies for HRMS buckets
-- Note: All authenticated policies are intentionally restrictive (false)
--       and must be replaced when business modules are implemented.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- employee-documents
-- -----------------------------------------------------------------------------

CREATE POLICY "employee_documents_select_placeholder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND false
);

CREATE POLICY "employee_documents_insert_placeholder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-documents'
  AND false
);

CREATE POLICY "employee_documents_update_placeholder"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND false
)
WITH CHECK (
  bucket_id = 'employee-documents'
  AND false
);

CREATE POLICY "employee_documents_delete_placeholder"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND false
);

-- -----------------------------------------------------------------------------
-- employee-profile-images
-- -----------------------------------------------------------------------------

CREATE POLICY "employee_profile_images_select_placeholder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-profile-images'
  AND false
);

CREATE POLICY "employee_profile_images_insert_placeholder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-profile-images'
  AND false
);

CREATE POLICY "employee_profile_images_update_placeholder"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'employee-profile-images'
  AND false
)
WITH CHECK (
  bucket_id = 'employee-profile-images'
  AND false
);

CREATE POLICY "employee_profile_images_delete_placeholder"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'employee-profile-images'
  AND false
);

-- -----------------------------------------------------------------------------
-- company-assets
-- -----------------------------------------------------------------------------

CREATE POLICY "company_assets_select_placeholder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND false
);

CREATE POLICY "company_assets_insert_placeholder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-assets'
  AND false
);

CREATE POLICY "company_assets_update_placeholder"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND false
)
WITH CHECK (
  bucket_id = 'company-assets'
  AND false
);

CREATE POLICY "company_assets_delete_placeholder"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND false
);

-- -----------------------------------------------------------------------------
-- Service role bypass (documented for reference — service_role bypasses RLS)
-- -----------------------------------------------------------------------------

COMMENT ON POLICY "employee_documents_select_placeholder" ON storage.objects IS
  'PLACEHOLDER: Replace with employee-scoped document access in HRMS module migration.';

COMMENT ON POLICY "employee_profile_images_select_placeholder" ON storage.objects IS
  'PLACEHOLDER: Replace with profile image access rules in HRMS module migration.';

COMMENT ON POLICY "company_assets_select_placeholder" ON storage.objects IS
  'PLACEHOLDER: Replace with company asset access rules in HRMS module migration.';
