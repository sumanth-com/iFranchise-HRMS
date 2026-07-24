-- =============================================================================
-- Migration: security_hardening
-- Description: Restrict IAM RPC self-access, tighten IAM RLS, scope storage paths
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: storage object must live under one of the user's organizations
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hrms.storage_object_in_user_org(p_object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT
    p_object_name IS NOT NULL
    AND p_object_name NOT LIKE '/%'
    AND p_object_name NOT LIKE '%..%'
    AND EXISTS (
      SELECT 1
      FROM hrms.current_user_organization_ids() org_id
      WHERE p_object_name LIKE org_id::text || '/%'
    );
$$;

COMMENT ON FUNCTION hrms.storage_object_in_user_org(text) IS
  'True when a storage object path is prefixed by an organization the caller belongs to.';

GRANT EXECUTE ON FUNCTION hrms.storage_object_in_user_org(text) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- IAM RPCs: callers may only resolve their own account (service role exempt)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hrms.get_user_permission_codes(p_user_id uuid)
RETURNS SETOF text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id AND NOT public.is_service_role() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT p.code
  FROM hrms.user_role_ids_with_ancestors(p_user_id) AS resolved_role_id
  INNER JOIN hrms.role_permissions rp ON rp.role_id = resolved_role_id
  INNER JOIN hrms.permissions p ON p.id = rp.permission_id
  WHERE rp.deleted_at IS NULL
    AND rp.status = 'active'::hrms.record_status
    AND p.deleted_at IS NULL
    AND p.status = 'active'::hrms.record_status;
END;
$$;

CREATE OR REPLACE FUNCTION hrms.get_user_portal_route(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
DECLARE
  route text;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id AND NOT public.is_service_role() THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    (
      SELECT r.portal_route
      FROM hrms.user_roles ur
      INNER JOIN hrms.roles r ON r.id = ur.role_id
      WHERE ur.user_id = p_user_id
        AND ur.deleted_at IS NULL
        AND ur.status = 'active'::hrms.record_status
        AND r.deleted_at IS NULL
        AND r.status = 'active'::hrms.record_status
        AND r.portal_route IS NOT NULL
      ORDER BY CASE r.portal_key
        WHEN 'hr' THEN 1
        WHEN 'ceo' THEN 2
        WHEN 'manager' THEN 3
        WHEN 'employee' THEN 4
        ELSE 5
      END
      LIMIT 1
    ),
    '/employee'
  )
  INTO route;

  RETURN route;
END;
$$;

CREATE OR REPLACE FUNCTION hrms.user_account_allows_portal_access(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id AND NOT public.is_service_role() THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM hrms.employees e
    WHERE e.user_id = p_user_id
      AND e.deleted_at IS NULL
      AND e.status = 'active'::hrms.record_status
      AND e.account_status::text IN (
        'active',
        'invited',
        'invitation_pending',
        'invitation_accepted'
      )
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- IAM tables: mutations require explicit security permissions
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS roles_insert_policy ON hrms.roles;
CREATE POLICY roles_insert_policy ON hrms.roles
  FOR INSERT TO authenticated
  WITH CHECK (
    hrms.user_belongs_to_organization(organization_id)
    AND (
      hrms.user_has_permission('role.create')
      OR hrms.user_has_permission('role.manage')
      OR hrms.user_has_permission('settings.manage')
    )
  );

DROP POLICY IF EXISTS roles_update_policy ON hrms.roles;
CREATE POLICY roles_update_policy ON hrms.roles
  FOR UPDATE TO authenticated
  USING (
    hrms.user_belongs_to_organization(organization_id)
    AND (
      hrms.user_has_permission('role.edit')
      OR hrms.user_has_permission('role.manage')
      OR hrms.user_has_permission('settings.manage')
    )
  )
  WITH CHECK (
    hrms.user_belongs_to_organization(organization_id)
    AND (
      hrms.user_has_permission('role.edit')
      OR hrms.user_has_permission('role.manage')
      OR hrms.user_has_permission('settings.manage')
    )
  );

DROP POLICY IF EXISTS role_permissions_insert_policy ON hrms.role_permissions;
CREATE POLICY role_permissions_insert_policy ON hrms.role_permissions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hrms.roles r
      WHERE r.id = role_permissions.role_id
        AND hrms.user_belongs_to_organization(r.organization_id)
    )
    AND (
      hrms.user_has_permission('permission.assign')
      OR hrms.user_has_permission('role.manage')
      OR hrms.user_has_permission('settings.manage')
    )
  );

