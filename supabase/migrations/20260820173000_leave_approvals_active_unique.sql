-- Soft-deleted leave approval steps must not block re-routing HR leave to CEO.

ALTER TABLE hrms.leave_approvals
  DROP CONSTRAINT IF EXISTS leave_approvals_unique_level;

CREATE UNIQUE INDEX IF NOT EXISTS leave_approvals_unique_active_level_idx
  ON hrms.leave_approvals (leave_request_id, approval_level)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX hrms.leave_approvals_unique_active_level_idx IS
  'One active approval step per leave request level; soft-deleted rows are ignored.';
