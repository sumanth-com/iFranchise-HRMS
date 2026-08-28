-- 1:1 meetings are now read from both participant sides, so the invitee column
-- needs the same index the scheduler column already has.
CREATE INDEX IF NOT EXISTS performance_one_on_ones_manager_employee_idx
  ON hrms.performance_one_on_ones (manager_employee_id);
