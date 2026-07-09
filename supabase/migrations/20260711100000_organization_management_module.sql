-- =============================================================================
-- Migration: organization_management_module
-- Description: Organization Management module schema extensions
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE hrms.holiday_type AS ENUM ('national', 'state', 'company');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- organizations — extended profile fields
-- -----------------------------------------------------------------------------

ALTER TABLE hrms.organizations
  ADD COLUMN IF NOT EXISTS gst_number text,
  ADD COLUMN IF NOT EXISTS pan_number text,
  ADD COLUMN IF NOT EXISTS cin text,
  ADD COLUMN IF NOT EXISTS registered_address_line1 text,
  ADD COLUMN IF NOT EXISTS registered_address_line2 text,
  ADD COLUMN IF NOT EXISTS registered_city text,
  ADD COLUMN IF NOT EXISTS registered_state text,
  ADD COLUMN IF NOT EXISTS registered_country text DEFAULT 'IN',
  ADD COLUMN IF NOT EXISTS registered_postal_code text,
  ADD COLUMN IF NOT EXISTS corporate_address_line1 text,
  ADD COLUMN IF NOT EXISTS corporate_address_line2 text,
  ADD COLUMN IF NOT EXISTS corporate_city text,
  ADD COLUMN IF NOT EXISTS corporate_state text,
  ADD COLUMN IF NOT EXISTS corporate_country text DEFAULT 'IN',
  ADD COLUMN IF NOT EXISTS corporate_postal_code text;

-- -----------------------------------------------------------------------------
-- branches — branch head & location
-- -----------------------------------------------------------------------------

ALTER TABLE hrms.branches
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS branch_head_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS branches_branch_head_id_idx ON hrms.branches (branch_head_id);

-- -----------------------------------------------------------------------------
-- departments — department head & unique name
-- -----------------------------------------------------------------------------

ALTER TABLE hrms.departments
  ADD COLUMN IF NOT EXISTS department_head_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS departments_department_head_id_idx ON hrms.departments (department_head_id);

CREATE UNIQUE INDEX IF NOT EXISTS departments_org_name_active_idx
  ON hrms.departments (organization_id, lower(trim(name)))
  WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- designations — department link & unique title
-- -----------------------------------------------------------------------------

