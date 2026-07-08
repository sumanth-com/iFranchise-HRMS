-- Phase 8: Documents & Letters Management

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE hrms.document_source AS ENUM ('upload', 'generated', 'system');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.letter_status AS ENUM (
    'draft', 'pending_approval', 'published', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- Extend employee_documents for folders / letters / archive / numbering
-- -----------------------------------------------------------------------------

ALTER TABLE hrms.employee_documents
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS document_number text,
  ADD COLUMN IF NOT EXISTS source hrms.document_source NOT NULL DEFAULT 'upload',
  ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS replaced_by_id uuid REFERENCES hrms.employee_documents (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

UPDATE hrms.employee_documents ed
SET organization_id = e.organization_id
FROM hrms.employees e
WHERE ed.employee_id = e.id
  AND ed.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS employee_documents_organization_id_idx
  ON hrms.employee_documents (organization_id);
CREATE INDEX IF NOT EXISTS employee_documents_archived_at_idx
  ON hrms.employee_documents (archived_at);
CREATE INDEX IF NOT EXISTS employee_documents_source_idx
  ON hrms.employee_documents (source);
CREATE INDEX IF NOT EXISTS employee_documents_document_number_idx
  ON hrms.employee_documents (organization_id, document_number);

-- -----------------------------------------------------------------------------
-- Document templates
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.document_templates (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  name text NOT NULL,
  letter_type text NOT NULL,
  document_type_code text NOT NULL,
  subject text,
  body_html text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT document_templates_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT document_templates_body_not_empty CHECK (length(trim(body_html)) > 0)
);

CREATE INDEX IF NOT EXISTS document_templates_org_idx
  ON hrms.document_templates (organization_id);
CREATE INDEX IF NOT EXISTS document_templates_letter_type_idx
  ON hrms.document_templates (organization_id, letter_type);
CREATE INDEX IF NOT EXISTS document_templates_deleted_at_idx
  ON hrms.document_templates (deleted_at);

CREATE UNIQUE INDEX IF NOT EXISTS document_templates_org_default_letter_idx
  ON hrms.document_templates (organization_id, letter_type)
  WHERE is_default = true AND deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- Generated company letters
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.document_letters (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  template_id uuid REFERENCES hrms.document_templates (id) ON DELETE SET NULL,
  employee_document_id uuid REFERENCES hrms.employee_documents (id) ON DELETE SET NULL,
  letter_type text NOT NULL,
  letter_number text,
  subject text,
  body_html text NOT NULL,
  placeholders jsonb NOT NULL DEFAULT '{}'::jsonb,
  letter_status hrms.letter_status NOT NULL DEFAULT 'draft',
  generated_at timestamptz,
  published_at timestamptz,
  published_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  source_module text,
  source_record_id uuid,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS document_letters_org_idx
  ON hrms.document_letters (organization_id);
CREATE INDEX IF NOT EXISTS document_letters_employee_idx
  ON hrms.document_letters (employee_id);
CREATE INDEX IF NOT EXISTS document_letters_status_idx
  ON hrms.document_letters (letter_status);
CREATE INDEX IF NOT EXISTS document_letters_type_idx
  ON hrms.document_letters (organization_id, letter_type);
CREATE INDEX IF NOT EXISTS document_letters_deleted_at_idx
  ON hrms.document_letters (deleted_at);

-- -----------------------------------------------------------------------------
-- Permissions (requested Phase 8 codes + keep legacy verify/manage aliases)
-- -----------------------------------------------------------------------------

INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT v.code, v.module, v.action, v.resource, v.description, 'active'
FROM (
  VALUES
    ('documents.edit', 'documents', 'edit', 'documents', 'Edit and replace employee documents', 'documents'),
    ('documents.download', 'documents', 'download', 'documents', 'Download employee documents', 'documents'),
    ('documents.generate', 'documents', 'generate', 'documents', 'Generate company letters', 'documents'),
    ('documents.template.manage', 'documents', 'manage', 'templates', 'Manage document letter templates', 'documents')
) AS v(code, module, action, resource, description, _)
WHERE NOT EXISTS (
  SELECT 1 FROM hrms.permissions p WHERE p.code = v.code
);

-- Super Admin — all documents.*
INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'super_admin'
  AND p.code LIKE 'documents.%'
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- HR Admin — full documents
INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'hr_admin'
  AND p.code LIKE 'documents.%'
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Manager — view + download
INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'manager'
  AND p.code IN ('documents.view', 'documents.download')
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Employee — view, upload, download (own docs enforced in app)
INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'employee'
  AND p.code IN ('documents.view', 'documents.upload', 'documents.download')
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- -----------------------------------------------------------------------------
-- Seed document type catalogue for all active orgs
-- -----------------------------------------------------------------------------

INSERT INTO hrms.document_types (
  organization_id, name, code, description, is_required, requires_expiry, status
)
SELECT
  o.id,
  t.name,
  t.code,
  t.description,
  t.is_required,
  t.requires_expiry,
  'active'
FROM hrms.organizations o
CROSS JOIN (
  VALUES
    ('Profile Photo', 'PROFILE_PHOTO', 'Employee profile photograph', false, false),
    ('Resume', 'RESUME', 'Employee resume or CV', false, false),
    ('Aadhaar', 'AADHAAR', 'Aadhaar identity document', true, false),
    ('PAN', 'PAN', 'Permanent Account Number', true, false),
    ('Offer Letter', 'OFFER_LETTER', 'Employment offer letter', false, false),
    ('Appointment Letter', 'APPOINTMENT_LETTER', 'Appointment / joining letter', false, false),
    ('Employment Agreement', 'EMPLOYMENT_AGREEMENT', 'Signed employment agreement', true, false),
    ('NDA', 'NDA', 'Non-disclosure agreement', false, false),
    ('Salary Revision Letter', 'SALARY_REVISION_LETTER', 'Salary revision correspondence', false, false),
    ('Promotion Letter', 'PROMOTION_LETTER', 'Promotion correspondence', false, false),
    ('Experience Letter', 'EXPERIENCE_LETTER', 'Experience / service letter', false, false),
    ('Relieving Letter', 'RELIEVING_LETTER', 'Relieving letter on exit', false, false),
    ('Confirmation Letter', 'CONFIRMATION_LETTER', 'Probation confirmation letter', false, false),
    ('Warning Letter', 'WARNING_LETTER', 'Disciplinary warning letter', false, false),
    ('Appreciation Letter', 'APPRECIATION_LETTER', 'Appreciation / recognition letter', false, false),
    ('Termination Letter', 'TERMINATION_LETTER', 'Termination letter', false, false),
    ('Passport', 'PASSPORT', 'Passport', false, true),
    ('Visa', 'VISA', 'Work / travel visa', false, true),
    ('Driving License', 'DRIVING_LICENSE', 'Driving licence', false, true),
    ('Certification', 'CERTIFICATION', 'Professional certification', false, true),
    ('Professional License', 'PROFESSIONAL_LICENSE', 'Professional licence', false, true),
    ('Certificate', 'CERTIFICATE', 'General certificates', false, false),
    ('Other', 'OTHER', 'Other documents', false, false)
) AS t(name, code, description, is_required, requires_expiry)
WHERE o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.document_types dt
    WHERE dt.organization_id = o.id
      AND dt.code = t.code
      AND dt.deleted_at IS NULL
  );

-- -----------------------------------------------------------------------------
-- Default letter templates per organization
-- -----------------------------------------------------------------------------

INSERT INTO hrms.document_templates (
  organization_id, name, letter_type, document_type_code, subject, body_html, is_default, status
)
SELECT
  o.id,
  t.name,
  t.letter_type,
  t.document_type_code,
  t.subject,
  t.body_html,
  true,
  'active'
FROM hrms.organizations o
CROSS JOIN (
  VALUES
    (
      'Default Offer Letter',
      'offer_letter',
      'OFFER_LETTER',
      'Offer of Employment',
      '<p>Dear {{employeeName}},</p><p>We are pleased to offer you the position of <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department at {{companyName}}.</p><p>Employee Code: {{employeeCode}}</p><p>Reporting Manager: {{manager}}</p><p>Proposed CTC: {{salary}}</p><p>Joining Date: {{joiningDate}}</p><p>Please sign and return this letter to confirm your acceptance.</p><p>Regards,<br/>HR Department<br/>{{companyName}}</p><p>{{currentDate}}</p>'
    ),
    (
      'Default Appointment Letter',
      'appointment_letter',
      'APPOINTMENT_LETTER',
      'Appointment Letter',
      '<p>Dear {{employeeName}},</p><p>Congratulations. You are hereby appointed as <strong>{{designation}}</strong> in <strong>{{department}}</strong> effective {{joiningDate}}.</p><p>Employee Code: {{employeeCode}}</p><p>Reporting Manager: {{manager}}</p><p>We welcome you to {{companyName}}.</p><p>Regards,<br/>HR Department<br/>{{companyName}}</p><p>{{currentDate}}</p>'
    ),
    (
      'Default Confirmation Letter',
      'confirmation_letter',
      'CONFIRMATION_LETTER',
      'Confirmation Letter',
      '<p>Dear {{employeeName}},</p><p>We are pleased to confirm your employment as <strong>{{designation}}</strong> in <strong>{{department}}</strong> at {{companyName}}.</p><p>Employee Code: {{employeeCode}}</p><p>Regards,<br/>HR Department<br/>{{companyName}}</p><p>{{currentDate}}</p>'
    ),
    (
      'Default Promotion Letter',
      'promotion_letter',
      'PROMOTION_LETTER',
      'Promotion Letter',
      '<p>Dear {{employeeName}},</p><p>We are delighted to inform you of your promotion to <strong>{{designation}}</strong> in <strong>{{department}}</strong>.</p><p>Employee Code: {{employeeCode}}</p><p>Revised Compensation: {{salary}}</p><p>Effective Date: {{currentDate}}</p><p>Regards,<br/>HR Department<br/>{{companyName}}</p>'
    ),
    (
      'Default Salary Revision Letter',
      'salary_revision_letter',
      'SALARY_REVISION_LETTER',
      'Salary Revision Letter',
      '<p>Dear {{employeeName}},</p><p>Your compensation has been revised as follows:</p><p>Employee Code: {{employeeCode}}</p><p>Designation: {{designation}}</p><p>Department: {{department}}</p><p>Revised CTC: {{salary}}</p><p>Effective Date: {{currentDate}}</p><p>Regards,<br/>HR Department<br/>{{companyName}}</p>'
    ),
    (
      'Default Warning Letter',
      'warning_letter',
      'WARNING_LETTER',
      'Warning Letter',
      '<p>Dear {{employeeName}},</p><p>This letter serves as an official warning regarding your conduct / performance.</p><p>Employee Code: {{employeeCode}}</p><p>Designation: {{designation}}</p><p>Department: {{department}}</p><p>Please treat this matter with seriousness. Further instances may result in disciplinary action.</p><p>Regards,<br/>HR Department<br/>{{companyName}}</p><p>{{currentDate}}</p>'
    ),
    (
      'Default Appreciation Letter',
      'appreciation_letter',
      'APPRECIATION_LETTER',
      'Appreciation Letter',
      '<p>Dear {{employeeName}},</p><p>We appreciate your outstanding contribution as <strong>{{designation}}</strong> in <strong>{{department}}</strong>.</p><p>Employee Code: {{employeeCode}}</p><p>Thank you for your commitment to {{companyName}}.</p><p>Regards,<br/>HR Department<br/>{{companyName}}</p><p>{{currentDate}}</p>'
    ),
    (
      'Default Experience Letter',
      'experience_letter',
      'EXPERIENCE_LETTER',
      'Experience Letter',
      '<p>To Whom It May Concern,</p><p>This is to certify that <strong>{{employeeName}}</strong> ({{employeeCode}}) worked with {{companyName}} as <strong>{{designation}}</strong> in the <strong>{{department}}</strong> department.</p><p>Joining Date: {{joiningDate}}</p><p>We wish them success in future endeavours.</p><p>Regards,<br/>HR Department<br/>{{companyName}}</p><p>{{currentDate}}</p>'
    ),
    (
      'Default Relieving Letter',
      'relieving_letter',
      'RELIEVING_LETTER',
      'Relieving Letter',
      '<p>Dear {{employeeName}},</p><p>This is to confirm that you have been relieved from your duties as <strong>{{designation}}</strong> in <strong>{{department}}</strong> at {{companyName}}.</p><p>Employee Code: {{employeeCode}}</p><p>Joining Date: {{joiningDate}}</p><p>We thank you for your services.</p><p>Regards,<br/>HR Department<br/>{{companyName}}</p><p>{{currentDate}}</p>'
    ),
    (
      'Default Termination Letter',
      'termination_letter',
      'TERMINATION_LETTER',
      'Termination Letter',
      '<p>Dear {{employeeName}},</p><p>This letter confirms the termination of your employment with {{companyName}} in the capacity of <strong>{{designation}}</strong> ({{employeeCode}}).</p><p>Department: {{department}}</p><p>Please complete exit formalities with HR.</p><p>Regards,<br/>HR Department<br/>{{companyName}}</p><p>{{currentDate}}</p>'
    )
) AS t(name, letter_type, document_type_code, subject, body_html)
WHERE o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.document_templates dt
    WHERE dt.organization_id = o.id
      AND dt.letter_type = t.letter_type
      AND dt.is_default = true
      AND dt.deleted_at IS NULL
  );

-- -----------------------------------------------------------------------------
-- Module settings defaults
-- -----------------------------------------------------------------------------

UPDATE hrms.organization_settings
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{documents}',
  COALESCE(settings->'documents', '{
    "documentCategories": [
      "Identity",
      "Employment",
      "Letters",
      "Compliance",
      "Certificates",
      "Other"
    ],
    "allowedFileTypes": ["pdf", "png", "jpg", "jpeg"],
    "maxUploadSizeMb": 10,
    "documentNumberPrefix": "DOC",
    "autoVerification": false,
    "requireHrApprovalForLetters": true,
    "enableEmployeeDownloads": true,
    "retentionPeriodDays": 2555
  }'::jsonb),
  true
),
updated_at = public.utc_now()
WHERE deleted_at IS NULL;

