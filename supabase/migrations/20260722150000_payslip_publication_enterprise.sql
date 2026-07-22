-- Enterprise payslip publication fields and backfill

ALTER TABLE hrms.payslips
  ADD COLUMN IF NOT EXISTS salary_credit_date date,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS payroll_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'Bank Transfer',
  ADD COLUMN IF NOT EXISTS transaction_reference text,
  ADD COLUMN IF NOT EXISTS payslip_version text NOT NULL DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;

COMMENT ON COLUMN hrms.payslips.salary_credit_date IS
  'Date salary is credited to employee account (always 2nd of payroll month).';
COMMENT ON COLUMN hrms.payslips.published_at IS
  'When employees may view/download payslip (5th of payroll month, 00:00 IST).';
COMMENT ON COLUMN hrms.payslips.payroll_generated_at IS
  'When HR payroll engine generated this payslip record.';
COMMENT ON COLUMN hrms.payslips.email_sent_at IS
  'When payslip-ready email was delivered to the employee.';

-- Backfill existing payslips from payroll_month
UPDATE hrms.payslips ps
SET
  salary_credit_date = COALESCE(
    ps.salary_credit_date,
    (date_trunc('month', p.payroll_month)::date + interval '1 day')::date
  ),
  published_at = COALESCE(
    ps.published_at,
    ((date_trunc('month', p.payroll_month)::date + interval '4 days')::timestamp AT TIME ZONE 'Asia/Kolkata')
  ),
  payroll_generated_at = COALESCE(ps.payroll_generated_at, ps.issued_at, ps.created_at),
  payment_mode = COALESCE(ps.payment_mode, 'Bank Transfer'),
  payslip_version = COALESCE(ps.payslip_version, '1.0')
FROM hrms.payrolls p
WHERE p.id = ps.payroll_id
  AND ps.deleted_at IS NULL;
