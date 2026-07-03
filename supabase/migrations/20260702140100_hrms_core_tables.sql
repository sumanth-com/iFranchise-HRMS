-- =============================================================================
-- Migration: hrms_core_tables
-- Description: Core organizational structure tables
-- =============================================================================

-- -----------------------------------------------------------------------------
-- organizations
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.organizations (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  name text NOT NULL,
  legal_name text,
  registration_number text,
  tax_id text,
  email extensions.citext,
  phone text,
  website text,
  logo_storage_path text,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT organizations_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT organizations_email_format CHECK (
    email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  )
);

COMMENT ON COLUMN hrms.organizations.logo_storage_path IS
  'Storage path in company-assets bucket. Store path only, not full URL.';

CREATE INDEX organizations_status_idx ON hrms.organizations (status);
CREATE INDEX organizations_deleted_at_idx ON hrms.organizations (deleted_at);
CREATE UNIQUE INDEX organizations_registration_number_active_idx
  ON hrms.organizations (registration_number)
  WHERE deleted_at IS NULL AND registration_number IS NOT NULL;
CREATE UNIQUE INDEX organizations_email_active_idx
  ON hrms.organizations (email)
  WHERE deleted_at IS NULL AND email IS NOT NULL;

-- -----------------------------------------------------------------------------
-- branches
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.branches (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  name text NOT NULL,
  code text NOT NULL,
  email extensions.citext,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text NOT NULL DEFAULT 'US',
  timezone text NOT NULL DEFAULT 'UTC',
  is_head_office boolean NOT NULL DEFAULT false,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT branches_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT branches_code_not_empty CHECK (length(trim(code)) > 0)
);

CREATE INDEX branches_organization_id_idx ON hrms.branches (organization_id);
CREATE INDEX branches_status_idx ON hrms.branches (status);
CREATE INDEX branches_deleted_at_idx ON hrms.branches (deleted_at);
CREATE UNIQUE INDEX branches_org_code_active_idx
  ON hrms.branches (organization_id, code)
  WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- departments
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.departments (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  branch_id uuid REFERENCES hrms.branches (id) ON DELETE SET NULL,
  parent_department_id uuid REFERENCES hrms.departments (id) ON DELETE SET NULL,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT departments_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT departments_code_not_empty CHECK (length(trim(code)) > 0),
  CONSTRAINT departments_not_self_parent CHECK (
    parent_department_id IS NULL OR parent_department_id <> id
  )
);

CREATE INDEX departments_organization_id_idx ON hrms.departments (organization_id);
CREATE INDEX departments_branch_id_idx ON hrms.departments (branch_id);
CREATE INDEX departments_parent_department_id_idx ON hrms.departments (parent_department_id);
CREATE INDEX departments_status_idx ON hrms.departments (status);
CREATE INDEX departments_deleted_at_idx ON hrms.departments (deleted_at);
CREATE UNIQUE INDEX departments_org_code_active_idx
  ON hrms.departments (organization_id, code)
  WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- designations
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.designations (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  title text NOT NULL,
  code text NOT NULL,
  level smallint NOT NULL DEFAULT 1 CHECK (level >= 1),
  description text,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT designations_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT designations_code_not_empty CHECK (length(trim(code)) > 0)
);

CREATE INDEX designations_organization_id_idx ON hrms.designations (organization_id);
CREATE INDEX designations_status_idx ON hrms.designations (status);
CREATE INDEX designations_deleted_at_idx ON hrms.designations (deleted_at);
CREATE UNIQUE INDEX designations_org_code_active_idx
  ON hrms.designations (organization_id, code)
  WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- employment_types
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.employment_types (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  is_full_time boolean NOT NULL DEFAULT true,
  default_hours_per_week numeric(5, 2) NOT NULL DEFAULT 40.00 CHECK (default_hours_per_week > 0),
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT employment_types_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT employment_types_code_not_empty CHECK (length(trim(code)) > 0)
);

CREATE INDEX employment_types_organization_id_idx ON hrms.employment_types (organization_id);
CREATE INDEX employment_types_status_idx ON hrms.employment_types (status);
CREATE INDEX employment_types_deleted_at_idx ON hrms.employment_types (deleted_at);
CREATE UNIQUE INDEX employment_types_org_code_active_idx
  ON hrms.employment_types (organization_id, code)
  WHERE deleted_at IS NULL;
