-- =============================================================================
-- Migration: employee_storage_rls
-- Description: Replace placeholder storage policies with permission-based access
-- =============================================================================

-- employee-documents
DROP POLICY IF EXISTS "employee_documents_select_placeholder" ON storage.objects;
DROP POLICY IF EXISTS "employee_documents_insert_placeholder" ON storage.objects;
DROP POLICY IF EXISTS "employee_documents_update_placeholder" ON storage.objects;
DROP POLICY IF EXISTS "employee_documents_delete_placeholder" ON storage.objects;

CREATE POLICY "employee_documents_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND hrms.user_has_permission('documents.view')
);

CREATE POLICY "employee_documents_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-documents'
  AND hrms.user_has_permission('documents.upload')
);

CREATE POLICY "employee_documents_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND hrms.user_has_permission('documents.upload')
)
WITH CHECK (
  bucket_id = 'employee-documents'
  AND hrms.user_has_permission('documents.upload')
);

CREATE POLICY "employee_documents_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND hrms.user_has_permission('documents.delete')
);

-- employee-profile-images
DROP POLICY IF EXISTS "employee_profile_images_select_placeholder" ON storage.objects;
DROP POLICY IF EXISTS "employee_profile_images_insert_placeholder" ON storage.objects;
DROP POLICY IF EXISTS "employee_profile_images_update_placeholder" ON storage.objects;
DROP POLICY IF EXISTS "employee_profile_images_delete_placeholder" ON storage.objects;

CREATE POLICY "employee_profile_images_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-profile-images'
  AND hrms.user_has_permission('employee_profile.view')
);

CREATE POLICY "employee_profile_images_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-profile-images'
  AND hrms.user_has_permission('employee_profile.edit')
);

CREATE POLICY "employee_profile_images_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'employee-profile-images'
  AND hrms.user_has_permission('employee_profile.edit')
)
WITH CHECK (
  bucket_id = 'employee-profile-images'
  AND hrms.user_has_permission('employee_profile.edit')
);

CREATE POLICY "employee_profile_images_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'employee-profile-images'
  AND hrms.user_has_permission('employee_profile.edit')
);
