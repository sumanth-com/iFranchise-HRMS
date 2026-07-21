-- Employee invitation token + expiry for enterprise onboarding workflow

ALTER TABLE hrms.employees
  ADD COLUMN IF NOT EXISTS invitation_token text,
  ADD COLUMN IF NOT EXISTS invitation_expires_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS employees_invitation_token_active_idx
  ON hrms.employees (invitation_token)
  WHERE deleted_at IS NULL AND invitation_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS employees_invitation_expires_at_idx
  ON hrms.employees (invitation_expires_at)
  WHERE invitation_expires_at IS NOT NULL AND deleted_at IS NULL;