DROP POLICY IF EXISTS role_permissions_update_policy ON hrms.role_permissions;
CREATE POLICY role_permissions_update_policy ON hrms.role_permissions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hrms.roles r
      WHERE r.id = role_permissions.role_id
        AND hrms.user_belongs_to_organization(r.organization_id)
    )
    AND (
      hrms.user_has_permission('permission.assign')
      OR hrms.user_has_permission('role.manage')
      OR hrms.user_has_permission('settings.manage')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hrms.roles r
      WHERE r.id = role_permissions.role_id
        AND hrms.user_belongs_to_organization(r.organization_id)
    )
    AND (
      hrms.user_has_permission('permission.assign')
      OR hrms.user_has_permission('role.manage')
      OR hrms.user_has_permission('settings.manage')
    )
  );

DROP POLICY IF EXISTS user_roles_insert_policy ON hrms.user_roles;
CREATE POLICY user_roles_insert_policy ON hrms.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    hrms.user_belongs_to_organization(organization_id)
    AND (
      hrms.user_has_permission('user_role.assign')
      OR hrms.user_has_permission('role.manage')
      OR hrms.user_has_permission('settings.manage')
    )
  );

DROP POLICY IF EXISTS user_roles_update_policy ON hrms.user_roles;
CREATE POLICY user_roles_update_policy ON hrms.user_roles
  FOR UPDATE TO authenticated
  USING (
    hrms.user_belongs_to_organization(organization_id)
    AND (
      hrms.user_has_permission('user_role.assign')
      OR hrms.user_has_permission('role.manage')
      OR hrms.user_has_permission('settings.manage')
    )
  )
  WITH CHECK (
    hrms.user_belongs_to_organization(organization_id)
    AND (
      hrms.user_has_permission('user_role.assign')
      OR hrms.user_has_permission('role.manage')
      OR hrms.user_has_permission('settings.manage')
    )
  );

-- -----------------------------------------------------------------------------
-- Storage: enforce organization path prefix on authenticated access
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "employee_documents_select_policy" ON storage.objects;
CREATE POLICY "employee_documents_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND hrms.user_has_permission('documents.view')
  AND hrms.storage_object_in_user_org(name)
);

DROP POLICY IF EXISTS "employee_documents_insert_policy" ON storage.objects;
CREATE POLICY "employee_documents_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-documents'
  AND hrms.user_has_permission('documents.upload')
  AND hrms.storage_object_in_user_org(name)
);

DROP POLICY IF EXISTS "employee_documents_update_policy" ON storage.objects;
CREATE POLICY "employee_documents_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND hrms.user_has_permission('documents.upload')
  AND hrms.storage_object_in_user_org(name)
)
WITH CHECK (
  bucket_id = 'employee-documents'
  AND hrms.user_has_permission('documents.upload')
  AND hrms.storage_object_in_user_org(name)
);

DROP POLICY IF EXISTS "employee_documents_delete_policy" ON storage.objects;
CREATE POLICY "employee_documents_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND hrms.user_has_permission('documents.delete')
  AND hrms.storage_object_in_user_org(name)
);

DROP POLICY IF EXISTS "employee_profile_images_select_policy" ON storage.objects;
CREATE POLICY "employee_profile_images_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-profile-images'
  AND hrms.user_has_permission('employee_profile.view')
  AND hrms.storage_object_in_user_org(name)
);

DROP POLICY IF EXISTS "employee_profile_images_insert_policy" ON storage.objects;
CREATE POLICY "employee_profile_images_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-profile-images'
  AND hrms.user_has_permission('employee_profile.edit')
  AND hrms.storage_object_in_user_org(name)
);

DROP POLICY IF EXISTS "employee_profile_images_update_policy" ON storage.objects;
CREATE POLICY "employee_profile_images_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'employee-profile-images'
  AND hrms.user_has_permission('employee_profile.edit')
  AND hrms.storage_object_in_user_org(name)
)
WITH CHECK (
  bucket_id = 'employee-profile-images'
  AND hrms.user_has_permission('employee_profile.edit')
  AND hrms.storage_object_in_user_org(name)
);

DROP POLICY IF EXISTS "employee_profile_images_delete_policy" ON storage.objects;
CREATE POLICY "employee_profile_images_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'employee-profile-images'
  AND hrms.user_has_permission('employee_profile.edit')
  AND hrms.storage_object_in_user_org(name)
);

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
  AND hrms.storage_object_in_user_org(name)
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
  AND hrms.storage_object_in_user_org(name)
);

DROP POLICY IF EXISTS "company_assets_update_policy" ON storage.objects;
CREATE POLICY "company_assets_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND hrms.user_has_permission('asset.edit')
  AND hrms.storage_object_in_user_org(name)
)
WITH CHECK (
  bucket_id = 'company-assets'
  AND hrms.user_has_permission('asset.edit')
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
  )
  AND hrms.storage_object_in_user_org(name)
);
