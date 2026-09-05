-- Seed employee document explorer slots (education, payroll/tax, previous employment, other).
-- Idempotent per organization + code.

INSERT INTO hrms.document_types (
  organization_id, name, code, description, is_required, requires_expiry, status
)
SELECT
  o.id,
  t.name,
  t.code,
  t.description,
  t.is_required,
  false,
  'active'
FROM hrms.organizations o
CROSS JOIN (
  VALUES
    ('10th Class (all in one PDF)', 'EDUCATION_10TH', 'Class 10 marksheets and certificates combined', false),
    ('Intermediate / Diploma', 'EDUCATION_INTERMEDIATE', 'Intermediate or diploma documents combined', false),
    ('Graduation (all in one PDF)', 'EDUCATION_GRADUATION', 'Graduation certificates and transcripts combined', false),
    ('Additional Education Document', 'EDUCATION_ADDITIONAL', 'Any other education document', false),
    ('Payslip', 'PAYSLIP', 'Monthly payslip (select year and month)', false),
    ('Form 16', 'FORM_16', 'Annual Form 16 (select financial year)', false),
    ('Tax Document', 'TAX_DOCUMENT', 'Tax proofs and related documents', false),
    ('Previous Offer Letter', 'PREVIOUS_OFFER_LETTER', 'Offer letter from previous employer', false),
    ('Previous Employment Payslips', 'PREVIOUS_PAYSLIPS', 'Payslips from previous employer', false),
    ('Document 1', 'OTHER_SLOT_1', 'Custom document slot — rename as needed', false),
    ('Document 2', 'OTHER_SLOT_2', 'Custom document slot — rename as needed', false),
    ('Document 3', 'OTHER_SLOT_3', 'Custom document slot — rename as needed', false)
) AS t(name, code, description, is_required)
WHERE o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.document_types dt
    WHERE dt.organization_id = o.id
      AND dt.code = t.code
      AND dt.deleted_at IS NULL
  );

-- Align certification display names with the employee explorer slots.
UPDATE hrms.document_types
SET
  name = 'Professional Certificate (all in one PDF)',
  description = 'Professional certificates combined in one PDF',
  updated_at = now()
WHERE code = 'CERTIFICATION'
  AND deleted_at IS NULL;

UPDATE hrms.document_types
SET
  name = 'Professional License Certificate',
  description = 'Professional licence certificate',
  updated_at = now()
WHERE code = 'PROFESSIONAL_LICENSE'
  AND deleted_at IS NULL;
