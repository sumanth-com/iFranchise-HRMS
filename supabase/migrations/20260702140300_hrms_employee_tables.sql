-- =============================================================================
-- Migration: hrms_employee_tables
-- Description: Employee master data and related profile tables
-- =============================================================================

-- -----------------------------------------------------------------------------
-- employees
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.employees (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  branch_id uuid NOT NULL REFERENCES hrms.branches (id) ON DELETE RESTRICT,
  department_id uuid REFERENCES hrms.departments (id) ON DELETE SET NULL,
  designation_id uuid REFERENCES hrms.designations (id) ON DELETE SET NULL,
  employment_type_id uuid REFERENCES hrms.employment_types (id) ON DELETE SET NULL,
  reporting_manager_id uuid,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  employee_code text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email citext NOT NULL,
  phone text,
  employment_status hrms.employment_status NOT NULL DEFAULT 'draft',
  date_of_joining date,
  date_of_leaving date,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT employees_first_name_not_empty CHECK (length(trim(first_name)) > 0),
  CONSTRAINT employees_last_name_not_empty CHECK (length(trim(last_name)) > 0),
  CONSTRAINT employees_code_not_empty CHECK (length(trim(employee_code)) > 0),
  CONSTRAINT employees_email_format CHECK (
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  ),
  CONSTRAINT employees_leaving_after_joining CHECK (
    date_of_leaving IS NULL
    OR date_of_joining IS NULL
    OR date_of_leaving >= date_of_joining
  ),
  CONSTRAINT employees_not_self_manager CHECK (
    reporting_manager_id IS NULL OR reporting_manager_id <> id
  )
);

ALTER TABLE hrms.employees
  ADD CONSTRAINT employees_reporting_manager_id_fkey
  FOREIGN KEY (reporting_manager_id) REFERENCES hrms.employees (id) ON DELETE SET NULL;

ALTER TABLE hrms.user_roles
  ADD CONSTRAINT user_roles_employee_id_fkey
  FOREIGN KEY (employee_id) REFERENCES hrms.employees (id) ON DELETE SET NULL;

CREATE INDEX employees_organization_id_idx ON hrms.employees (organization_id);
CREATE INDEX employees_branch_id_idx ON hrms.employees (branch_id);
CREATE INDEX employees_department_id_idx ON hrms.employees (department_id);
CREATE INDEX employees_designation_id_idx ON hrms.employees (designation_id);
CREATE INDEX employees_employment_type_id_idx ON hrms.employees (employment_type_id);
CREATE INDEX employees_reporting_manager_id_idx ON hrms.employees (reporting_manager_id);
CREATE INDEX employees_user_id_idx ON hrms.employees (user_id);
CREATE INDEX employees_employment_status_idx ON hrms.employees (employment_status);
CREATE INDEX employees_status_idx ON hrms.employees (status);
CREATE INDEX employees_deleted_at_idx ON hrms.employees (deleted_at);
CREATE INDEX employees_date_of_joining_idx ON hrms.employees (date_of_joining);

CREATE UNIQUE INDEX employees_org_code_active_idx
  ON hrms.employees (organization_id, employee_code)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX employees_org_email_active_idx
  ON hrms.employees (organization_id, email)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX employees_user_id_active_idx
  ON hrms.employees (user_id)
  WHERE deleted_at IS NULL AND user_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- employee_profiles
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.employee_profiles (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  employee_id uuid NOT NULL UNIQUE REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  date_of_birth date,
  gender hrms.gender_type,
  marital_status hrms.marital_status,
  nationality text,
  blood_group text,
  personal_email citext,
  personal_phone text,
  profile_image_storage_path text,
  bio text,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT employee_profiles_dob_valid CHECK (
    date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE
  )
);

COMMENT ON COLUMN hrms.employee_profiles.profile_image_storage_path IS
  'Storage path in employee-profile-images bucket. Store path only, not full URL.';

CREATE INDEX employee_profiles_employee_id_idx ON hrms.employee_profiles (employee_id);
CREATE INDEX employee_profiles_status_idx ON hrms.employee_profiles (status);
CREATE INDEX employee_profiles_deleted_at_idx ON hrms.employee_profiles (deleted_at);

-- -----------------------------------------------------------------------------
-- emergency_contacts
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.emergency_contacts (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  name text NOT NULL,
  relationship text NOT NULL,
  phone text NOT NULL,
  email citext,
  is_primary boolean NOT NULL DEFAULT false,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT emergency_contacts_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT emergency_contacts_phone_not_empty CHECK (length(trim(phone)) > 0)
);

