-- Ensure it@ifranchise.in remains a visible active employee (Technology / Super Admin)
-- and restore soft-deleted payroll_items that block re-inclusion via UNIQUE(payroll_id, employee_id).
-- Idempotent: no duplicate employees; no invented salary rows.

DO $$
DECLARE
  v_org_id uuid := 'a0000000-0000-4000-8000-000000000001';
  v_it_email text := 'it@ifranchise.in';
  v_it_code text := 'IF2026000';
  v_tech_dept_id uuid := 'a0000000-0000-4000-8000-000000000206';
  v_it_employee_id uuid;
  v_it_user_id uuid;
  v_super_admin_role_id uuid;
BEGIN
  SELECT id INTO v_tech_dept_id
  FROM hrms.departments
  WHERE organization_id = v_org_id
    AND deleted_at IS NULL
    AND (
      id = 'a0000000-0000-4000-8000-000000000206'
      OR lower(code) = 'tech'
      OR lower(name) = 'technology'
    )
  ORDER BY CASE WHEN id = 'a0000000-0000-4000-8000-000000000206' THEN 0 ELSE 1 END
  LIMIT 1;

  SELECT id, user_id INTO v_it_employee_id, v_it_user_id
  FROM hrms.employees
  WHERE organization_id = v_org_id
    AND deleted_at IS NULL
    AND (
      lower(email::text) = v_it_email
      OR employee_code = v_it_code
    )
  ORDER BY CASE WHEN lower(email::text) = v_it_email THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_it_employee_id IS NULL THEN
    RAISE NOTICE 'IT employee record not found; skipping employee restore';
  ELSE
    -- Keep single canonical row; refresh visibility + Technology dept when present.
    UPDATE hrms.employees
    SET
      email = v_it_email,
      employment_status = 'active'::hrms.employment_status,
      app_hidden_at = NULL,
      deleted_at = NULL,
      department_id = COALESCE(v_tech_dept_id, department_id),
      updated_at = public.utc_now()
    WHERE id = v_it_employee_id;

    -- Ensure Super Admin role assignment exists (do not remove other roles).
    SELECT id INTO v_super_admin_role_id
    FROM hrms.roles
    WHERE organization_id = v_org_id
      AND code = 'super_admin'
      AND deleted_at IS NULL
    LIMIT 1;

    IF v_super_admin_role_id IS NOT NULL AND v_it_user_id IS NOT NULL THEN
      INSERT INTO hrms.user_roles (organization_id, user_id, employee_id, role_id, status)
      SELECT
        v_org_id,
        v_it_user_id,
        v_it_employee_id,
        v_super_admin_role_id,
        'active'::hrms.record_status
      WHERE NOT EXISTS (
        SELECT 1
        FROM hrms.user_roles ur
        WHERE ur.employee_id = v_it_employee_id
          AND ur.role_id = v_super_admin_role_id
          AND ur.deleted_at IS NULL
      );
    END IF;
  END IF;
END $$;

-- Restore soft-deleted payroll items for active, visible employees on unlocked runs.
-- Unique(payroll_id, employee_id) otherwise permanently hides them from Team Payroll.
-- Skip known directory/payroll exclusions (same intent as isExcludedFromTeamPayslips).
UPDATE hrms.payroll_items pi
SET
  deleted_at = NULL,
  updated_at = public.utc_now()
FROM hrms.payrolls p,
     hrms.employees e
LEFT JOIN hrms.designations des ON des.id = e.designation_id
WHERE pi.payroll_id = p.id
  AND e.id = pi.employee_id
  AND pi.deleted_at IS NOT NULL
  AND p.deleted_at IS NULL
  AND COALESCE(p.is_locked, false) = false
  AND e.deleted_at IS NULL
  AND e.app_hidden_at IS NULL
  AND e.employment_status IN ('active', 'probation', 'on_leave')
  AND upper(replace(e.employee_code, ' ', '')) NOT IN ('IF-MGR-001', 'IF2026016')
  AND lower(trim(coalesce(e.first_name, '') || ' ' || coalesce(e.last_name, ''))) <> 'marketing manager'
  AND lower(trim(coalesce(e.first_name, '') || ' ' || coalesce(e.last_name, ''))) NOT LIKE '%abrar%'
  AND NOT (
    lower(trim(coalesce(e.first_name, '') || ' ' || coalesce(e.last_name, ''))) LIKE '%abdul%'
    AND (
      lower(trim(coalesce(e.first_name, '') || ' ' || coalesce(e.last_name, ''))) LIKE '%khader%'
      OR lower(trim(coalesce(e.first_name, '') || ' ' || coalesce(e.last_name, ''))) LIKE '%khadir%'
    )
  )
  AND NOT (
    lower(trim(coalesce(e.first_name, '') || ' ' || coalesce(e.last_name, ''))) LIKE '%gore%'
    AND (
      lower(trim(coalesce(e.first_name, '') || ' ' || coalesce(e.last_name, ''))) LIKE '%abhisek%'
      OR lower(trim(coalesce(e.first_name, '') || ' ' || coalesce(e.last_name, ''))) LIKE '%abhishake%'
      OR lower(trim(coalesce(e.first_name, '') || ' ' || coalesce(e.last_name, ''))) LIKE '%abhishek%'
    )
  )
  AND lower(trim(coalesce(des.title, ''))) <> 'marketing manager'
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.payroll_items active_pi
    WHERE active_pi.payroll_id = pi.payroll_id
      AND active_pi.employee_id = pi.employee_id
      AND active_pi.deleted_at IS NULL
      AND active_pi.id <> pi.id
  );
