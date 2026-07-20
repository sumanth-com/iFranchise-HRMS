-- Ensure seeded workforce employees (including IF2026016) are active across HRMS modules.

UPDATE hrms.employees
SET
  account_status = 'active',
  account_activated_at = COALESCE(account_activated_at, date_of_joining::timestamptz, public.utc_now()),
  updated_at = public.utc_now()
WHERE organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid
  AND deleted_at IS NULL
  AND date_of_joining IS NOT NULL
  AND date_of_joining <= CURRENT_DATE
  AND employment_status IN ('active', 'probation', 'on_leave')
  AND account_status = 'draft';

-- Refresh full workforce seed data (profiles, leave, attendance, documents, etc.).
SELECT hrms.seed_ifranchise_employees();
