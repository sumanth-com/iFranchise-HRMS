-- =============================================================================
-- Authentication and role mapping foundation
-- =============================================================================

INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT v.code, v.module, v.action, v.resource, v.description, v.status::hrms.record_status
FROM (VALUES
  ('portal.hr.access', 'portal', 'access', 'hr', 'Access HR dashboard portal', 'active'),
  ('portal.ceo.access', 'portal', 'access', 'ceo', 'Access CEO portal', 'active'),
  ('portal.manager.access', 'portal', 'access', 'manager', 'Access manager portal', 'active'),
  ('portal.employee.access', 'portal', 'access', 'employee', 'Access employee portal', 'active')
) AS v(code, module, action, resource, description, status)
WHERE NOT EXISTS (
  SELECT 1 FROM hrms.permissions p WHERE p.code = v.code AND p.deleted_at IS NULL
);

UPDATE hrms.permissions p
SET
  module = v.module,
  action = v.action,
  resource = v.resource,
  description = v.description,
  status = 'active',
  updated_at = public.utc_now(),
  deleted_at = NULL
FROM (VALUES
  ('portal.hr.access', 'portal', 'access', 'hr', 'Access HR dashboard portal'),
  ('portal.ceo.access', 'portal', 'access', 'ceo', 'Access CEO portal'),
  ('portal.manager.access', 'portal', 'access', 'manager', 'Access manager portal'),
  ('portal.employee.access', 'portal', 'access', 'employee', 'Access employee portal')
) AS v(code, module, action, resource, description)
WHERE p.code = v.code;

INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT r.id, p.id, 'active'
FROM hrms.roles r
JOIN hrms.permissions p
  ON (
    (r.code IN ('super_admin', 'hr_admin') AND p.code = 'portal.hr.access')
    OR (r.code = 'ceo' AND p.code = 'portal.ceo.access')
    OR (r.code = 'manager' AND p.code = 'portal.manager.access')
    OR (r.code = 'employee' AND p.code = 'portal.employee.access')
  )
WHERE r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND rp.deleted_at IS NULL
  );

UPDATE hrms.role_permissions rp
SET status = 'active', updated_at = public.utc_now(), deleted_at = NULL
FROM hrms.roles r
JOIN hrms.permissions p
  ON (
    (r.code IN ('super_admin', 'hr_admin') AND p.code = 'portal.hr.access')
    OR (r.code = 'ceo' AND p.code = 'portal.ceo.access')
    OR (r.code = 'manager' AND p.code = 'portal.manager.access')
    OR (r.code = 'employee' AND p.code = 'portal.employee.access')
  )
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id;

DO $$
DECLARE
  v_org_id uuid;
  v_branch_id uuid;
  v_full_time_id uuid;
  v_hr_dept_id uuid;
  v_admin_dept_id uuid;
  v_marketing_dept_id uuid;
  v_tech_dept_id uuid;
  v_hr_designation_id uuid;
  v_ceo_designation_id uuid;
  v_manager_designation_id uuid;
  v_employee_designation_id uuid;
  v_hr_employee_id uuid;
  v_ceo_employee_id uuid;
  v_manager_employee_id uuid;
  v_employee_id uuid;
  v_auth_user_id uuid;
  v_role_id uuid;
