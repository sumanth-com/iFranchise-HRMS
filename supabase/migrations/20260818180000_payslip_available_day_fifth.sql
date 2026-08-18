-- Employees can open payslips on the 5th of the payroll month (00:00 IST).
-- Salary credit day stays on the 2nd.

UPDATE hrms.organization_settings
SET
  settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{payroll}',
    COALESCE(settings->'payroll', '{}'::jsonb) || jsonb_build_object('payslip_available_day', 5),
    true
  ),
  updated_at = public.utc_now()
WHERE deleted_at IS NULL;

UPDATE hrms.payslips ps
SET
  published_at = (
    (date_trunc('month', p.payroll_month)::date + interval '4 days')::timestamp
    AT TIME ZONE 'Asia/Kolkata'
  ),
  updated_at = public.utc_now()
FROM hrms.payrolls p
WHERE p.id = ps.payroll_id
  AND ps.deleted_at IS NULL;

COMMENT ON COLUMN hrms.payslips.published_at IS
  'When employees may view/download the payslip (5th of the payroll month, 00:00 IST).';
