-- Allow authenticated users with asset permissions to use company-assets bucket
-- for asset images (path: {orgId}/assets/...)

DROP POLICY IF EXISTS "company_assets_select_placeholder" ON storage.objects;
DROP POLICY IF EXISTS "company_assets_insert_placeholder" ON storage.objects;
DROP POLICY IF EXISTS "company_assets_update_placeholder" ON storage.objects;
DROP POLICY IF EXISTS "company_assets_delete_placeholder" ON storage.objects;

DROP POLICY IF EXISTS "company_assets_select_policy" ON storage.objects;
CREATE POLICY "company_assets_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND (
    hrms.user_has_permission('asset.view')
    OR hrms.user_has_permission('settings.view')
  )
);

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
  )
);

DROP POLICY IF EXISTS "company_assets_update_policy" ON storage.objects;
CREATE POLICY "company_assets_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND hrms.user_has_permission('asset.edit')
)
WITH CHECK (
  bucket_id = 'company-assets'
  AND hrms.user_has_permission('asset.edit')
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
  )
);
