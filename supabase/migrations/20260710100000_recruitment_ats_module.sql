-- Phase 7: Recruitment (ATS)

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE hrms.job_opening_status AS ENUM ('draft', 'open', 'paused', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.work_mode AS ENUM ('onsite', 'hybrid', 'remote');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.candidate_stage AS ENUM (
    'applied', 'screening', 'technical', 'hr', 'ceo', 'offer', 'joined', 'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.interview_meeting_type AS ENUM ('offline', 'google_meet', 'zoom', 'teams');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.interview_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.interview_recommendation AS ENUM ('reject', 'next_round', 'offer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.offer_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- Job openings
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.recruitment_job_openings (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  title text NOT NULL,
  department_id uuid REFERENCES hrms.departments (id) ON DELETE SET NULL,
  designation_id uuid REFERENCES hrms.designations (id) ON DELETE SET NULL,
  employment_type_id uuid REFERENCES hrms.employment_types (id) ON DELETE SET NULL,
  experience_min numeric(4, 1),
  experience_max numeric(4, 1),
  salary_min numeric(12, 2),
  salary_max numeric(12, 2),
  open_positions integer NOT NULL DEFAULT 1 CHECK (open_positions > 0),
  location text,
  work_mode hrms.work_mode NOT NULL DEFAULT 'onsite',
  hiring_manager_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL,
  required_skills text[] NOT NULL DEFAULT '{}',
  job_description text,
  job_status hrms.job_opening_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  closed_at timestamptz,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS recruitment_job_openings_org_idx
  ON hrms.recruitment_job_openings (organization_id);
CREATE INDEX IF NOT EXISTS recruitment_job_openings_status_idx
  ON hrms.recruitment_job_openings (job_status);
CREATE INDEX IF NOT EXISTS recruitment_job_openings_department_idx
  ON hrms.recruitment_job_openings (department_id);

-- -----------------------------------------------------------------------------
-- Candidates
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.recruitment_candidates (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  job_opening_id uuid NOT NULL REFERENCES hrms.recruitment_job_openings (id) ON DELETE RESTRICT,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  photo_path text,
  resume_path text,
  experience_years numeric(4, 1),
  skills text[] NOT NULL DEFAULT '{}',
  current_company text,
  current_ctc numeric(12, 2),
  expected_ctc numeric(12, 2),
  notice_period_days integer,
  source text,
  stage hrms.candidate_stage NOT NULL DEFAULT 'applied',
  notes text,
  employee_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL,
  rejected_at timestamptz,
  rejection_reason text,
  joined_at timestamptz,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS recruitment_candidates_org_idx
  ON hrms.recruitment_candidates (organization_id);
CREATE INDEX IF NOT EXISTS recruitment_candidates_job_idx
  ON hrms.recruitment_candidates (job_opening_id);
CREATE INDEX IF NOT EXISTS recruitment_candidates_stage_idx
  ON hrms.recruitment_candidates (stage);
CREATE INDEX IF NOT EXISTS recruitment_candidates_email_idx
  ON hrms.recruitment_candidates (organization_id, email);

-- -----------------------------------------------------------------------------
-- Candidate stage history (timeline)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.recruitment_candidate_timeline (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  candidate_id uuid NOT NULL REFERENCES hrms.recruitment_candidates (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_stage hrms.candidate_stage,
  to_stage hrms.candidate_stage,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS recruitment_candidate_timeline_candidate_idx
  ON hrms.recruitment_candidate_timeline (candidate_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- Interviews
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.recruitment_interviews (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  candidate_id uuid NOT NULL REFERENCES hrms.recruitment_candidates (id) ON DELETE CASCADE,
  job_opening_id uuid NOT NULL REFERENCES hrms.recruitment_job_openings (id) ON DELETE RESTRICT,
  interviewer_employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  round_name text NOT NULL,
  interview_date date NOT NULL,
  interview_time time NOT NULL,
  meeting_link text,
  interview_type hrms.interview_meeting_type NOT NULL DEFAULT 'offline',
  interview_status hrms.interview_status NOT NULL DEFAULT 'scheduled',
  rating smallint CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  comments text,
  recommendation hrms.interview_recommendation,
  completed_at timestamptz,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS recruitment_interviews_org_idx
  ON hrms.recruitment_interviews (organization_id);
CREATE INDEX IF NOT EXISTS recruitment_interviews_candidate_idx
  ON hrms.recruitment_interviews (candidate_id);
CREATE INDEX IF NOT EXISTS recruitment_interviews_date_idx
  ON hrms.recruitment_interviews (interview_date);
CREATE INDEX IF NOT EXISTS recruitment_interviews_status_idx
  ON hrms.recruitment_interviews (interview_status);

-- -----------------------------------------------------------------------------
-- Offers
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.recruitment_offers (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  candidate_id uuid NOT NULL REFERENCES hrms.recruitment_candidates (id) ON DELETE RESTRICT,
  job_opening_id uuid NOT NULL REFERENCES hrms.recruitment_job_openings (id) ON DELETE RESTRICT,
  department_id uuid REFERENCES hrms.departments (id) ON DELETE SET NULL,
  designation_id uuid REFERENCES hrms.designations (id) ON DELETE SET NULL,
  branch_id uuid REFERENCES hrms.branches (id) ON DELETE SET NULL,
  employment_type_id uuid REFERENCES hrms.employment_types (id) ON DELETE SET NULL,
  reporting_manager_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL,
  salary numeric(12, 2) NOT NULL,
  joining_date date NOT NULL,
  offer_letter_path text,
  offer_status hrms.offer_status NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  responded_at timestamptz,
  expires_at date,
  employee_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL,
  notes text,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS recruitment_offers_org_idx
  ON hrms.recruitment_offers (organization_id);
CREATE INDEX IF NOT EXISTS recruitment_offers_candidate_idx
  ON hrms.recruitment_offers (candidate_id);
CREATE INDEX IF NOT EXISTS recruitment_offers_status_idx
  ON hrms.recruitment_offers (offer_status);

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

SELECT public.attach_updated_at_trigger('hrms.recruitment_job_openings');
SELECT public.attach_updated_at_trigger('hrms.recruitment_candidates');
SELECT public.attach_updated_at_trigger('hrms.recruitment_interviews');
SELECT public.attach_updated_at_trigger('hrms.recruitment_offers');

-- -----------------------------------------------------------------------------
-- Permissions
-- -----------------------------------------------------------------------------

INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT v.code, v.module, v.action, v.resource, v.description, 'active'::hrms.record_status
FROM (
  VALUES
    ('recruitment.view', 'recruitment', 'view', 'recruitment', 'View recruitment module'),
    ('recruitment.create', 'recruitment', 'create', 'recruitment', 'Create jobs and candidates'),
    ('recruitment.edit', 'recruitment', 'edit', 'recruitment', 'Edit recruitment records'),
    ('recruitment.delete', 'recruitment', 'delete', 'recruitment', 'Delete recruitment records'),
    ('recruitment.interview', 'recruitment', 'interview', 'recruitment', 'Schedule and conduct interviews'),
    ('recruitment.offer', 'recruitment', 'offer', 'recruitment', 'Manage offers and hiring')
) AS v(code, module, action, resource, description)
WHERE NOT EXISTS (
  SELECT 1 FROM hrms.permissions p WHERE p.code = v.code AND p.deleted_at IS NULL
);

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'super_admin'
  AND p.code LIKE 'recruitment.%'
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'hr_admin'
  AND p.code LIKE 'recruitment.%'
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'manager'
  AND p.code IN ('recruitment.view', 'recruitment.interview')
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- -----------------------------------------------------------------------------
-- Default settings
-- -----------------------------------------------------------------------------

UPDATE hrms.organization_settings os
SET settings = jsonb_set(
  COALESCE(os.settings, '{}'::jsonb),
  '{recruitment}',
  COALESCE(os.settings->'recruitment', '{
    "stages": ["applied", "screening", "technical", "hr", "ceo", "offer", "joined", "rejected"],
    "interviewTypes": ["offline", "google_meet", "zoom", "teams"],
    "candidateSources": ["LinkedIn", "Naukri", "Referral", "Careers Page", "Agency", "Walk-in", "Other"],
    "offerTemplates": [
      {"id": "default", "name": "Standard Offer", "body": "We are pleased to offer you the position of {{position}} with a compensation of {{salary}}, joining on {{joiningDate}}."}
    ],
    "emailTemplates": [
      {"id": "interview_invite", "name": "Interview Invitation", "subject": "Interview for {{position}}", "body": "Dear {{candidateName}},\\n\\nYou are invited for an interview on {{date}} at {{time}}.\\n\\nRegards,\\nHR Team"},
      {"id": "offer_sent", "name": "Offer Letter", "subject": "Offer of Employment — {{position}}", "body": "Dear {{candidateName}},\\n\\nPlease find your offer details attached.\\n\\nRegards,\\nHR Team"}
    ]
  }'::jsonb),
  true
)
WHERE os.deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

ALTER TABLE hrms.recruitment_job_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.recruitment_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.recruitment_candidate_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.recruitment_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.recruitment_offers ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'recruitment_job_openings',
    'recruitment_candidates',
    'recruitment_interviews',
    'recruitment_offers'
  ]
  LOOP
    EXECUTE format($sql$
      DROP POLICY IF EXISTS %I_select_policy ON hrms.%I;
      DROP POLICY IF EXISTS %I_insert_policy ON hrms.%I;
      DROP POLICY IF EXISTS %I_update_policy ON hrms.%I;

      CREATE POLICY %I_select_policy ON hrms.%I
        FOR SELECT TO authenticated
        USING (
          organization_id IN (SELECT hrms.current_user_organization_ids())
          AND deleted_at IS NULL
        );
      CREATE POLICY %I_insert_policy ON hrms.%I
        FOR INSERT TO authenticated
        WITH CHECK (
          organization_id IN (SELECT hrms.current_user_organization_ids())
        );
      CREATE POLICY %I_update_policy ON hrms.%I
        FOR UPDATE TO authenticated
        USING (
          organization_id IN (SELECT hrms.current_user_organization_ids())
        );
    $sql$, t, t, t, t, t, t, t, t, t, t, t, t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS recruitment_candidate_timeline_select_policy ON hrms.recruitment_candidate_timeline;
DROP POLICY IF EXISTS recruitment_candidate_timeline_insert_policy ON hrms.recruitment_candidate_timeline;

CREATE POLICY recruitment_candidate_timeline_select_policy ON hrms.recruitment_candidate_timeline
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT hrms.current_user_organization_ids()));

CREATE POLICY recruitment_candidate_timeline_insert_policy ON hrms.recruitment_candidate_timeline
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT hrms.current_user_organization_ids()));
