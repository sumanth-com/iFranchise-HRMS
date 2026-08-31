-- Monthly accrual support for Casual Leave (CL) and Earned Leave (EL).
-- accrued_through_month tracks the last calendar month for which +1 was applied
-- (idempotent). Existing balances are baselined to the current month without
-- granting duplicate historical accruals.

ALTER TABLE hrms.leave_balances
  ADD COLUMN IF NOT EXISTS accrued_through_month date;

COMMENT ON COLUMN hrms.leave_balances.accrued_through_month IS
  'First day of the last calendar month for which monthly accrual (+1) was applied for CL/EL. NULL means not yet baselined.';

-- Baseline existing CL/EL rows to the current month (no allocation change).
UPDATE hrms.leave_balances lb
SET
  accrued_through_month = date_trunc('month', CURRENT_DATE)::date,
  updated_at = public.utc_now()
FROM hrms.leave_types lt
WHERE lb.leave_type_id = lt.id
  AND lb.deleted_at IS NULL
  AND lt.deleted_at IS NULL
  AND upper(lt.code) IN ('CL', 'EL')
  AND lb.accrued_through_month IS NULL;

-- Document CL/EL as 12 days/year potential (1/month); keep SL/PL entitlements unchanged.
UPDATE hrms.leave_types
SET
  days_per_year = 12,
  is_carry_forward = true,
  max_carry_forward_days = GREATEST(COALESCE(max_carry_forward_days, 0), 12),
  updated_at = public.utc_now()
WHERE upper(code) IN ('CL', 'EL')
  AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS leave_balances_accrued_through_month_idx
  ON hrms.leave_balances (accrued_through_month)
  WHERE deleted_at IS NULL AND accrued_through_month IS NOT NULL;
