-- Register monthly payroll generation job metadata (idempotent).
-- Actual trigger: GET /api/cron/generate-monthly-payroll with CRON_SECRET.
-- Payslip employee access remains gated by published_at (5th of following month, IST).

INSERT INTO hrms.system_scheduled_jobs (organization_id, job_key, job_name, schedule, last_status)
SELECT o.id, v.job_key, v.job_name, v.schedule, 'idle'
FROM hrms.organizations o
CROSS JOIN (
  VALUES
    ('monthly_payroll_generate', 'Monthly Payroll Generate', '15 1 1 * *')
) AS v(job_key, job_name, schedule)
WHERE o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM hrms.system_scheduled_jobs j
    WHERE j.organization_id = o.id AND j.job_key = v.job_key
  );
