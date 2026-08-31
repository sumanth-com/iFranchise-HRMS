-- Hide specific Gmail duplicate/shell employee profiles from the HRMS app
-- without soft-deleting them or cascading related history.
--
-- Do NOT use a broad "@gmail.com" rule — only the explicit emails below.
-- it@ifranchise.in must remain visible.

ALTER TABLE hrms.employees
  ADD COLUMN IF NOT EXISTS app_hidden_at timestamptz NULL;

COMMENT ON COLUMN hrms.employees.app_hidden_at IS
  'When set, employee is retained for history but excluded from HRMS UI, search, selectors, and portal login.';

CREATE INDEX IF NOT EXISTS idx_employees_app_hidden_at
  ON hrms.employees (organization_id)
  WHERE app_hidden_at IS NULL AND deleted_at IS NULL;

-- Explicit duplicate / test Gmail shell profiles (last_name "Employee" portal shells).
-- Legitimate company staff with personal Gmail (e.g. Akshita, Abdul) are NOT included.
UPDATE hrms.employees
SET
  app_hidden_at = public.utc_now(),
  updated_at = public.utc_now()
WHERE deleted_at IS NULL
  AND app_hidden_at IS NULL
  AND lower(email::text) IN (
    'codegai.official@gmail.com',
    'hello.codegai@gmail.com',
    'hemavathivennapusa2004@gmail.com',
    'ifranchiseemployee@gmail.com',
    'ifranchisehr@gmail.com',
    'shwetha3212@gmail.com',
    'support.suprabase@gmail.com'
  )
  AND lower(email::text) <> 'it@ifranchise.in';

-- Safety: never hide the authoritative IT system account.
UPDATE hrms.employees
SET
  app_hidden_at = NULL,
  updated_at = public.utc_now()
WHERE lower(email::text) = 'it@ifranchise.in'
  AND app_hidden_at IS NOT NULL;

-- Enforce at RLS so authenticated reads (lists, joins, detail) cannot expose hidden rows.
DROP POLICY IF EXISTS employees_select_policy ON hrms.employees;
CREATE POLICY employees_select_policy ON hrms.employees
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND app_hidden_at IS NULL
    AND (
      hrms.user_belongs_to_organization(organization_id)
      OR id = hrms.current_user_employee_id()
    )
  );
