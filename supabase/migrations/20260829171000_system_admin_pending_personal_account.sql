-- System-admin transition follow-up:
-- 1) Keep it@ifranchise.in as the active Super Admin auth/employee (idempotent).
-- 2) Restore sumanth.reddy@ifranchise.in as a Pending provisioning employee
--    with invited Super Admin role, NO auth.users link, and NO portal login.
-- Does NOT touch CEO/co-founder accounts, other employees, EMAIL_FROM, or permissions.

DO $$
DECLARE
  v_old_email text := 'sumanth.reddy@ifranchise.in';
  v_it_email text := 'it@ifranchise.in';
  v_org_id uuid := 'a0000000-0000-4000-8000-000000000001';
  v_it_user_id uuid;
  v_it_employee_id uuid;
  v_pending_employee_id uuid;
  v_super_admin_role_id uuid;
  v_branch_id uuid;
  v_department_id uuid;
  v_employee_code text;
  v_orphan_auth_id uuid;
BEGIN
  -- -------------------------------------------------------------------------
  -- Active IT / system account
  -- -------------------------------------------------------------------------
  SELECT id INTO v_it_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_it_email)
  LIMIT 1;

  SELECT e.id, e.branch_id, e.department_id
  INTO v_it_employee_id, v_branch_id, v_department_id
  FROM hrms.employees e
  WHERE lower(e.email::text) = lower(v_it_email)
    AND e.deleted_at IS NULL
  LIMIT 1;

  IF v_it_employee_id IS NOT NULL THEN
    UPDATE hrms.employees
    SET
      first_name = 'IT',
      last_name = 'Team',
      account_status = 'active',
      employment_status = CASE
        WHEN employment_status IN ('draft', 'terminated', 'resigned') THEN 'active'::hrms.employment_status
        ELSE employment_status
      END,
      status = 'active',
      updated_at = public.utc_now()
    WHERE id = v_it_employee_id;
  END IF;

  IF v_it_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET
      raw_user_meta_data =
        COALESCE(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object(
          'email', lower(v_it_email),
          'first_name', 'IT',
          'last_name', 'Team',
          'full_name', 'IT Team'
        ),
      updated_at = timezone('utc', now())
    WHERE id = v_it_user_id;
  END IF;

  SELECT r.id INTO v_super_admin_role_id
  FROM hrms.roles r
  WHERE r.organization_id = v_org_id
    AND lower(r.code) = 'super_admin'
    AND r.deleted_at IS NULL
  LIMIT 1;

  -- -------------------------------------------------------------------------
  -- Remove orphan Auth identities for the personal email (must not sign in)
  -- -------------------------------------------------------------------------
  SELECT u.id INTO v_orphan_auth_id
  FROM auth.users u
  WHERE lower(u.email) = lower(v_old_email)
  LIMIT 1;

  IF v_orphan_auth_id IS NOT NULL
     AND (v_it_user_id IS NULL OR v_orphan_auth_id <> v_it_user_id) THEN
    -- Only remove when no active employee is linked to that auth user.
    IF NOT EXISTS (
      SELECT 1
      FROM hrms.employees e
      WHERE e.user_id = v_orphan_auth_id
        AND e.deleted_at IS NULL
        AND lower(e.email::text) <> lower(v_old_email)
    ) THEN
      UPDATE hrms.employees
      SET user_id = NULL, updated_at = public.utc_now()
      WHERE user_id = v_orphan_auth_id
        AND lower(email::text) = lower(v_old_email);

      DELETE FROM auth.identities WHERE user_id = v_orphan_auth_id;
      DELETE FROM auth.users WHERE id = v_orphan_auth_id;
    END IF;
  END IF;

  -- -------------------------------------------------------------------------
  -- Pending personal Super Admin provisioning row (no login)
  -- -------------------------------------------------------------------------
  SELECT e.id INTO v_pending_employee_id
  FROM hrms.employees e
  WHERE e.organization_id = v_org_id
    AND lower(e.email::text) = lower(v_old_email)
    AND e.deleted_at IS NULL
  LIMIT 1;

  IF v_branch_id IS NULL THEN
    SELECT b.id INTO v_branch_id
    FROM hrms.branches b
    WHERE b.organization_id = v_org_id
      AND b.deleted_at IS NULL
    ORDER BY b.created_at
    LIMIT 1;
  END IF;

  IF v_pending_employee_id IS NULL THEN
    v_employee_code := 'IF-PENDING-SA';

    IF EXISTS (
      SELECT 1
      FROM hrms.employees e
      WHERE e.organization_id = v_org_id
        AND e.employee_code = v_employee_code
        AND e.deleted_at IS NULL
    ) THEN
      v_employee_code := 'IF-PENDING-SA-' || to_char(timezone('utc', now()), 'YYYYMMDDHH24MISS');
    END IF;

    INSERT INTO hrms.employees (
      organization_id,
      branch_id,
      department_id,
      employee_code,
      first_name,
      last_name,
      email,
      employment_status,
      account_status,
      status,
      user_id,
      invited_role_id,
      invitation_sent_at,
      invitation_cancelled_at,
      first_login_at,
      account_activated_at
    ) VALUES (
      v_org_id,
      v_branch_id,
      v_department_id,
      v_employee_code,
      'Gangaram Sumanth',
      'Reddy',
      lower(v_old_email)::extensions.citext,
      'draft',
      'draft',
      'active',
      NULL,
      v_super_admin_role_id,
      NULL,
      NULL,
      NULL,
      NULL
    )
    RETURNING id INTO v_pending_employee_id;
  ELSE
    UPDATE hrms.employees
    SET
      first_name = 'Gangaram Sumanth',
      last_name = 'Reddy',
      user_id = NULL,
      account_status = 'draft',
      employment_status = 'draft',
      status = 'active',
      invited_role_id = COALESCE(v_super_admin_role_id, invited_role_id),
      invitation_sent_at = NULL,
      invitation_cancelled_at = NULL,
      first_login_at = NULL,
      account_activated_at = NULL,
      updated_at = public.utc_now()
    WHERE id = v_pending_employee_id;
  END IF;

  RAISE NOTICE
    'System admin transition: it_employee=%, pending_personal=%, super_admin_role=%',
    v_it_employee_id,
    v_pending_employee_id,
    v_super_admin_role_id;
END $$;
