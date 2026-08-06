-- Standardize salary credit day to the 2nd of each month (company policy).

UPDATE hrms.organization_settings
SET
  settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{payroll}',
    COALESCE(settings->'payroll', '{}'::jsonb) || jsonb_build_object('salary_credit_date', 2),
    true
  ),
  updated_at = public.utc_now()
WHERE deleted_at IS NULL
  AND (
    settings->'payroll'->>'salary_credit_date' IS NULL
    OR settings->'payroll'->>'salary_credit_date' = '1'
  );
