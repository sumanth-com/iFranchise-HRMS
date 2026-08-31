-- Dashboard announcements for Celebrations & This Week carousel.
-- Published announcements are visible to all org members; manage = HR/CEO roles.

DO $$ BEGIN
  CREATE TYPE hrms.dashboard_announcement_priority AS ENUM ('normal', 'important');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS hrms.dashboard_announcements (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  title text NOT NULL,
  message text NOT NULL,
  image_storage_path text,
  icon_key text,
  priority hrms.dashboard_announcement_priority NOT NULL DEFAULT 'normal',
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  published_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT dashboard_announcements_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT dashboard_announcements_message_not_empty CHECK (length(trim(message)) > 0),
  CONSTRAINT dashboard_announcements_title_length CHECK (char_length(trim(title)) <= 120),
  CONSTRAINT dashboard_announcements_message_length CHECK (char_length(trim(message)) <= 500)
);

CREATE INDEX IF NOT EXISTS dashboard_announcements_org_idx
  ON hrms.dashboard_announcements (organization_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS dashboard_announcements_published_idx
  ON hrms.dashboard_announcements (organization_id, is_published, priority, published_at DESC)
  WHERE deleted_at IS NULL AND status = 'active';

ALTER TABLE hrms.dashboard_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dashboard_announcements_select_policy ON hrms.dashboard_announcements;
CREATE POLICY dashboard_announcements_select_policy
  ON hrms.dashboard_announcements
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND deleted_at IS NULL
    AND (
      (is_published = true AND status = 'active')
      OR hrms.user_has_permission('dashboard_announcement.manage')
    )
  );

DROP POLICY IF EXISTS dashboard_announcements_insert_policy ON hrms.dashboard_announcements;
CREATE POLICY dashboard_announcements_insert_policy
  ON hrms.dashboard_announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND hrms.user_has_permission('dashboard_announcement.manage')
  );

DROP POLICY IF EXISTS dashboard_announcements_update_policy ON hrms.dashboard_announcements;
CREATE POLICY dashboard_announcements_update_policy
  ON hrms.dashboard_announcements
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND hrms.user_has_permission('dashboard_announcement.manage')
  )
  WITH CHECK (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND hrms.user_has_permission('dashboard_announcement.manage')
  );

DROP POLICY IF EXISTS dashboard_announcements_delete_policy ON hrms.dashboard_announcements;
CREATE POLICY dashboard_announcements_delete_policy
  ON hrms.dashboard_announcements
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND hrms.user_has_permission('dashboard_announcement.manage')
  );

INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT v.code, v.module, v.action, v.resource, v.description, v.status::hrms.record_status
FROM (VALUES
  (
    'dashboard_announcement.manage',
    'dashboard',
    'manage',
    'dashboard_announcement',
    'Create, edit, publish, and remove dashboard announcements',
    'active'
  )
) AS v(code, module, action, resource, description, status)
WHERE NOT EXISTS (
  SELECT 1 FROM hrms.permissions p WHERE p.code = v.code AND p.deleted_at IS NULL
);

INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'::hrms.record_status
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND r.code IN ('super_admin', 'hr_admin', 'hr_executive', 'ceo', 'founder', 'co_founder')
  AND p.code = 'dashboard_announcement.manage'
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  );

-- Allow announcement images in company-assets for manage permission holders
-- and org-wide read of announcement paths.
DROP POLICY IF EXISTS "company_assets_select_policy" ON storage.objects;
CREATE POLICY "company_assets_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND hrms.storage_object_in_user_org(name)
  AND (
    hrms.user_has_permission('asset.view')
    OR hrms.user_has_permission('settings.view')
    OR hrms.user_has_permission('dashboard_announcement.manage')
    OR name LIKE '%/announcements/%'
  )
);

DROP POLICY IF EXISTS "company_assets_insert_policy" ON storage.objects;
CREATE POLICY "company_assets_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-assets'
  AND hrms.storage_object_in_user_org(name)
  AND (
    hrms.user_has_permission('asset.create')
    OR hrms.user_has_permission('asset.edit')
    OR hrms.user_has_permission('settings.edit')
    OR hrms.user_has_permission('dashboard_announcement.manage')
  )
);

DROP POLICY IF EXISTS "company_assets_update_policy" ON storage.objects;
CREATE POLICY "company_assets_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND hrms.storage_object_in_user_org(name)
  AND (
    hrms.user_has_permission('asset.edit')
    OR hrms.user_has_permission('settings.edit')
    OR hrms.user_has_permission('dashboard_announcement.manage')
  )
)
WITH CHECK (
  bucket_id = 'company-assets'
  AND hrms.storage_object_in_user_org(name)
  AND (
    hrms.user_has_permission('asset.edit')
    OR hrms.user_has_permission('settings.edit')
    OR hrms.user_has_permission('dashboard_announcement.manage')
  )
);

DROP POLICY IF EXISTS "company_assets_delete_policy" ON storage.objects;
CREATE POLICY "company_assets_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND hrms.storage_object_in_user_org(name)
  AND (
    hrms.user_has_permission('asset.delete')
    OR hrms.user_has_permission('asset.edit')
    OR hrms.user_has_permission('settings.edit')
    OR hrms.user_has_permission('dashboard_announcement.manage')
  )
);
