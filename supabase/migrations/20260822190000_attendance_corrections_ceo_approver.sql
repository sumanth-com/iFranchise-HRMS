-- CEO-only approval routing for HR/Manager attendance regularization
ALTER TABLE hrms.attendance_corrections
  ADD COLUMN IF NOT EXISTS approver_employee_id uuid REFERENCES hrms.employees (id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS attendance_corrections_approver_employee_id_idx
  ON hrms.attendance_corrections (approver_employee_id)
  WHERE approver_employee_id IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN hrms.attendance_corrections.approver_employee_id IS
  'When set, only this CEO employee may approve/reject the correction (HR/Manager self-service requests). NULL preserves existing employee workflow.';
