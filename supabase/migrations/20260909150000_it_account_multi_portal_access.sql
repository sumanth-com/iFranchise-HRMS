-- Grant full business-portal switcher access to it@ifranchise.in only.
-- Super Admin role remains system-portal-only (see 20260909140000).
-- sumanth.reddy@ifranchise.in and other Super Admins are unchanged.

DO $$
DECLARE
  v_org_id uuid := 'a0000000-0000-4000-8000-000000000001';
  v_it_email text := 'it@ifranchise.in';
  v_role_code text := 'it_multi_portal_access';
  v_role_id uuid;
  v_it_user_id uuid;
  v_it_employee_id uuid;
  v_perm_code text;
BEGIN
  -- Dedicated, non-provisionable role: portal.*.access only (no extra module grants).
  SELECT id INTO v_role_id
  FROM hrms.roles
  WHERE organization_id = v_org_id
    AND code = v_role_code
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_role_id IS NULL THEN
    INSERT INTO hrms.roles (
      organization_id,
      name,
      code,
      description,
      is_system_role,
      is_provisionable,
      is_inviteable,
      is_default,
      portal_key,
      portal_route,
      status
    )
    VALUES (
      v_org_id,
      'IT Multi-Portal Access',
      v_role_code,
      'Explicit HR / Executive / Manager / Employee portal access for the IT system account only. Not inherited by Super Admin.',
      true,
      false,
      false,
      false,
      NULL,
      NULL,
      'active'::hrms.record_status
    )
    RETURNING id INTO v_role_id;
  ELSE
    UPDATE hrms.roles
    SET
      name = 'IT Multi-Portal Access',
      description = 'Explicit HR / Executive / Manager / Employee portal access for the IT system account only. Not inherited by Super Admin.',
      is_system_role = true,
      is_provisionable = false,
      is_inviteable = false,
      is_default = false,
      portal_key = NULL,
      portal_route = NULL,
      status = 'active'::hrms.record_status,
      updated_at = public.utc_now()
    WHERE id = v_role_id;
  END IF;

  FOREACH v_perm_code IN ARRAY ARRAY[
    'portal.hr.access',
    'portal.ceo.access',
    'portal.manager.access',
    'portal.employee.access'
  ]
  LOOP
    INSERT INTO hrms.role_permissions (role_id, permission_id, status)
    SELECT v_role_id, p.id, 'active'::hrms.record_status
    FROM hrms.permissions p
    WHERE p.code = v_perm_code
      AND p.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM hrms.role_permissions rp
        WHERE rp.role_id = v_role_id
          AND rp.permission_id = p.id
          AND rp.deleted_at IS NULL
      );

    UPDATE hrms.role_permissions rp
    SET
      status = 'active'::hrms.record_status,
      deleted_at = NULL,
      updated_at = public.utc_now()
    FROM hrms.permissions p
    WHERE rp.role_id = v_role_id
      AND rp.permission_id = p.id
      AND p.code = v_perm_code
      AND (rp.deleted_at IS NOT NULL OR rp.status <> 'active'::hrms.record_status);
  END LOOP;

  SELECT u.id INTO v_it_user_id
  FROM auth.users u
  WHERE lower(u.email) = lower(v_it_email)
  LIMIT 1;

  SELECT e.id INTO v_it_employee_id
  FROM hrms.employees e
  WHERE lower(e.email::text) = lower(v_it_email)
    AND e.deleted_at IS NULL
  LIMIT 1;

  IF v_it_user_id IS NULL THEN
    RAISE NOTICE 'it@ifranchise.in auth user not found; multi-portal role created but not assigned';
    RETURN;
  END IF;

  -- Ensure only the IT account holds this role.
  UPDATE hrms.user_roles
  SET
    status = 'inactive'::hrms.record_status,
    deleted_at = public.utc_now(),
    updated_at = public.utc_now()
  WHERE role_id = v_role_id
    AND deleted_at IS NULL
    AND user_id IS DISTINCT FROM v_it_user_id;

  IF EXISTS (
    SELECT 1
    FROM hrms.user_roles ur
    WHERE ur.user_id = v_it_user_id
      AND ur.role_id = v_role_id
      AND ur.organization_id = v_org_id
      AND ur.deleted_at IS NULL
  ) THEN
    UPDATE hrms.user_roles
    SET
      employee_id = COALESCE(v_it_employee_id, employee_id),
      status = 'active'::hrms.record_status,
      updated_at = public.utc_now()
    WHERE user_id = v_it_user_id
      AND role_id = v_role_id
      AND organization_id = v_org_id
      AND deleted_at IS NULL;
  ELSE
    INSERT INTO hrms.user_roles (
      organization_id,
      user_id,
      employee_id,
      role_id,
      status
    )
    VALUES (
      v_org_id,
      v_it_user_id,
      v_it_employee_id,
      v_role_id,
      'active'::hrms.record_status
    );
  END IF;
END;
$$;
