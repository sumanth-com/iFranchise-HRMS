-- =============================================================================
-- Migration: hrms_employee_reference_seed
-- Description: iFranchise designations, leave types, document types, and
--              employee bootstrap function for production workforce seeding.
-- Idempotent: safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Additional designations
-- -----------------------------------------------------------------------------

INSERT INTO hrms.designations (id, organization_id, title, code, level, status)
VALUES
  ('b0000000-0000-4000-8000-000000000314', 'a0000000-0000-4000-8000-000000000001', 'HR & Operations Executive', 'HR_OPERATIONS_EXECUTIVE', 6, 'active'),
  ('b0000000-0000-4000-8000-000000000315', 'a0000000-0000-4000-8000-000000000001', 'Business Development Associate', 'BUSINESS_DEVELOPMENT_ASSOCIATE', 4, 'active'),
  ('b0000000-0000-4000-8000-000000000316', 'a0000000-0000-4000-8000-000000000001', 'Digital Marketing Specialist', 'DIGITAL_MARKETING_SPECIALIST', 5, 'active'),
  ('b0000000-0000-4000-8000-000000000317', 'a0000000-0000-4000-8000-000000000001', 'Assistant BDM', 'ASSISTANT_BDM', 4, 'active'),
  ('b0000000-0000-4000-8000-000000000318', 'a0000000-0000-4000-8000-000000000001', 'Website Developer Intern', 'WEBSITE_DEVELOPER_INTERN', 2, 'active'),
  ('b0000000-0000-4000-8000-000000000319', 'a0000000-0000-4000-8000-000000000001', 'HR & Operations Intern', 'HR_OPERATIONS_INTERN', 2, 'active'),
  ('b0000000-0000-4000-8000-000000000320', 'a0000000-0000-4000-8000-000000000001', 'Content & Social Media Intern', 'CONTENT_SOCIAL_MEDIA_INTERN', 2, 'active')
ON CONFLICT (id) DO UPDATE
SET
  title = EXCLUDED.title,
  code = EXCLUDED.code,
  level = EXCLUDED.level,
  status = EXCLUDED.status,
  updated_at = public.utc_now();

-- -----------------------------------------------------------------------------
-- Leave types
-- -----------------------------------------------------------------------------

INSERT INTO hrms.leave_types (
  id, organization_id, name, code, description, days_per_year, is_paid, is_carry_forward, max_carry_forward_days, status
)
VALUES
  (
    'b0000000-0000-4000-8000-000000000501',
    'a0000000-0000-4000-8000-000000000001',
    'Earned Leave',
    'EL',
    'Paid earned leave balance',
    12,
    true,
    true,
    5,
    'active'
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  description = EXCLUDED.description,
  days_per_year = EXCLUDED.days_per_year,
  is_paid = EXCLUDED.is_paid,
  is_carry_forward = EXCLUDED.is_carry_forward,
  max_carry_forward_days = EXCLUDED.max_carry_forward_days,
  status = EXCLUDED.status,
  updated_at = public.utc_now();

-- -----------------------------------------------------------------------------
-- Document types
-- -----------------------------------------------------------------------------

INSERT INTO hrms.document_types (
  id, organization_id, name, code, description, is_required, requires_expiry, status
)
VALUES
  ('b0000000-0000-4000-8000-000000000601', 'a0000000-0000-4000-8000-000000000001', 'Aadhaar', 'AADHAAR', 'Aadhaar identity document', true, false, 'active'),
  ('b0000000-0000-4000-8000-000000000602', 'a0000000-0000-4000-8000-000000000001', 'PAN', 'PAN', 'Permanent Account Number', true, false, 'active'),
  ('b0000000-0000-4000-8000-000000000603', 'a0000000-0000-4000-8000-000000000001', 'National ID', 'NATIONAL_ID', 'National identity document', true, true, 'active'),
  ('b0000000-0000-4000-8000-000000000604', 'a0000000-0000-4000-8000-000000000001', 'Employment Contract', 'EMPLOYMENT_CONTRACT', 'Signed employment contract', true, false, 'active'),
  ('b0000000-0000-4000-8000-000000000605', 'a0000000-0000-4000-8000-000000000001', 'Resume', 'RESUME', 'Employee resume or CV', false, false, 'active')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  description = EXCLUDED.description,
  is_required = EXCLUDED.is_required,
  requires_expiry = EXCLUDED.requires_expiry,
  status = EXCLUDED.status,
  updated_at = public.utc_now();
