-- =============================================================================
-- Migration: iam_provisionable_roles
-- Description: Database-driven executive user provisioning — provisionable
--              role flags, portal mapping, and invitation notes on employees.
-- =============================================================================

ALTER TABLE hrms.roles
  ADD COLUMN IF NOT EXISTS is_provisionable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS portal_key text;

ALTER TABLE hrms.employees
  ADD COLUMN IF NOT EXISTS invitation_notes text;

COMMENT ON COLUMN hrms.roles.is_provisionable IS
  'When true, the role may be assigned via the User Provisioning module (executive IAM).';
COMMENT ON COLUMN hrms.roles.portal_key IS
  'Primary portal for this role: hr, ceo, or manager. Used for IAM UI and routing hints.';
COMMENT ON COLUMN hrms.employees.invitation_notes IS
  'Optional notes captured when an executive user invitation was sent.';

-- Portal mapping for executive / privileged roles (never employee).
UPDATE hrms.roles
SET
  is_provisionable = true,
  portal_key = CASE code
    WHEN 'founder' THEN 'ceo'
    WHEN 'co_founder' THEN 'ceo'
    WHEN 'ceo' THEN 'ceo'
    WHEN 'hr_admin' THEN 'hr'
    WHEN 'hr_executive' THEN 'hr'
    WHEN 'manager' THEN 'manager'
    ELSE portal_key
  END,
  updated_at = public.utc_now()
WHERE organization_id = 'a0000000-0000-4000-8000-000000000001'
  AND code IN ('founder', 'co_founder', 'ceo', 'hr_admin', 'hr_executive', 'manager')
  AND deleted_at IS NULL;

-- Employee and system roles must never be provisioned from IAM.
UPDATE hrms.roles
SET is_provisionable = false, updated_at = public.utc_now()
WHERE organization_id = 'a0000000-0000-4000-8000-000000000001'
  AND code IN ('employee', 'super_admin')
  AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS roles_is_provisionable_idx
  ON hrms.roles (organization_id, is_provisionable)
  WHERE deleted_at IS NULL AND status = 'active';
