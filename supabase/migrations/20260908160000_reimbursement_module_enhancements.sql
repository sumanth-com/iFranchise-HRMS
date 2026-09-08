-- Reimbursement module enhancements: categories, attachments, remarks, role grants.
-- Additive only — does not alter payroll calculation formulas or other modules.

-- New claim categories (Food/Fuel/Travel/Other already exist)
DO $$ BEGIN
  ALTER TYPE hrms.reimbursement_category ADD VALUE 'hotel_accommodation';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE hrms.reimbursement_category ADD VALUE 'medical';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE hrms.reimbursement_category ADD VALUE 'telephone';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE hrms.employee_reimbursements
  ADD COLUMN IF NOT EXISTS receipt_paths jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE hrms.employee_reimbursements
  ADD COLUMN IF NOT EXISTS review_remarks text;

COMMENT ON COLUMN hrms.employee_reimbursements.receipt_paths IS
  'JSON array of storage paths for receipt images/PDFs (max enforced in app).';
COMMENT ON COLUMN hrms.employee_reimbursements.review_remarks IS
  'Optional HR/CEO remark on approve or reject.';

-- Backfill receipt_paths from legacy single receipt_path
UPDATE hrms.employee_reimbursements
SET receipt_paths = jsonb_build_array(receipt_path)
WHERE receipt_path IS NOT NULL
  AND receipt_path <> ''
  AND (
    receipt_paths IS NULL
    OR receipt_paths = '[]'::jsonb
  );

-- Employee self-service: view + create own claims (ownership enforced in app)
INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'::hrms.record_status
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'employee'
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND p.code IN ('reimbursement.view', 'reimbursement.create')
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  );

-- Manager self-service create/view (team approval stays HR/CEO)
INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'::hrms.record_status
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'manager'
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND p.code IN ('reimbursement.view', 'reimbursement.create')
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  );

-- CEO / Founder / Co-Founder: org-wide view + approve
INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'::hrms.record_status
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code IN ('ceo', 'founder', 'co_founder')
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND p.code IN ('reimbursement.view', 'reimbursement.approve')
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  );
