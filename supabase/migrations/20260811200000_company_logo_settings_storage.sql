-- Allow company settings editors to upload organization branding assets.

DROP POLICY IF EXISTS "company_assets_insert_policy" ON storage.objects;
CREATE POLICY "company_assets_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-assets'
  AND (
    hrms.user_has_permission('asset.create')
    OR hrms.user_has_permission('asset.edit')
    OR hrms.user_has_permission('settings.edit')
  )
  AND hrms.storage_object_in_user_org(name)
);

DROP POLICY IF EXISTS "company_assets_update_policy" ON storage.objects;
CREATE POLICY "company_assets_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND (
    hrms.user_has_permission('asset.edit')
    OR hrms.user_has_permission('settings.edit')
  )
  AND hrms.storage_object_in_user_org(name)
)
WITH CHECK (
  bucket_id = 'company-assets'
  AND (
    hrms.user_has_permission('asset.edit')
    OR hrms.user_has_permission('settings.edit')
  )
  AND hrms.storage_object_in_user_org(name)
);

DROP POLICY IF EXISTS "company_assets_delete_policy" ON storage.objects;
CREATE POLICY "company_assets_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND (
    hrms.user_has_permission('asset.delete')
    OR hrms.user_has_permission('asset.edit')
    OR hrms.user_has_permission('settings.edit')
  )
  AND hrms.storage_object_in_user_org(name)
);
