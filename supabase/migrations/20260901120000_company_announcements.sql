-- Company announcements with versioned acknowledgements.
-- Separate from hrms.dashboard_announcements (celebrations carousel).

DO $$ BEGIN
  CREATE TYPE hrms.company_announcement_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.company_announcement_category AS ENUM (
    'general', 'hr', 'policy', 'payroll', 'compliance', 'holiday', 'important'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.company_announcement_priority AS ENUM ('normal', 'important', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.company_announcement_audience AS ENUM (
    'all_employees', 'department', 'employees'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS hrms.company_announcements (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  status hrms.company_announcement_status NOT NULL DEFAULT 'draft',
  current_version_id uuid,
  requires_acknowledgement boolean NOT NULL DEFAULT false,
  audience_type hrms.company_announcement_audience NOT NULL DEFAULT 'all_employees',
  publish_at date,
  expires_at date,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS hrms.company_announcement_versions (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  announcement_id uuid NOT NULL REFERENCES hrms.company_announcements (id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  title text NOT NULL,
  short_description text,
  content text NOT NULL,
  category hrms.company_announcement_category NOT NULL DEFAULT 'general',
  priority hrms.company_announcement_priority NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT company_announcement_versions_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT company_announcement_versions_content_not_empty CHECK (length(trim(content)) > 0),
  CONSTRAINT company_announcement_versions_unique UNIQUE (announcement_id, version_number)
);

DO $$ BEGIN
  ALTER TABLE hrms.company_announcements
    ADD CONSTRAINT company_announcements_current_version_fkey
    FOREIGN KEY (current_version_id)
    REFERENCES hrms.company_announcement_versions (id)
    ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS hrms.company_announcement_targets (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  announcement_id uuid NOT NULL REFERENCES hrms.company_announcements (id) ON DELETE CASCADE,
  department_id uuid REFERENCES hrms.departments (id) ON DELETE CASCADE,
  employee_id uuid REFERENCES hrms.employees (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  CONSTRAINT company_announcement_targets_subject CHECK (
    (department_id IS NOT NULL AND employee_id IS NULL)
    OR (department_id IS NULL AND employee_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS hrms.company_announcement_attachments (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  announcement_id uuid NOT NULL REFERENCES hrms.company_announcements (id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES hrms.company_announcement_versions (id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  file_size integer,
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS hrms.company_announcement_acknowledgements (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  announcement_id uuid NOT NULL REFERENCES hrms.company_announcements (id) ON DELETE RESTRICT,
  version_id uuid NOT NULL REFERENCES hrms.company_announcement_versions (id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  employee_name_snapshot text NOT NULL,
  employee_email_snapshot text,
  employee_code_snapshot text,
  announcement_published_at timestamptz,
  acknowledged_at timestamptz NOT NULL DEFAULT public.utc_now(),
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  CONSTRAINT company_announcement_ack_unique UNIQUE (announcement_id, version_id, employee_id)
);

CREATE INDEX IF NOT EXISTS company_announcements_org_idx
  ON hrms.company_announcements (organization_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS company_announcements_published_idx
  ON hrms.company_announcements (organization_id, status, requires_acknowledgement)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS company_announcement_versions_announcement_idx
  ON hrms.company_announcement_versions (announcement_id, version_number DESC);

CREATE INDEX IF NOT EXISTS company_announcement_targets_announcement_idx
  ON hrms.company_announcement_targets (announcement_id);

CREATE INDEX IF NOT EXISTS company_announcement_targets_employee_idx
  ON hrms.company_announcement_targets (employee_id);

CREATE INDEX IF NOT EXISTS company_announcement_targets_department_idx
  ON hrms.company_announcement_targets (department_id);

CREATE INDEX IF NOT EXISTS company_announcement_attachments_version_idx
  ON hrms.company_announcement_attachments (version_id);

CREATE INDEX IF NOT EXISTS company_announcement_acks_employee_idx
  ON hrms.company_announcement_acknowledgements (employee_id, announcement_id);

CREATE INDEX IF NOT EXISTS company_announcement_acks_announcement_idx
  ON hrms.company_announcement_acknowledgements (announcement_id, version_id);

SELECT public.attach_updated_at_trigger('hrms.company_announcements'::regclass);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE hrms.company_announcements TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE hrms.company_announcement_versions TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE hrms.company_announcement_targets TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE hrms.company_announcement_attachments TO authenticated, service_role;
GRANT SELECT, INSERT ON TABLE hrms.company_announcement_acknowledgements TO authenticated, service_role;

CREATE OR REPLACE FUNCTION hrms.company_announcement_is_visible_to_me(p_announcement_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM hrms.company_announcements a
    WHERE a.id = p_announcement_id
      AND a.deleted_at IS NULL
      AND a.status = 'published'
      AND (a.publish_at IS NULL OR a.publish_at <= (timezone('utc', now()))::date)
      AND (a.expires_at IS NULL OR a.expires_at >= (timezone('utc', now()))::date)
      AND a.organization_id IN (SELECT hrms.current_user_organization_ids())
      AND (
        a.audience_type = 'all_employees'
        OR (
          a.audience_type = 'department'
          AND EXISTS (
            SELECT 1
            FROM hrms.company_announcement_targets t
            INNER JOIN hrms.employees e ON e.id = hrms.current_user_employee_id()
            WHERE t.announcement_id = a.id
              AND t.department_id IS NOT NULL
              AND t.department_id = e.department_id
          )
        )
        OR (
          a.audience_type = 'employees'
          AND EXISTS (
            SELECT 1
            FROM hrms.company_announcement_targets t
            WHERE t.announcement_id = a.id
              AND t.employee_id = hrms.current_user_employee_id()
          )
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION hrms.company_announcement_is_visible_to_me(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION hrms.user_can_manage_company_announcements()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT
    hrms.user_has_permission('company_announcement.manage')
    OR hrms.user_has_permission('portal.ceo.access')
    OR hrms.user_has_permission('portal.hr.access');
$$;

GRANT EXECUTE ON FUNCTION hrms.user_can_manage_company_announcements() TO authenticated, service_role;

ALTER TABLE hrms.company_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.company_announcement_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.company_announcement_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.company_announcement_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.company_announcement_acknowledgements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_announcements_select_policy ON hrms.company_announcements;
CREATE POLICY company_announcements_select_policy
  ON hrms.company_announcements
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND deleted_at IS NULL
    AND (
      hrms.user_can_manage_company_announcements()
      OR hrms.user_has_permission('organization.view')
      OR hrms.company_announcement_is_visible_to_me(id)
    )
  );

DROP POLICY IF EXISTS company_announcements_insert_policy ON hrms.company_announcements;
CREATE POLICY company_announcements_insert_policy
  ON hrms.company_announcements
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND hrms.user_can_manage_company_announcements()
  );

DROP POLICY IF EXISTS company_announcements_update_policy ON hrms.company_announcements;
CREATE POLICY company_announcements_update_policy
  ON hrms.company_announcements
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND hrms.user_can_manage_company_announcements()
  )
  WITH CHECK (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND hrms.user_can_manage_company_announcements()
  );

DROP POLICY IF EXISTS company_announcement_versions_select_policy ON hrms.company_announcement_versions;
CREATE POLICY company_announcement_versions_select_policy
  ON hrms.company_announcement_versions
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND (
      hrms.user_can_manage_company_announcements()
      OR hrms.user_has_permission('organization.view')
      OR hrms.company_announcement_is_visible_to_me(announcement_id)
    )
  );

DROP POLICY IF EXISTS company_announcement_versions_write_policy ON hrms.company_announcement_versions;
CREATE POLICY company_announcement_versions_write_policy
  ON hrms.company_announcement_versions
  FOR ALL TO authenticated
  USING (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND hrms.user_can_manage_company_announcements()
  )
  WITH CHECK (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND hrms.user_can_manage_company_announcements()
  );

DROP POLICY IF EXISTS company_announcement_targets_select_policy ON hrms.company_announcement_targets;
CREATE POLICY company_announcement_targets_select_policy
  ON hrms.company_announcement_targets
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND (
      hrms.user_can_manage_company_announcements()
      OR hrms.user_has_permission('organization.view')
      OR hrms.company_announcement_is_visible_to_me(announcement_id)
    )
  );

DROP POLICY IF EXISTS company_announcement_targets_write_policy ON hrms.company_announcement_targets;
CREATE POLICY company_announcement_targets_write_policy
  ON hrms.company_announcement_targets
  FOR ALL TO authenticated
  USING (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND hrms.user_can_manage_company_announcements()
  )
  WITH CHECK (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND hrms.user_can_manage_company_announcements()
  );

DROP POLICY IF EXISTS company_announcement_attachments_select_policy ON hrms.company_announcement_attachments;
CREATE POLICY company_announcement_attachments_select_policy
  ON hrms.company_announcement_attachments
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND (
      hrms.user_can_manage_company_announcements()
      OR hrms.user_has_permission('organization.view')
      OR hrms.company_announcement_is_visible_to_me(announcement_id)
    )
  );

DROP POLICY IF EXISTS company_announcement_attachments_write_policy ON hrms.company_announcement_attachments;
CREATE POLICY company_announcement_attachments_write_policy
  ON hrms.company_announcement_attachments
  FOR ALL TO authenticated
  USING (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND hrms.user_can_manage_company_announcements()
  )
  WITH CHECK (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND hrms.user_can_manage_company_announcements()
  );

DROP POLICY IF EXISTS company_announcement_acks_select_policy ON hrms.company_announcement_acknowledgements;
CREATE POLICY company_announcement_acks_select_policy
  ON hrms.company_announcement_acknowledgements
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND (
      hrms.user_can_manage_company_announcements()
      OR hrms.user_has_permission('organization.view')
      OR employee_id = hrms.current_user_employee_id()
    )
  );

DROP POLICY IF EXISTS company_announcement_acks_insert_policy ON hrms.company_announcement_acknowledgements;
CREATE POLICY company_announcement_acks_insert_policy
  ON hrms.company_announcement_acknowledgements
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND employee_id = hrms.current_user_employee_id()
    AND hrms.company_announcement_is_visible_to_me(announcement_id)
  );

INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT v.code, v.module, v.action, v.resource, v.description, v.status::hrms.record_status
FROM (VALUES
  (
    'company_announcement.manage',
    'organization',
    'manage',
    'company_announcement',
    'Create, publish, edit, archive, and track company announcements',
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
  AND p.code = 'company_announcement.manage'
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  );

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
    OR hrms.user_can_manage_company_announcements()
    OR name LIKE '%/announcements/%'
    OR name LIKE '%/company-announcements/%'
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
    OR hrms.user_can_manage_company_announcements()
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
    OR hrms.user_can_manage_company_announcements()
  )
)
WITH CHECK (
  bucket_id = 'company-assets'
  AND hrms.storage_object_in_user_org(name)
  AND (
    hrms.user_has_permission('asset.edit')
    OR hrms.user_has_permission('settings.edit')
    OR hrms.user_has_permission('dashboard_announcement.manage')
    OR hrms.user_can_manage_company_announcements()
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
    OR hrms.user_can_manage_company_announcements()
  )
);