BEGIN
  SELECT id INTO v_org_id FROM hrms.organizations WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1;
  SELECT id INTO v_branch_id FROM hrms.branches WHERE organization_id = v_org_id AND deleted_at IS NULL ORDER BY created_at LIMIT 1;
  SELECT id INTO v_full_time_id FROM hrms.employment_types WHERE code = 'FULL_TIME' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO v_hr_dept_id FROM hrms.departments WHERE code = 'HR' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO v_admin_dept_id FROM hrms.departments WHERE code = 'ADMIN' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO v_marketing_dept_id FROM hrms.departments WHERE code = 'MARKETING' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO v_tech_dept_id FROM hrms.departments WHERE code = 'TECH' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO v_hr_designation_id FROM hrms.designations WHERE code = 'HR_MANAGER' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO v_manager_designation_id FROM hrms.designations WHERE code = 'MARKETING_MANAGER' AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO v_employee_designation_id FROM hrms.designations WHERE code = 'WEBSITE_DEVELOPER_INTERN' AND deleted_at IS NULL LIMIT 1;

  INSERT INTO hrms.designations (organization_id, title, code, description, status)
  SELECT v_org_id, 'Chief Executive Officer', 'CEO', 'Executive leadership role', 'active'
  WHERE NOT EXISTS (
    SELECT 1 FROM hrms.designations WHERE organization_id = v_org_id AND code = 'CEO' AND deleted_at IS NULL
  );
  SELECT id INTO v_ceo_designation_id
  FROM hrms.designations
  WHERE organization_id = v_org_id AND code = 'CEO' AND deleted_at IS NULL
  LIMIT 1;

  -- HR: sumanth.reddy@ifranchise.in
  SELECT id INTO v_auth_user_id FROM auth.users WHERE lower(email) = 'sumanth.reddy@ifranchise.in' LIMIT 1;
  IF v_auth_user_id IS NOT NULL THEN
    SELECT id INTO v_hr_employee_id FROM hrms.employees WHERE organization_id = v_org_id AND lower(email::text) = 'sumanth.reddy@ifranchise.in' AND deleted_at IS NULL LIMIT 1;
    UPDATE hrms.employees SET user_id = NULL WHERE user_id = v_auth_user_id AND id <> v_hr_employee_id AND deleted_at IS NULL;
    UPDATE hrms.employees
    SET
      user_id = v_auth_user_id,
      department_id = COALESCE(department_id, v_hr_dept_id),
      designation_id = COALESCE(designation_id, v_hr_designation_id),
      employment_type_id = COALESCE(employment_type_id, v_full_time_id),
      employment_status = CASE WHEN employment_status = 'draft' THEN 'active'::hrms.employment_status ELSE employment_status END,
      account_status = 'active',
      status = 'active',
      updated_at = public.utc_now(),
      deleted_at = NULL
    WHERE id = v_hr_employee_id
    RETURNING id INTO v_hr_employee_id;

    SELECT id INTO v_role_id FROM hrms.roles WHERE organization_id = v_org_id AND code = 'hr_admin' AND deleted_at IS NULL LIMIT 1;
    IF v_role_id IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM hrms.user_roles WHERE user_id = v_auth_user_id AND role_id = v_role_id AND organization_id = v_org_id) THEN
        UPDATE hrms.user_roles SET employee_id = v_hr_employee_id, status = 'active', deleted_at = NULL, updated_at = public.utc_now()
        WHERE user_id = v_auth_user_id AND role_id = v_role_id AND organization_id = v_org_id;
      ELSE
        INSERT INTO hrms.user_roles (organization_id, user_id, employee_id, role_id, status)
        VALUES (v_org_id, v_auth_user_id, v_hr_employee_id, v_role_id, 'active');
      END IF;
    END IF;
  END IF;

  -- CEO: contact@ifranchise.in
  SELECT id INTO v_auth_user_id FROM auth.users WHERE lower(email) = 'contact@ifranchise.in' LIMIT 1;
  IF v_auth_user_id IS NOT NULL THEN
    SELECT id INTO v_ceo_employee_id FROM hrms.employees WHERE organization_id = v_org_id AND lower(email::text) = 'contact@ifranchise.in' AND deleted_at IS NULL LIMIT 1;
    UPDATE hrms.employees SET user_id = NULL WHERE user_id = v_auth_user_id AND id <> v_ceo_employee_id AND deleted_at IS NULL;
    IF v_ceo_employee_id IS NULL THEN
      INSERT INTO hrms.employees (
        organization_id, branch_id, department_id, designation_id, employment_type_id, user_id,
        employee_code, first_name, last_name, email, employment_status, date_of_joining, status, account_status
      )
      VALUES (
        v_org_id, v_branch_id, v_admin_dept_id, v_ceo_designation_id, v_full_time_id, v_auth_user_id,
        'IF-CEO-001', 'Chief', 'Executive', 'contact@ifranchise.in', 'active', CURRENT_DATE, 'active', 'active'
      )
      RETURNING id INTO v_ceo_employee_id;
    ELSE
      UPDATE hrms.employees
      SET user_id = v_auth_user_id, department_id = v_admin_dept_id, designation_id = v_ceo_designation_id,
          employment_type_id = COALESCE(employment_type_id, v_full_time_id), reporting_manager_id = NULL,
          employment_status = 'active', account_status = 'active', status = 'active', updated_at = public.utc_now(), deleted_at = NULL
      WHERE id = v_ceo_employee_id;
    END IF;

    SELECT id INTO v_role_id FROM hrms.roles WHERE organization_id = v_org_id AND code = 'ceo' AND deleted_at IS NULL LIMIT 1;
    IF v_role_id IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM hrms.user_roles WHERE user_id = v_auth_user_id AND role_id = v_role_id AND organization_id = v_org_id) THEN
        UPDATE hrms.user_roles SET employee_id = v_ceo_employee_id, status = 'active', deleted_at = NULL, updated_at = public.utc_now()
        WHERE user_id = v_auth_user_id AND role_id = v_role_id AND organization_id = v_org_id;
      ELSE
        INSERT INTO hrms.user_roles (organization_id, user_id, employee_id, role_id, status)
        VALUES (v_org_id, v_auth_user_id, v_ceo_employee_id, v_role_id, 'active');
      END IF;
    END IF;
  END IF;

  -- Manager: marketing@ifranchise.in
  SELECT id INTO v_auth_user_id FROM auth.users WHERE lower(email) = 'marketing@ifranchise.in' LIMIT 1;
  IF v_auth_user_id IS NOT NULL THEN
    SELECT id INTO v_manager_employee_id FROM hrms.employees WHERE organization_id = v_org_id AND lower(email::text) = 'marketing@ifranchise.in' AND deleted_at IS NULL LIMIT 1;
    UPDATE hrms.employees SET user_id = NULL WHERE user_id = v_auth_user_id AND id <> v_manager_employee_id AND deleted_at IS NULL;
    IF v_manager_employee_id IS NULL THEN
      INSERT INTO hrms.employees (
        organization_id, branch_id, department_id, designation_id, employment_type_id, reporting_manager_id, user_id,
        employee_code, first_name, last_name, email, employment_status, date_of_joining, status, account_status
      )
      VALUES (
        v_org_id, v_branch_id, v_marketing_dept_id, v_manager_designation_id, v_full_time_id, v_ceo_employee_id, v_auth_user_id,
        'IF-MGR-001', 'Marketing', 'Manager', 'marketing@ifranchise.in', 'active', CURRENT_DATE, 'active', 'active'
      )
      RETURNING id INTO v_manager_employee_id;
    ELSE
      UPDATE hrms.employees
      SET user_id = v_auth_user_id, department_id = v_marketing_dept_id, designation_id = v_manager_designation_id,
          employment_type_id = COALESCE(employment_type_id, v_full_time_id), reporting_manager_id = COALESCE(reporting_manager_id, v_ceo_employee_id),
          employment_status = 'active', account_status = 'active', status = 'active', updated_at = public.utc_now(), deleted_at = NULL
      WHERE id = v_manager_employee_id;
    END IF;

    SELECT id INTO v_role_id FROM hrms.roles WHERE organization_id = v_org_id AND code = 'manager' AND deleted_at IS NULL LIMIT 1;
    IF v_role_id IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM hrms.user_roles WHERE user_id = v_auth_user_id AND role_id = v_role_id AND organization_id = v_org_id) THEN
        UPDATE hrms.user_roles SET employee_id = v_manager_employee_id, status = 'active', deleted_at = NULL, updated_at = public.utc_now()
        WHERE user_id = v_auth_user_id AND role_id = v_role_id AND organization_id = v_org_id;
      ELSE
        INSERT INTO hrms.user_roles (organization_id, user_id, employee_id, role_id, status)
        VALUES (v_org_id, v_auth_user_id, v_manager_employee_id, v_role_id, 'active');
      END IF;
    END IF;
  END IF;

  -- Employee: gsumanthreddy2004@gmail.com
  SELECT id INTO v_auth_user_id FROM auth.users WHERE lower(email) = 'gsumanthreddy2004@gmail.com' LIMIT 1;
  IF v_auth_user_id IS NOT NULL THEN
    SELECT id INTO v_employee_id FROM hrms.employees WHERE organization_id = v_org_id AND lower(email::text) = 'gsumanthreddy2004@gmail.com' AND deleted_at IS NULL LIMIT 1;
    UPDATE hrms.employees SET user_id = NULL WHERE user_id = v_auth_user_id AND id <> v_employee_id AND deleted_at IS NULL;
    IF v_employee_id IS NULL THEN
      INSERT INTO hrms.employees (
        organization_id, branch_id, department_id, designation_id, employment_type_id, reporting_manager_id, user_id,
        employee_code, first_name, last_name, email, employment_status, date_of_joining, status, account_status
      )
      VALUES (
        v_org_id, v_branch_id, v_tech_dept_id, v_employee_designation_id, v_full_time_id, v_manager_employee_id, v_auth_user_id,
        'IF-EMP-001', 'G Sumanth', 'Reddy', 'gsumanthreddy2004@gmail.com', 'active', CURRENT_DATE, 'active', 'active'
      )
      RETURNING id INTO v_employee_id;
    ELSE
      UPDATE hrms.employees
      SET user_id = v_auth_user_id, department_id = COALESCE(department_id, v_tech_dept_id), designation_id = COALESCE(designation_id, v_employee_designation_id),
          employment_type_id = COALESCE(employment_type_id, v_full_time_id), reporting_manager_id = COALESCE(reporting_manager_id, v_manager_employee_id),
          employment_status = 'active', account_status = 'active', status = 'active', updated_at = public.utc_now(), deleted_at = NULL
      WHERE id = v_employee_id;
    END IF;

    SELECT id INTO v_role_id FROM hrms.roles WHERE organization_id = v_org_id AND code = 'employee' AND deleted_at IS NULL LIMIT 1;
    IF v_role_id IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM hrms.user_roles WHERE user_id = v_auth_user_id AND role_id = v_role_id AND organization_id = v_org_id) THEN
        UPDATE hrms.user_roles SET employee_id = v_employee_id, status = 'active', deleted_at = NULL, updated_at = public.utc_now()
        WHERE user_id = v_auth_user_id AND role_id = v_role_id AND organization_id = v_org_id;
      ELSE
        INSERT INTO hrms.user_roles (organization_id, user_id, employee_id, role_id, status)
        VALUES (v_org_id, v_auth_user_id, v_employee_id, v_role_id, 'active');
      END IF;
    END IF;
  END IF;
END $$;
