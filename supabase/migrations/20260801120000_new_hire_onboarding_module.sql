-- =============================================================================
-- Migration: new_hire_onboarding_module
-- Description: Enterprise new-hire onboarding (separate from User Provisioning)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE hrms.onboarding_status AS ENUM (
    'draft',
    'invitation_sent',
    'invitation_viewed',
    'in_progress',
    'documents_uploaded',
    'pending_hr_review',
    'corrections_requested',
    'approved',
    'rejected',
    'employee_created',
    'completed',
    'cancelled',
    'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.onboarding_document_review_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'correction_requested'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.onboarding_signature_type AS ENUM (
    'typed',
    'drawn',
    'uploaded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- Core case
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.onboarding_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations(id),
  status hrms.onboarding_status NOT NULL DEFAULT 'draft',
  full_name text NOT NULL,
  personal_email text NOT NULL,
  mobile_number text,
  designation_id uuid REFERENCES hrms.designations(id),
  department_id uuid REFERENCES hrms.departments(id),
  reporting_manager_id uuid REFERENCES hrms.employees(id),
  employment_type_id uuid REFERENCES hrms.employment_types(id),
  joining_date date,
  work_location_id uuid REFERENCES hrms.work_locations(id),
  branch_id uuid REFERENCES hrms.branches(id),
  employment_category text,
  offer_reference_number text,
  intended_role_id uuid NOT NULL REFERENCES hrms.roles(id),
  employee_id uuid REFERENCES hrms.employees(id),
  company_email text,
  employee_code text,
  completion_percent integer NOT NULL DEFAULT 0,
  invitation_sent_at timestamptz,
  invitation_viewed_at timestamptz,
  invitation_expires_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  rejected_by uuid REFERENCES auth.users(id),
  hr_reviewer_id uuid REFERENCES hrms.employees(id),
  hr_comments text,
  correction_notes text,
  onboarding_account_active boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  deleted_at timestamptz,
  CONSTRAINT onboarding_cases_full_name_not_empty CHECK (length(trim(full_name)) > 0),
  CONSTRAINT onboarding_cases_email_not_empty CHECK (length(trim(personal_email)) > 0),
  CONSTRAINT onboarding_cases_completion_range CHECK (completion_percent >= 0 AND completion_percent <= 100)
);

CREATE INDEX IF NOT EXISTS onboarding_cases_organization_id_idx ON hrms.onboarding_cases (organization_id);
CREATE INDEX IF NOT EXISTS onboarding_cases_status_idx ON hrms.onboarding_cases (status);
CREATE INDEX IF NOT EXISTS onboarding_cases_personal_email_idx ON hrms.onboarding_cases (lower(personal_email));
CREATE INDEX IF NOT EXISTS onboarding_cases_employee_id_idx ON hrms.onboarding_cases (employee_id);
CREATE INDEX IF NOT EXISTS onboarding_cases_deleted_at_idx ON hrms.onboarding_cases (deleted_at);

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_cases_org_personal_email_active_idx
  ON hrms.onboarding_cases (organization_id, lower(trim(personal_email)))
  WHERE deleted_at IS NULL AND status NOT IN ('cancelled', 'archived', 'rejected', 'completed');

-- -----------------------------------------------------------------------------
-- Invitation tokens (HMAC hash only)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.onboarding_invitation_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations(id),
  case_id uuid NOT NULL REFERENCES hrms.onboarding_cases(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS onboarding_invitation_tokens_case_id_idx
  ON hrms.onboarding_invitation_tokens (case_id);
CREATE UNIQUE INDEX IF NOT EXISTS onboarding_invitation_tokens_hash_active_idx
  ON hrms.onboarding_invitation_tokens (token_hash)
  WHERE deleted_at IS NULL AND status = 'active';

-- -----------------------------------------------------------------------------
-- Candidate portal credentials (temporary — not auth.users)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.onboarding_portal_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL UNIQUE REFERENCES hrms.onboarding_cases(id) ON DELETE CASCADE,
  personal_email text NOT NULL,
  password_hash text,
  otp_hash text,
  otp_expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now()
);

CREATE TABLE IF NOT EXISTS hrms.onboarding_portal_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES hrms.onboarding_cases(id) ON DELETE CASCADE,
  session_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT public.utc_now()
);

CREATE INDEX IF NOT EXISTS onboarding_portal_sessions_case_id_idx
  ON hrms.onboarding_portal_sessions (case_id);
CREATE UNIQUE INDEX IF NOT EXISTS onboarding_portal_sessions_hash_idx
  ON hrms.onboarding_portal_sessions (session_hash)
  WHERE revoked_at IS NULL;

-- -----------------------------------------------------------------------------
-- Wizard section payloads (JSON)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.onboarding_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES hrms.onboarding_cases(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  CONSTRAINT onboarding_sections_key_not_empty CHECK (length(trim(section_key)) > 0),
  UNIQUE (case_id, section_key)
);

