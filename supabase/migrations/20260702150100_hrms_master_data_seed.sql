-- =============================================================================
-- Migration: hrms_master_data_seed
-- Description: Production master data bootstrap for iFranchise HRMS (Step 4)
-- Idempotent: safe to re-run on existing databases.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Organization
-- -----------------------------------------------------------------------------

INSERT INTO hrms.organizations (
  id, name, legal_name, email, website, status
) VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'iFranchise',
  'iFranchise Private Limited',
  'admin@ifranchise.com',
  'https://ifranchise.com',
  'active'
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  legal_name = EXCLUDED.legal_name,
  email = EXCLUDED.email,
  website = EXCLUDED.website,
  status = EXCLUDED.status,
  updated_at = public.utc_now();

-- -----------------------------------------------------------------------------
-- Default head office branch (required for employee records)
-- -----------------------------------------------------------------------------

INSERT INTO hrms.branches (
  id, organization_id, name, code, city, state, country, timezone, is_head_office, status
) VALUES (
  'a0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000001',
  'Head Office',
  'HQ',
  'Hyderabad',
  'Telangana',
  'IN',
  'Asia/Kolkata',
  true,
  'active'
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  country = EXCLUDED.country,
  timezone = EXCLUDED.timezone,
  is_head_office = EXCLUDED.is_head_office,
  status = EXCLUDED.status,
  updated_at = public.utc_now();

-- -----------------------------------------------------------------------------
-- Employment types
-- -----------------------------------------------------------------------------

INSERT INTO hrms.employment_types (
  id, organization_id, name, code, description, is_full_time, default_hours_per_week, status
) VALUES
  ('a0000000-0000-4000-8000-000000000411', 'a0000000-0000-4000-8000-000000000001', 'Internship', 'INTERN', 'Internship employment', false, 30.00, 'active'),
  ('a0000000-0000-4000-8000-000000000412', 'a0000000-0000-4000-8000-000000000001', 'Probation', 'PROBATION', 'Probationary employment', true, 40.00, 'active'),
  ('a0000000-0000-4000-8000-000000000401', 'a0000000-0000-4000-8000-000000000001', 'Full Time', 'FULL_TIME', 'Full-time permanent employment', true, 40.00, 'active'),
  ('a0000000-0000-4000-8000-000000000413', 'a0000000-0000-4000-8000-000000000001', 'Contract', 'CONTRACT', 'Fixed-term contract employment', true, 40.00, 'active'),
  ('a0000000-0000-4000-8000-000000000414', 'a0000000-0000-4000-8000-000000000001', 'Consultant', 'CONSULTANT', 'External consultant engagement', false, 20.00, 'active')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  description = EXCLUDED.description,
  is_full_time = EXCLUDED.is_full_time,
  default_hours_per_week = EXCLUDED.default_hours_per_week,
  status = EXCLUDED.status,
  updated_at = public.utc_now();

-- -----------------------------------------------------------------------------
-- Departments
-- -----------------------------------------------------------------------------

INSERT INTO hrms.departments (
  id, organization_id, branch_id, name, code, status
) VALUES
  ('a0000000-0000-4000-8000-000000000201', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'Administration', 'ADMIN', 'active'),
  ('a0000000-0000-4000-8000-000000000202', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'HR', 'HR', 'active'),
  ('a0000000-0000-4000-8000-000000000203', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'Sales', 'SALES', 'active'),
  ('a0000000-0000-4000-8000-000000000204', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'Marketing', 'MARKETING', 'active'),
  ('a0000000-0000-4000-8000-000000000205', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'Finance', 'FINANCE', 'active'),
  ('a0000000-0000-4000-8000-000000000206', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'Technology', 'TECH', 'active'),
  ('a0000000-0000-4000-8000-000000000207', 'a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'Operations', 'OPS', 'active')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  status = EXCLUDED.status,
  updated_at = public.utc_now();

-- -----------------------------------------------------------------------------
-- Designations
-- -----------------------------------------------------------------------------

INSERT INTO hrms.designations (
  id, organization_id, title, code, level, status
) VALUES
  ('a0000000-0000-4000-8000-000000000301', 'a0000000-0000-4000-8000-000000000001', 'Super Admin', 'SUPER_ADMIN', 10, 'active'),
  ('a0000000-0000-4000-8000-000000000302', 'a0000000-0000-4000-8000-000000000001', 'HR Manager', 'HR_MANAGER', 8, 'active'),
  ('a0000000-0000-4000-8000-000000000303', 'a0000000-0000-4000-8000-000000000001', 'HR Executive', 'HR_EXECUTIVE', 5, 'active'),
  ('a0000000-0000-4000-8000-000000000304', 'a0000000-0000-4000-8000-000000000001', 'Sales Manager', 'SALES_MANAGER', 8, 'active'),
  ('a0000000-0000-4000-8000-000000000305', 'a0000000-0000-4000-8000-000000000001', 'Sales Executive', 'SALES_EXECUTIVE', 5, 'active'),
  ('a0000000-0000-4000-8000-000000000306', 'a0000000-0000-4000-8000-000000000001', 'Marketing Manager', 'MARKETING_MANAGER', 8, 'active'),
  ('a0000000-0000-4000-8000-000000000307', 'a0000000-0000-4000-8000-000000000001', 'Marketing Executive', 'MARKETING_EXECUTIVE', 5, 'active'),
  ('a0000000-0000-4000-8000-000000000308', 'a0000000-0000-4000-8000-000000000001', 'Software Engineer', 'SOFTWARE_ENGINEER', 5, 'active'),
  ('a0000000-0000-4000-8000-000000000309', 'a0000000-0000-4000-8000-000000000001', 'Senior Software Engineer', 'SENIOR_SOFTWARE_ENGINEER', 7, 'active'),
  ('a0000000-0000-4000-8000-000000000310', 'a0000000-0000-4000-8000-000000000001', 'Team Lead', 'TEAM_LEAD', 8, 'active'),
  ('a0000000-0000-4000-8000-000000000311', 'a0000000-0000-4000-8000-000000000001', 'Project Manager', 'PROJECT_MANAGER', 8, 'active'),
  ('a0000000-0000-4000-8000-000000000312', 'a0000000-0000-4000-8000-000000000001', 'Accountant', 'ACCOUNTANT', 5, 'active'),
  ('a0000000-0000-4000-8000-000000000313', 'a0000000-0000-4000-8000-000000000001', 'Operations Executive', 'OPS_EXECUTIVE', 5, 'active')
ON CONFLICT (id) DO UPDATE
SET
  title = EXCLUDED.title,
  code = EXCLUDED.code,
  level = EXCLUDED.level,
  status = EXCLUDED.status,
  updated_at = public.utc_now();