ALTER TABLE hrms.designations
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES hrms.departments (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS designations_department_id_idx ON hrms.designations (department_id);

CREATE UNIQUE INDEX IF NOT EXISTS designations_org_title_active_idx
  ON hrms.designations (organization_id, lower(trim(title)))
  WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- holidays — extended fields
-- -----------------------------------------------------------------------------

ALTER TABLE hrms.holidays
  ADD COLUMN IF NOT EXISTS holiday_type hrms.holiday_type NOT NULL DEFAULT 'company',
  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurring_month smallint CHECK (recurring_month IS NULL OR recurring_month BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS recurring_day smallint CHECK (recurring_day IS NULL OR recurring_day BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS applicable_department_ids uuid[] NOT NULL DEFAULT '{}';

-- -----------------------------------------------------------------------------
-- work_locations
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.work_locations (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  branch_id uuid NOT NULL REFERENCES hrms.branches (id) ON DELETE RESTRICT,
  name text NOT NULL,
  working_days jsonb NOT NULL DEFAULT '["monday","tuesday","wednesday","thursday","friday"]'::jsonb,
  office_start_time time NOT NULL DEFAULT '09:00',
  office_end_time time NOT NULL DEFAULT '18:00',
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT work_locations_name_not_empty CHECK (length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS work_locations_organization_id_idx ON hrms.work_locations (organization_id);
CREATE INDEX IF NOT EXISTS work_locations_branch_id_idx ON hrms.work_locations (branch_id);
CREATE INDEX IF NOT EXISTS work_locations_status_idx ON hrms.work_locations (status);
CREATE INDEX IF NOT EXISTS work_locations_deleted_at_idx ON hrms.work_locations (deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS work_locations_org_name_active_idx
  ON hrms.work_locations (organization_id, lower(trim(name)))
  WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- shift_templates
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.shift_templates (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  break_duration_minutes smallint NOT NULL DEFAULT 60 CHECK (break_duration_minutes >= 0),
  grace_time_minutes smallint NOT NULL DEFAULT 15 CHECK (grace_time_minutes >= 0),
  minimum_hours numeric(4, 2) NOT NULL DEFAULT 8.00 CHECK (minimum_hours > 0),
  half_day_hours numeric(4, 2) NOT NULL DEFAULT 4.00 CHECK (half_day_hours > 0),
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT shift_templates_name_not_empty CHECK (length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS shift_templates_organization_id_idx ON hrms.shift_templates (organization_id);
CREATE INDEX IF NOT EXISTS shift_templates_status_idx ON hrms.shift_templates (status);
CREATE INDEX IF NOT EXISTS shift_templates_deleted_at_idx ON hrms.shift_templates (deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS shift_templates_org_name_active_idx
  ON hrms.shift_templates (organization_id, lower(trim(name)))
  WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

SELECT public.attach_updated_at_trigger('hrms.work_locations'::regclass);
SELECT public.attach_updated_at_trigger('hrms.shift_templates'::regclass);
SELECT public.attach_audit_trigger('hrms.work_locations'::regclass);
SELECT public.attach_audit_trigger('hrms.shift_templates'::regclass);
SELECT public.attach_audit_trigger('hrms.holidays'::regclass);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

ALTER TABLE hrms.work_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.shift_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_locations_select_policy ON hrms.work_locations
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

CREATE POLICY work_locations_insert_policy ON hrms.work_locations
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

CREATE POLICY work_locations_update_policy ON hrms.work_locations
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

CREATE POLICY shift_templates_select_policy ON hrms.shift_templates
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

CREATE POLICY shift_templates_insert_policy ON hrms.shift_templates
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

CREATE POLICY shift_templates_update_policy ON hrms.shift_templates
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

-- -----------------------------------------------------------------------------
-- Permissions
-- -----------------------------------------------------------------------------

INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT v.code, v.module, v.action, v.resource, v.description, v.status::hrms.record_status
FROM (VALUES
  ('organization.create', 'organization', 'create', 'organization', 'Create organization master data', 'active'),
  ('organization.delete', 'organization', 'delete', 'organization', 'Delete organization master data', 'active'),
  ('work_location.view', 'organization', 'view', 'work_location', 'View work locations', 'active'),
  ('work_location.create', 'organization', 'create', 'work_location', 'Create work locations', 'active'),
  ('work_location.edit', 'organization', 'edit', 'work_location', 'Edit work locations', 'active'),
  ('work_location.delete', 'organization', 'delete', 'work_location', 'Delete work locations', 'active'),
  ('shift_template.view', 'organization', 'view', 'shift_template', 'View shift templates', 'active'),
  ('shift_template.create', 'organization', 'create', 'shift_template', 'Create shift templates', 'active'),
  ('shift_template.edit', 'organization', 'edit', 'shift_template', 'Edit shift templates', 'active'),
  ('shift_template.delete', 'organization', 'delete', 'shift_template', 'Delete shift templates', 'active')
) AS v(code, module, action, resource, description, status)
WHERE NOT EXISTS (
  SELECT 1 FROM hrms.permissions p WHERE p.code = v.code AND p.deleted_at IS NULL
);

-- Super Admin gets new permissions
INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT 'a0000000-0000-4000-8000-000000000101'::uuid, p.id, 'active'::hrms.record_status
FROM hrms.permissions p
WHERE p.deleted_at IS NULL
  AND p.code IN (
    'organization.create', 'organization.delete',
    'work_location.view', 'work_location.create', 'work_location.edit', 'work_location.delete',
    'shift_template.view', 'shift_template.create', 'shift_template.edit', 'shift_template.delete'
  )
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp
    WHERE rp.role_id = 'a0000000-0000-4000-8000-000000000101'::uuid
      AND rp.permission_id = p.id AND rp.deleted_at IS NULL
  );

-- HR Admin: view-only for organization master data
UPDATE hrms.role_permissions rp
SET status = 'inactive', updated_at = public.utc_now()
FROM hrms.permissions p
WHERE rp.permission_id = p.id
  AND rp.role_id = 'a0000000-0000-4000-8000-000000000102'::uuid
  AND rp.deleted_at IS NULL
  AND p.code IN (
    'organization.edit', 'branch.create', 'branch.edit', 'branch.delete',
    'department.create', 'department.edit', 'department.delete',
    'designation.create', 'designation.edit', 'designation.delete',
    'employment_type.create', 'employment_type.edit', 'employment_type.delete',
    'holiday.manage'
  );

-- HR Admin: grant view permissions for new resources
INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT 'a0000000-0000-4000-8000-000000000102'::uuid, p.id, 'active'::hrms.record_status
FROM hrms.permissions p
WHERE p.deleted_at IS NULL
  AND p.code IN ('work_location.view', 'shift_template.view')
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp
    WHERE rp.role_id = 'a0000000-0000-4000-8000-000000000102'::uuid
      AND rp.permission_id = p.id AND rp.deleted_at IS NULL
  );

-- -----------------------------------------------------------------------------
-- Seed employment types & shift templates
-- -----------------------------------------------------------------------------

INSERT INTO hrms.employment_types (organization_id, name, code, description, is_full_time, default_hours_per_week, status)
SELECT 'a0000000-0000-4000-8000-000000000001', v.name, v.code, v.description, v.is_full_time, v.hours, 'active'
FROM (VALUES
  ('Part Time', 'PART_TIME', 'Part-time employment', false, 20.00),
  ('Intern', 'INTERN', 'Internship employment', false, 30.00),
  ('Freelancer', 'FREELANCER', 'Freelance engagement', false, 1.00),
  ('Temporary', 'TEMPORARY', 'Temporary employment', false, 40.00)
) AS v(name, code, description, is_full_time, hours)
WHERE NOT EXISTS (
  SELECT 1 FROM hrms.employment_types et
  WHERE et.organization_id = 'a0000000-0000-4000-8000-000000000001'
    AND et.code = v.code AND et.deleted_at IS NULL
);

INSERT INTO hrms.shift_templates (
  organization_id, name, start_time, end_time, break_duration_minutes,
  grace_time_minutes, minimum_hours, half_day_hours, status
)
SELECT 'a0000000-0000-4000-8000-000000000001', v.name, v.start_time::time, v.end_time::time,
  v.break_mins, v.grace_mins, v.min_hours, v.half_hours, 'active'
FROM (VALUES
  ('General Shift', '09:00', '18:00', 60, 15, 8.00, 4.00),
  ('Morning Shift', '06:00', '14:00', 30, 10, 8.00, 4.00),
  ('Evening Shift', '14:00', '22:00', 30, 10, 8.00, 4.00),
  ('Night Shift', '22:00', '06:00', 30, 10, 8.00, 4.00),
  ('Flexible Shift', '10:00', '19:00', 60, 30, 8.00, 4.00)
) AS v(name, start_time, end_time, break_mins, grace_mins, min_hours, half_hours)
WHERE NOT EXISTS (
  SELECT 1 FROM hrms.shift_templates st
  WHERE st.organization_id = 'a0000000-0000-4000-8000-000000000001'
    AND lower(st.name) = lower(v.name) AND st.deleted_at IS NULL
);