-- -----------------------------------------------------------------------------
-- Documents
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.onboarding_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES hrms.onboarding_cases(id) ON DELETE CASCADE,
  document_category text NOT NULL,
  document_type_code text NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  review_status hrms.onboarding_document_review_status NOT NULL DEFAULT 'pending',
  hr_comment text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS onboarding_documents_case_id_idx ON hrms.onboarding_documents (case_id);

-- -----------------------------------------------------------------------------
-- Policy acknowledgements & agreements
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.onboarding_policy_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES hrms.onboarding_cases(id) ON DELETE CASCADE,
  policy_code text NOT NULL,
  acknowledged_at timestamptz NOT NULL DEFAULT public.utc_now(),
  UNIQUE (case_id, policy_code)
);

CREATE TABLE IF NOT EXISTS hrms.onboarding_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES hrms.onboarding_cases(id) ON DELETE CASCADE,
  agreement_type text NOT NULL,
  storage_path text,
  signed_at timestamptz,
  signature_id uuid,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  UNIQUE (case_id, agreement_type)
);

-- -----------------------------------------------------------------------------
-- eSignature
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.onboarding_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES hrms.onboarding_cases(id) ON DELETE CASCADE,
  signature_type hrms.onboarding_signature_type NOT NULL,
  signature_style text,
  signature_data text NOT NULL,
  storage_path text,
  finalized_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_at timestamptz NOT NULL DEFAULT public.utc_now()
);

CREATE INDEX IF NOT EXISTS onboarding_signatures_case_id_idx ON hrms.onboarding_signatures (case_id);

-- -----------------------------------------------------------------------------
-- Timeline / audit
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.onboarding_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES hrms.onboarding_cases(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  description text,
  actor_user_id uuid REFERENCES auth.users(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT public.utc_now()
);

CREATE INDEX IF NOT EXISTS onboarding_timeline_case_id_idx
  ON hrms.onboarding_timeline_events (case_id, occurred_at DESC);

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

SELECT public.attach_updated_at_trigger('hrms.onboarding_cases'::regclass);
SELECT public.attach_updated_at_trigger('hrms.onboarding_invitation_tokens'::regclass);
SELECT public.attach_updated_at_trigger('hrms.onboarding_portal_accounts'::regclass);
SELECT public.attach_updated_at_trigger('hrms.onboarding_sections'::regclass);
SELECT public.attach_updated_at_trigger('hrms.onboarding_documents'::regclass);
SELECT public.attach_updated_at_trigger('hrms.onboarding_agreements'::regclass);

SELECT public.attach_audit_trigger('hrms.onboarding_cases'::regclass);

-- -----------------------------------------------------------------------------
-- Storage bucket
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'onboarding-documents',
  'onboarding-documents',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE
SET file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- RLS (service role + authenticated org members with permission)
-- -----------------------------------------------------------------------------

ALTER TABLE hrms.onboarding_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.onboarding_invitation_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.onboarding_portal_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.onboarding_portal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.onboarding_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.onboarding_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.onboarding_policy_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.onboarding_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.onboarding_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.onboarding_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY onboarding_cases_org_access ON hrms.onboarding_cases
  FOR ALL TO authenticated
  USING (
    deleted_at IS NULL
    AND organization_id IN (
      SELECT e.organization_id FROM hrms.employees e
      INNER JOIN hrms.user_roles ur ON ur.employee_id = e.id AND ur.deleted_at IS NULL
      WHERE ur.user_id = auth.uid() AND e.deleted_at IS NULL
    )
  );

CREATE POLICY onboarding_sections_org_access ON hrms.onboarding_sections
  FOR ALL TO authenticated
  USING (
    case_id IN (
      SELECT c.id FROM hrms.onboarding_cases c
      INNER JOIN hrms.employees e ON e.organization_id = c.organization_id
      INNER JOIN hrms.user_roles ur ON ur.employee_id = e.id AND ur.deleted_at IS NULL
      WHERE ur.user_id = auth.uid() AND e.deleted_at IS NULL AND c.deleted_at IS NULL
    )
  );

CREATE POLICY onboarding_documents_org_access ON hrms.onboarding_documents
  FOR ALL TO authenticated
  USING (
    deleted_at IS NULL
    AND case_id IN (
      SELECT c.id FROM hrms.onboarding_cases c
      INNER JOIN hrms.employees e ON e.organization_id = c.organization_id
      INNER JOIN hrms.user_roles ur ON ur.employee_id = e.id AND ur.deleted_at IS NULL
      WHERE ur.user_id = auth.uid() AND e.deleted_at IS NULL AND c.deleted_at IS NULL
    )
  );

CREATE POLICY onboarding_timeline_org_access ON hrms.onboarding_timeline_events
  FOR SELECT TO authenticated
  USING (
    case_id IN (
      SELECT c.id FROM hrms.onboarding_cases c
      INNER JOIN hrms.employees e ON e.organization_id = c.organization_id
      INNER JOIN hrms.user_roles ur ON ur.employee_id = e.id AND ur.deleted_at IS NULL
      WHERE ur.user_id = auth.uid() AND e.deleted_at IS NULL AND c.deleted_at IS NULL
    )
  );
