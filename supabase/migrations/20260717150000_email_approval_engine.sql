-- Universal Email Approval Engine
-- Adds a generic, single-use signed-token store that powers "approve/reject from
-- email" for any approval-based module (leave first, then attendance, expenses, etc.),
-- plus an approval-method marker on leave approvals so history can show Email vs Portal.

-- ---------------------------------------------------------------------------
-- 1) Generic email approval token store
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hrms.email_approval_tokens (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  -- Generic request classification so the same engine serves many modules.
  request_type text NOT NULL,
  source_module hrms.notification_module NOT NULL DEFAULT 'leave',
  source_record_id uuid NOT NULL,
  approval_record_id uuid,
  approver_employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE CASCADE,
  approver_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  role_code text NOT NULL,
  -- Only an HMAC hash of the emailed secret is stored (never the raw token).
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  consumed_action text CHECK (consumed_action IN ('approved', 'rejected')),
  consumed_ip text,
  consumed_user_agent text,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS email_approval_tokens_hash_idx
  ON hrms.email_approval_tokens (token_hash);

CREATE INDEX IF NOT EXISTS email_approval_tokens_record_idx
  ON hrms.email_approval_tokens (request_type, source_record_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS email_approval_tokens_approver_idx
  ON hrms.email_approval_tokens (approver_employee_id)
  WHERE deleted_at IS NULL;

SELECT public.attach_updated_at_trigger('hrms.email_approval_tokens'::regclass);

ALTER TABLE hrms.email_approval_tokens ENABLE ROW LEVEL SECURITY;

-- Approval history / audit read access is org-scoped. Writes happen exclusively
-- through the service-role admin client (which bypasses RLS), so there are
-- intentionally no INSERT/UPDATE/DELETE policies for authenticated users:
-- tokens are secrets and must never be mutated from the client.
DROP POLICY IF EXISTS email_approval_tokens_select_policy ON hrms.email_approval_tokens;
CREATE POLICY email_approval_tokens_select_policy ON hrms.email_approval_tokens
  FOR SELECT TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id) AND deleted_at IS NULL);

-- ---------------------------------------------------------------------------
-- 2) Track how each approval step was actioned (portal vs email)
-- ---------------------------------------------------------------------------
ALTER TABLE hrms.leave_approvals
  ADD COLUMN IF NOT EXISTS acted_via text NOT NULL DEFAULT 'portal'
    CHECK (acted_via IN ('portal', 'email'));

COMMENT ON TABLE hrms.email_approval_tokens IS
  'Single-use, HMAC-signed tokens backing the Universal Email Approval Engine (approve/reject from email).';
COMMENT ON COLUMN hrms.leave_approvals.acted_via IS
  'Channel the approval action came through: portal or email.';