INSERT INTO hrms.organization_settings (organization_id, settings, status)
SELECT
  o.id,
  jsonb_build_object(
    'documents',
    '{
      "documentCategories": [
        "Identity",
        "Employment",
        "Letters",
        "Compliance",
        "Certificates",
        "Other"
      ],
      "allowedFileTypes": ["pdf", "png", "jpg", "jpeg"],
      "maxUploadSizeMb": 10,
      "documentNumberPrefix": "DOC",
      "autoVerification": false,
      "requireHrApprovalForLetters": true,
      "enableEmployeeDownloads": true,
      "retentionPeriodDays": 2555
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
-- Triggers
-- -----------------------------------------------------------------------------

SELECT public.attach_updated_at_trigger('hrms.document_templates'::regclass);
SELECT public.attach_updated_at_trigger('hrms.document_letters'::regclass);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

ALTER TABLE hrms.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.document_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_templates_select_policy ON hrms.document_templates;
CREATE POLICY document_templates_select_policy ON hrms.document_templates
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS document_templates_insert_policy ON hrms.document_templates;
CREATE POLICY document_templates_insert_policy ON hrms.document_templates
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS document_templates_update_policy ON hrms.document_templates;
CREATE POLICY document_templates_update_policy ON hrms.document_templates
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS document_letters_select_policy ON hrms.document_letters;
CREATE POLICY document_letters_select_policy ON hrms.document_letters
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS document_letters_insert_policy ON hrms.document_letters;
CREATE POLICY document_letters_insert_policy ON hrms.document_letters
  FOR INSERT TO authenticated
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS document_letters_update_policy ON hrms.document_letters;
CREATE POLICY document_letters_update_policy ON hrms.document_letters
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));
