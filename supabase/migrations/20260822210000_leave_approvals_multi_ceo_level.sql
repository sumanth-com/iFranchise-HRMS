-- Allow multiple active CEO approvers at the same leave request level (any-of approval).

DROP INDEX IF EXISTS hrms.leave_approvals_unique_active_level_idx;

CREATE UNIQUE INDEX IF NOT EXISTS leave_approvals_unique_active_level_approver_idx
  ON hrms.leave_approvals (leave_request_id, approval_level, approver_employee_id)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX hrms.leave_approvals_unique_active_level_approver_idx IS
  'One active approval step per leave request level and approver; supports parallel CEO queues.';
