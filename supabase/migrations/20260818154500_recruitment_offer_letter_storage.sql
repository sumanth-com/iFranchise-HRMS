-- Allow recruitment offer letters under {orgId}/recruitment/offers/...
-- and let users with recruitment.offer upload/read those files.

DROP POLICY IF EXISTS "employee_documents_insert_policy" ON storage.objects;
CREATE POLICY "employee_documents_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-documents'
  AND hrms.storage_object_in_user_org(name)
  AND (
    hrms.user_has_permission('documents.upload')
    OR (
      hrms.user_has_permission('recruitment.offer')
      AND name LIKE '%/recruitment/offers/%'
    )
  )
);

DROP POLICY IF EXISTS "employee_documents_update_policy" ON storage.objects;
CREATE POLICY "employee_documents_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND hrms.storage_object_in_user_org(name)
  AND (
    hrms.user_has_permission('documents.upload')
    OR (
      hrms.user_has_permission('recruitment.offer')
      AND name LIKE '%/recruitment/offers/%'
    )
  )
)
WITH CHECK (
  bucket_id = 'employee-documents'
  AND hrms.storage_object_in_user_org(name)
  AND (
    hrms.user_has_permission('documents.upload')
    OR (
      hrms.user_has_permission('recruitment.offer')
      AND name LIKE '%/recruitment/offers/%'
    )
  )
);

DROP POLICY IF EXISTS "employee_documents_select_policy" ON storage.objects;
CREATE POLICY "employee_documents_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND hrms.storage_object_in_user_org(name)
  AND (
    hrms.user_can_read_storage_document(name)
    OR (
      hrms.user_has_permission('recruitment.offer')
      AND name LIKE '%/recruitment/offers/%'
    )
    OR hrms.user_has_permission('documents.view')
  )
);

NOTIFY pgrst, 'reload schema';
