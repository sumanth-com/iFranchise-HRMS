-- Phase 9: Enterprise Asset Management

DO $$ BEGIN
  CREATE TYPE hrms.asset_status AS ENUM (
    'available', 'assigned', 'maintenance', 'lost', 'retired', 'disposed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.asset_assignment_status AS ENUM (
    'active', 'returned', 'transferred', 'lost', 'damaged'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.asset_maintenance_status AS ENUM (
    'pending', 'in_progress', 'completed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.asset_condition AS ENUM (
    'excellent', 'good', 'fair', 'poor', 'damaged'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- Categories
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.asset_categories (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT asset_categories_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT asset_categories_code_not_empty CHECK (length(trim(code)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS asset_categories_org_code_active_idx
  ON hrms.asset_categories (organization_id, code)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS asset_categories_org_idx
  ON hrms.asset_categories (organization_id);

-- -----------------------------------------------------------------------------
-- Vendors
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.asset_vendors (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  notes text,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT asset_vendors_name_not_empty CHECK (length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS asset_vendors_org_idx
  ON hrms.asset_vendors (organization_id);

-- -----------------------------------------------------------------------------
-- Assets
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.assets (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  asset_code text NOT NULL,
  name text NOT NULL,
  category_id uuid REFERENCES hrms.asset_categories (id) ON DELETE SET NULL,
  brand text,
  model text,
  serial_number text,
  purchase_date date,
  purchase_cost numeric(14, 2),
  warranty_expiry date,
  vendor_id uuid REFERENCES hrms.asset_vendors (id) ON DELETE SET NULL,
  asset_status hrms.asset_status NOT NULL DEFAULT 'available',
  office_location text,
  department_id uuid REFERENCES hrms.departments (id) ON DELETE SET NULL,
  image_path text,
  qr_payload text,
  notes text,
  current_assignment_id uuid,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT assets_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT assets_code_not_empty CHECK (length(trim(asset_code)) > 0),
  CONSTRAINT assets_cost_non_negative CHECK (purchase_cost IS NULL OR purchase_cost >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS assets_org_code_active_idx
  ON hrms.assets (organization_id, asset_code)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS assets_org_idx ON hrms.assets (organization_id);
CREATE INDEX IF NOT EXISTS assets_status_idx ON hrms.assets (asset_status);
CREATE INDEX IF NOT EXISTS assets_category_idx ON hrms.assets (category_id);
CREATE INDEX IF NOT EXISTS assets_warranty_idx ON hrms.assets (warranty_expiry);
CREATE INDEX IF NOT EXISTS assets_department_idx ON hrms.assets (department_id);

-- -----------------------------------------------------------------------------
-- Assignments
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.asset_assignments (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  asset_id uuid NOT NULL REFERENCES hrms.assets (id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  assigned_date date NOT NULL DEFAULT (public.utc_now()::date),
  expected_return_date date,
  returned_date date,
  condition_before hrms.asset_condition NOT NULL DEFAULT 'good',
  condition_after hrms.asset_condition,
  assignment_status hrms.asset_assignment_status NOT NULL DEFAULT 'active',
  remarks text,
  return_remarks text,
  assigned_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  returned_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  transferred_from_assignment_id uuid REFERENCES hrms.asset_assignments (id) ON DELETE SET NULL,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS asset_assignments_org_idx ON hrms.asset_assignments (organization_id);
CREATE INDEX IF NOT EXISTS asset_assignments_asset_idx ON hrms.asset_assignments (asset_id);
CREATE INDEX IF NOT EXISTS asset_assignments_employee_idx ON hrms.asset_assignments (employee_id);
CREATE INDEX IF NOT EXISTS asset_assignments_status_idx ON hrms.asset_assignments (assignment_status);

ALTER TABLE hrms.assets
  DROP CONSTRAINT IF EXISTS assets_current_assignment_fk;

ALTER TABLE hrms.assets
  ADD CONSTRAINT assets_current_assignment_fk
  FOREIGN KEY (current_assignment_id)
  REFERENCES hrms.asset_assignments (id)
  ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Maintenance
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.asset_maintenance (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  asset_id uuid NOT NULL REFERENCES hrms.assets (id) ON DELETE RESTRICT,
  vendor_id uuid REFERENCES hrms.asset_vendors (id) ON DELETE SET NULL,
  maintenance_date date NOT NULL DEFAULT (public.utc_now()::date),
  issue text NOT NULL,
  cost numeric(14, 2),
  next_service_date date,
  maintenance_status hrms.asset_maintenance_status NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  notes text,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT asset_maintenance_issue_not_empty CHECK (length(trim(issue)) > 0),
  CONSTRAINT asset_maintenance_cost_non_negative CHECK (cost IS NULL OR cost >= 0)
);

CREATE INDEX IF NOT EXISTS asset_maintenance_org_idx ON hrms.asset_maintenance (organization_id);
CREATE INDEX IF NOT EXISTS asset_maintenance_asset_idx ON hrms.asset_maintenance (asset_id);
CREATE INDEX IF NOT EXISTS asset_maintenance_status_idx ON hrms.asset_maintenance (maintenance_status);

-- -----------------------------------------------------------------------------
-- Permissions
-- -----------------------------------------------------------------------------

INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT v.code, v.module, v.action, v.resource, v.description, 'active'
FROM (
  VALUES
    ('asset.view', 'assets', 'view', 'assets', 'View company assets', 'assets'),
    ('asset.create', 'assets', 'create', 'assets', 'Create company assets', 'assets'),
    ('asset.assign', 'assets', 'assign', 'assets', 'Assign assets to employees', 'assets'),
    ('asset.return', 'assets', 'return', 'assets', 'Return or reclaim assets', 'assets'),
    ('asset.edit', 'assets', 'edit', 'assets', 'Edit assets and maintenance', 'assets'),
    ('asset.delete', 'assets', 'delete', 'assets', 'Delete or dispose assets', 'assets')
) AS v(code, module, action, resource, description, _)
WHERE NOT EXISTS (SELECT 1 FROM hrms.permissions p WHERE p.code = v.code);

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'super_admin'
  AND p.code LIKE 'asset.%'
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'hr_admin'
  AND p.code LIKE 'asset.%'
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'manager'
  AND p.code IN ('asset.view')
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'employee'
  AND p.code IN ('asset.view')
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- -----------------------------------------------------------------------------
-- Seed categories
-- -----------------------------------------------------------------------------

INSERT INTO hrms.asset_categories (organization_id, name, code, description, status)
SELECT o.id, t.name, t.code, t.description, 'active'
FROM hrms.organizations o
CROSS JOIN (
  VALUES
    ('Laptop', 'LAPTOP', 'Portable computers'),
    ('Desktop', 'DESKTOP', 'Desktop computers'),
    ('Monitor', 'MONITOR', 'Display monitors'),
    ('Keyboard', 'KEYBOARD', 'Keyboards'),
    ('Mouse', 'MOUSE', 'Pointing devices'),
    ('Mobile', 'MOBILE', 'Company mobile phones'),
    ('SIM', 'SIM', 'SIM cards'),
    ('Printer', 'PRINTER', 'Printers and scanners'),
    ('Furniture', 'FURNITURE', 'Office furniture'),
    ('ID Card', 'ID_CARD', 'Employee ID cards'),
    ('Access Card', 'ACCESS_CARD', 'Door access cards'),
    ('Other', 'OTHER', 'Other assets')
) AS t(name, code, description)
WHERE o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM hrms.asset_categories c
    WHERE c.organization_id = o.id AND c.code = t.code AND c.deleted_at IS NULL
  );

-- -----------------------------------------------------------------------------
-- Settings defaults
-- -----------------------------------------------------------------------------

UPDATE hrms.organization_settings
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{assets}',
  COALESCE(settings->'assets', '{
    "assetPrefix": "AST",
    "enableQrCodes": true,
    "warrantyReminderDays": 30,
    "maintenanceReminderDays": 14,
    "defaultReturnDays": 30,
    "categories": [
      "Laptop", "Desktop", "Monitor", "Keyboard", "Mouse",
      "Mobile", "SIM", "Printer", "Furniture", "ID Card", "Access Card", "Other"
    ]
  }'::jsonb),
  true
),
updated_at = public.utc_now()
WHERE deleted_at IS NULL;

INSERT INTO hrms.organization_settings (organization_id, settings, status)
SELECT
  o.id,
  jsonb_build_object(
    'assets',
    '{
      "assetPrefix": "AST",
      "enableQrCodes": true,
      "warrantyReminderDays": 30,
      "maintenanceReminderDays": 14,
      "defaultReturnDays": 30,
      "categories": [
        "Laptop", "Desktop", "Monitor", "Keyboard", "Mouse",
        "Mobile", "SIM", "Printer", "Furniture", "ID Card", "Access Card", "Other"
      ]
    }'::jsonb
  ),
  'active'
FROM hrms.organizations o
WHERE o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM hrms.organization_settings s
    WHERE s.organization_id = o.id AND s.deleted_at IS NULL
  );

-- -----------------------------------------------------------------------------
-- Triggers + RLS
-- -----------------------------------------------------------------------------

SELECT public.attach_updated_at_trigger('hrms.asset_categories'::regclass);
SELECT public.attach_updated_at_trigger('hrms.asset_vendors'::regclass);
SELECT public.attach_updated_at_trigger('hrms.assets'::regclass);
SELECT public.attach_updated_at_trigger('hrms.asset_assignments'::regclass);
SELECT public.attach_updated_at_trigger('hrms.asset_maintenance'::regclass);

ALTER TABLE hrms.asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.asset_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.asset_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.asset_maintenance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS asset_categories_select_policy ON hrms.asset_categories;
CREATE POLICY asset_categories_select_policy ON hrms.asset_categories
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS asset_categories_insert_policy ON hrms.asset_categories;
CREATE POLICY asset_categories_insert_policy ON hrms.asset_categories
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS asset_categories_update_policy ON hrms.asset_categories;
CREATE POLICY asset_categories_update_policy ON hrms.asset_categories
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS asset_vendors_select_policy ON hrms.asset_vendors;
CREATE POLICY asset_vendors_select_policy ON hrms.asset_vendors
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS asset_vendors_insert_policy ON hrms.asset_vendors;
CREATE POLICY asset_vendors_insert_policy ON hrms.asset_vendors
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS asset_vendors_update_policy ON hrms.asset_vendors;
CREATE POLICY asset_vendors_update_policy ON hrms.asset_vendors
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS assets_select_policy ON hrms.assets;
CREATE POLICY assets_select_policy ON hrms.assets
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS assets_insert_policy ON hrms.assets;
CREATE POLICY assets_insert_policy ON hrms.assets
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS assets_update_policy ON hrms.assets;
CREATE POLICY assets_update_policy ON hrms.assets
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS asset_assignments_select_policy ON hrms.asset_assignments;
CREATE POLICY asset_assignments_select_policy ON hrms.asset_assignments
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS asset_assignments_insert_policy ON hrms.asset_assignments;
CREATE POLICY asset_assignments_insert_policy ON hrms.asset_assignments
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS asset_assignments_update_policy ON hrms.asset_assignments;
CREATE POLICY asset_assignments_update_policy ON hrms.asset_assignments
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS asset_maintenance_select_policy ON hrms.asset_maintenance;
CREATE POLICY asset_maintenance_select_policy ON hrms.asset_maintenance
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS asset_maintenance_insert_policy ON hrms.asset_maintenance;
CREATE POLICY asset_maintenance_insert_policy ON hrms.asset_maintenance
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS asset_maintenance_update_policy ON hrms.asset_maintenance;
CREATE POLICY asset_maintenance_update_policy ON hrms.asset_maintenance
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));
