-- =============================================================================
-- Migration: storage_policies_hosted_compat
-- Description: Hosted Supabase-compatible placeholder storage policies
-- Note: All authenticated policies are intentionally restrictive (false)
--       and must be replaced when business modules are implemented.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- employee-documents
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "employee_documents_select_placeholder" ON storage.objects;
CREATE POLICY "employee_documents_select_placeholder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND false
);

DROP POLICY IF EXISTS "employee_documents_insert_placeholder" ON storage.objects;
CREATE POLICY "employee_documents_insert_placeholder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-documents'
  AND false
);

DROP POLICY IF EXISTS "employee_documents_update_placeholder" ON storage.objects;
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

DROP POLICY IF EXISTS "employee_documents_delete_placeholder" ON storage.objects;
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

DROP POLICY IF EXISTS "employee_profile_images_select_placeholder" ON storage.objects;
CREATE POLICY "employee_profile_images_select_placeholder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-profile-images'
  AND false
);

DROP POLICY IF EXISTS "employee_profile_images_insert_placeholder" ON storage.objects;
CREATE POLICY "employee_profile_images_insert_placeholder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-profile-images'
  AND false
);

DROP POLICY IF EXISTS "employee_profile_images_update_placeholder" ON storage.objects;
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

DROP POLICY IF EXISTS "employee_profile_images_delete_placeholder" ON storage.objects;
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

DROP POLICY IF EXISTS "company_assets_select_placeholder" ON storage.objects;
CREATE POLICY "company_assets_select_placeholder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND false
);

DROP POLICY IF EXISTS "company_assets_insert_placeholder" ON storage.objects;
CREATE POLICY "company_assets_insert_placeholder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-assets'
  AND false
);

DROP POLICY IF EXISTS "company_assets_update_placeholder" ON storage.objects;
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

DROP POLICY IF EXISTS "company_assets_delete_placeholder" ON storage.objects;
CREATE POLICY "company_assets_delete_placeholder"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND false
);
