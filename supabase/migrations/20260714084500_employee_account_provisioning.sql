-- =============================================================================
-- Migration: employee_account_provisioning
-- Description: Employee account lifecycle fields and HR account permissions
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE hrms.employee_account_status AS ENUM (
    'draft',
    'invited',
    'invitation_pending',
    'active',
    'inactive',
    'suspended'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE hrms.employees
  ADD COLUMN IF NOT EXISTS account_status hrms.employee_account_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS invitation_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS invitation_cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS password_last_reset_at timestamptz,
  ADD COLUMN IF NOT EXISTS account_suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS account_deactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS account_activated_at timestamptz;

CREATE INDEX IF NOT EXISTS employees_account_status_idx
  ON hrms.employees (account_status);
CREATE INDEX IF NOT EXISTS employees_last_login_at_idx
  ON hrms.employees (last_login_at);
CREATE INDEX IF NOT EXISTS employees_invitation_sent_at_idx
  ON hrms.employees (invitation_sent_at);

UPDATE hrms.employees
SET account_status = 'active',
    first_login_at = COALESCE(first_login_at, created_at),
    last_login_at = COALESCE(last_login_at, updated_at),
    account_activated_at = COALESCE(account_activated_at, updated_at)
WHERE user_id IS NOT NULL
  AND account_status = 'draft'
  AND deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- Permissions
-- -----------------------------------------------------------------------------

INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT v.code, v.module, v.action, v.resource, v.description, v.status::hrms.record_status
FROM (VALUES
  ('employee_account.invite', 'employees', 'invite', 'employee_account', 'Invite employees to create login accounts', 'active'),
  ('employee_account.reset_password', 'employees', 'reset_password', 'employee_account', 'Send employee password reset emails', 'active'),
  ('employee_account.suspend', 'employees', 'suspend', 'employee_account', 'Suspend employee login accounts', 'active'),
  ('employee_account.activate', 'employees', 'activate', 'employee_account', 'Activate or reactivate employee login accounts', 'active'),
  ('employee_account.deactivate', 'employees', 'deactivate', 'employee_account', 'Deactivate employee login accounts', 'active'),
  ('employee_account.cancel_invitation', 'employees', 'cancel_invitation', 'employee_account', 'Cancel pending employee account invitations', 'active')
) AS v(code, module, action, resource, description, status)
WHERE NOT EXISTS (
  SELECT 1 FROM hrms.permissions p WHERE p.code = v.code AND p.deleted_at IS NULL
);

INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'::hrms.record_status
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code IN ('super_admin', 'hr_admin')
  AND r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND p.code IN (
    'employee_account.invite',
    'employee_account.reset_password',
    'employee_account.suspend',
    'employee_account.activate',
    'employee_account.deactivate',
    'employee_account.cancel_invitation'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  );