CREATE INDEX emergency_contacts_employee_id_idx ON hrms.emergency_contacts (employee_id);
CREATE INDEX emergency_contacts_is_primary_idx ON hrms.emergency_contacts (is_primary);
CREATE INDEX emergency_contacts_status_idx ON hrms.emergency_contacts (status);
CREATE INDEX emergency_contacts_deleted_at_idx ON hrms.emergency_contacts (deleted_at);

CREATE UNIQUE INDEX emergency_contacts_one_primary_per_employee_idx
  ON hrms.emergency_contacts (employee_id)
  WHERE is_primary = true AND deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- bank_accounts
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.bank_accounts (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  bank_name text NOT NULL,
  account_holder_name text NOT NULL,
  account_number text NOT NULL,
  ifsc_code text,
  routing_number text,
  branch_name text,
  account_type hrms.bank_account_type NOT NULL DEFAULT 'salary',
  is_primary boolean NOT NULL DEFAULT false,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT bank_accounts_bank_name_not_empty CHECK (length(trim(bank_name)) > 0),
  CONSTRAINT bank_accounts_holder_not_empty CHECK (length(trim(account_holder_name)) > 0),
  CONSTRAINT bank_accounts_number_not_empty CHECK (length(trim(account_number)) > 0)
);

CREATE INDEX bank_accounts_employee_id_idx ON hrms.bank_accounts (employee_id);
CREATE INDEX bank_accounts_is_primary_idx ON hrms.bank_accounts (is_primary);
CREATE INDEX bank_accounts_status_idx ON hrms.bank_accounts (status);
CREATE INDEX bank_accounts_deleted_at_idx ON hrms.bank_accounts (deleted_at);

CREATE UNIQUE INDEX bank_accounts_one_primary_per_employee_idx
  ON hrms.bank_accounts (employee_id)
  WHERE is_primary = true AND deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- employee_addresses
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.employee_addresses (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  address_type hrms.address_type NOT NULL DEFAULT 'current',
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text,
  postal_code text,
  country text NOT NULL DEFAULT 'US',
  is_primary boolean NOT NULL DEFAULT false,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT employee_addresses_line1_not_empty CHECK (length(trim(address_line1)) > 0),
  CONSTRAINT employee_addresses_city_not_empty CHECK (length(trim(city)) > 0)
);

CREATE INDEX employee_addresses_employee_id_idx ON hrms.employee_addresses (employee_id);
CREATE INDEX employee_addresses_address_type_idx ON hrms.employee_addresses (address_type);
CREATE INDEX employee_addresses_status_idx ON hrms.employee_addresses (status);
CREATE INDEX employee_addresses_deleted_at_idx ON hrms.employee_addresses (deleted_at);

CREATE UNIQUE INDEX employee_addresses_type_primary_per_employee_idx
  ON hrms.employee_addresses (employee_id, address_type)
  WHERE is_primary = true AND deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- document_types
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.document_types (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  is_required boolean NOT NULL DEFAULT false,
  requires_expiry boolean NOT NULL DEFAULT false,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT document_types_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT document_types_code_not_empty CHECK (length(trim(code)) > 0)
);

CREATE INDEX document_types_organization_id_idx ON hrms.document_types (organization_id);
CREATE INDEX document_types_status_idx ON hrms.document_types (status);
CREATE INDEX document_types_deleted_at_idx ON hrms.document_types (deleted_at);
CREATE UNIQUE INDEX document_types_org_code_active_idx
  ON hrms.document_types (organization_id, code)
  WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- employee_documents
-- -----------------------------------------------------------------------------

CREATE TABLE hrms.employee_documents (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  document_type_id uuid NOT NULL REFERENCES hrms.document_types (id) ON DELETE RESTRICT,
  title text NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size_bytes bigint NOT NULL CHECK (file_size_bytes > 0),
  document_status hrms.document_status NOT NULL DEFAULT 'pending',
  issued_date date,
  expiry_date date,
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT employee_documents_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT employee_documents_storage_path_not_empty CHECK (length(trim(storage_path)) > 0),
  CONSTRAINT employee_documents_expiry_after_issue CHECK (
    expiry_date IS NULL OR issued_date IS NULL OR expiry_date >= issued_date
  )
);

COMMENT ON COLUMN hrms.employee_documents.storage_path IS
  'Storage path in employee-documents bucket. Store path only, not full URL.';

CREATE INDEX employee_documents_employee_id_idx ON hrms.employee_documents (employee_id);
CREATE INDEX employee_documents_document_type_id_idx ON hrms.employee_documents (document_type_id);
CREATE INDEX employee_documents_document_status_idx ON hrms.employee_documents (document_status);
CREATE INDEX employee_documents_expiry_date_idx ON hrms.employee_documents (expiry_date);
CREATE INDEX employee_documents_status_idx ON hrms.employee_documents (status);
CREATE INDEX employee_documents_deleted_at_idx ON hrms.employee_documents (deleted_at);
