-- =============================================================================
-- Migration: hrms_bootstrap_functions
-- Description: System initialization and Super Admin bootstrap helpers (Step 4)
-- Note: Does not modify locked Step 1–3 foundations or table definitions.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Bootstrap constants (stable UUIDs for master data references)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hrms.bootstrap_constants()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = hrms, public
AS $$
  SELECT jsonb_build_object(
    'organization_id', 'a0000000-0000-4000-8000-000000000001'::uuid,
    'branch_id', 'a0000000-0000-4000-8000-000000000002'::uuid,
    'role_super_admin_id', 'a0000000-0000-4000-8000-000000000101'::uuid,
    'role_hr_admin_id', 'a0000000-0000-4000-8000-000000000102'::uuid,
    'role_manager_id', 'a0000000-0000-4000-8000-000000000103'::uuid,
    'role_employee_id', 'a0000000-0000-4000-8000-000000000104'::uuid,
    'dept_administration_id', 'a0000000-0000-4000-8000-000000000201'::uuid,
    'dept_hr_id', 'a0000000-0000-4000-8000-000000000202'::uuid,
    'designation_super_admin_id', 'a0000000-0000-4000-8000-000000000301'::uuid,
    'employment_full_time_id', 'a0000000-0000-4000-8000-000000000401'::uuid
  );
$$;

-- -----------------------------------------------------------------------------
-- Bootstrap status
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hrms.is_master_data_seeded()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM hrms.organizations o
    WHERE o.id = (hrms.bootstrap_constants() ->> 'organization_id')::uuid
      AND o.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION hrms.get_bootstrap_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
DECLARE
  v_org_id uuid := (hrms.bootstrap_constants() ->> 'organization_id')::uuid;
BEGIN
  RETURN jsonb_build_object(
    'master_data_seeded', hrms.is_master_data_seeded(),
    'organization', (
      SELECT to_jsonb(o)
      FROM hrms.organizations o
      WHERE o.id = v_org_id
        AND o.deleted_at IS NULL
    ),
    'roles_count', (
      SELECT count(*)::int
      FROM hrms.roles r
      WHERE r.organization_id = v_org_id
        AND r.deleted_at IS NULL
    ),
    'permissions_count', (
      SELECT count(*)::int
      FROM hrms.permissions p
      WHERE p.deleted_at IS NULL
    ),
    'super_admin_assigned', EXISTS (
      SELECT 1
      FROM hrms.user_roles ur
      INNER JOIN hrms.roles r ON r.id = ur.role_id
      WHERE ur.organization_id = v_org_id
        AND r.code = 'super_admin'
        AND ur.deleted_at IS NULL
        AND ur.status = 'active'::hrms.record_status
    )
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- Permission helper (for downstream modules; no business workflow logic)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hrms.user_has_permission(p_permission_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM hrms.user_roles ur
    INNER JOIN hrms.roles r ON r.id = ur.role_id
    INNER JOIN hrms.role_permissions rp ON rp.role_id = r.id
    INNER JOIN hrms.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND ur.deleted_at IS NULL
      AND ur.status = 'active'::hrms.record_status
      AND r.deleted_at IS NULL
      AND r.status = 'active'::hrms.record_status
      AND rp.deleted_at IS NULL
      AND rp.status = 'active'::hrms.record_status
      AND p.deleted_at IS NULL
      AND p.status = 'active'::hrms.record_status
      AND p.code = p_permission_code
  );
$$;

-- -----------------------------------------------------------------------------
-- Super Admin bootstrap (Supabase Auth compatible; no hardcoded passwords)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hrms.initialize_super_admin(
  p_email text,
  p_first_name text DEFAULT 'Super',
  p_last_name text DEFAULT 'Admin',
  p_employee_code text DEFAULT 'EMP-0001'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hrms, public, auth
AS $$
DECLARE
  v_constants jsonb := hrms.bootstrap_constants();
  v_org_id uuid := (v_constants ->> 'organization_id')::uuid;
  v_branch_id uuid := (v_constants ->> 'branch_id')::uuid;
  v_role_id uuid := (v_constants ->> 'role_super_admin_id')::uuid;
  v_department_id uuid := (v_constants ->> 'dept_administration_id')::uuid;
  v_designation_id uuid := (v_constants ->> 'designation_super_admin_id')::uuid;
  v_employment_type_id uuid := (v_constants ->> 'employment_full_time_id')::uuid;
  v_user_id uuid;
  v_employee_id uuid;
  v_normalized_email citext := lower(trim(p_email));
BEGIN
  IF NOT hrms.is_master_data_seeded() THEN
    RAISE EXCEPTION 'Master data is not seeded. Run hrms seed migration first.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_normalized_email IS NULL OR length(v_normalized_email::text) = 0 THEN
    RAISE EXCEPTION 'Super Admin email is required.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT u.id
  INTO v_user_id
  FROM auth.users u
  WHERE lower(u.email) = v_normalized_email::text
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'step', 'auth_user_missing',
      'message', 'Auth user not found. Invite or create the user in Supabase Auth first, then rerun initialization.',
      'email', v_normalized_email,
      'next_actions', jsonb_build_array(
        'Invite user via Supabase Dashboard > Authentication > Users > Invite',
        'Or use: supabase auth admin invite-user --email ' || v_normalized_email::text,
        'Then run: SELECT hrms.initialize_super_admin(''' || v_normalized_email::text || ''');'
      )
    );
  END IF;

  SELECT e.id
  INTO v_employee_id
  FROM hrms.employees e
  WHERE e.organization_id = v_org_id
    AND e.email = v_normalized_email
    AND e.deleted_at IS NULL
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    INSERT INTO hrms.employees (
      organization_id,
      branch_id,
      department_id,
      designation_id,
      employment_type_id,
      user_id,
      employee_code,
      first_name,
      last_name,
      email,
      employment_status,
      date_of_joining,
      status,
      created_by,
      updated_by
    ) VALUES (
      v_org_id,
      v_branch_id,
      v_department_id,
      v_designation_id,
      v_employment_type_id,
      v_user_id,
      p_employee_code,
      p_first_name,
      p_last_name,
      v_normalized_email,
      'active'::hrms.employment_status,
      CURRENT_DATE,
      'active'::hrms.record_status,
      v_user_id,
      v_user_id
    )
    RETURNING id INTO v_employee_id;

    INSERT INTO hrms.employee_profiles (
      employee_id,
      status,
      created_by,
      updated_by
    ) VALUES (
      v_employee_id,
      'active'::hrms.record_status,
      v_user_id,
      v_user_id
    );
  ELSE
    UPDATE hrms.employees
    SET
      user_id = v_user_id,
      department_id = v_department_id,
      designation_id = v_designation_id,
      employment_type_id = v_employment_type_id,
      employment_status = 'active'::hrms.employment_status,
      updated_by = v_user_id,
      updated_at = public.utc_now()
    WHERE id = v_employee_id;
  END IF;

  INSERT INTO hrms.user_roles (
    user_id,
    role_id,
    organization_id,
    employee_id,
    status,
    created_by,
    updated_by
  )
  SELECT
    v_user_id,
    v_role_id,
    v_org_id,
    v_employee_id,
    'active'::hrms.record_status,
    v_user_id,
    v_user_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM hrms.user_roles ur
    WHERE ur.user_id = v_user_id
      AND ur.role_id = v_role_id
      AND ur.organization_id = v_org_id
      AND ur.deleted_at IS NULL
  );

  UPDATE auth.users
  SET
    raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
      'invited', true,
      'role', 'super_admin',
      'organization_id', v_org_id::text
    ),
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
      'first_name', p_first_name,
      'last_name', p_last_name,
      'employee_id', v_employee_id::text,
      'employee_code', p_employee_code
    ),
    updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Super Admin initialized successfully.',
    'email', v_normalized_email,
    'user_id', v_user_id,
    'employee_id', v_employee_id,
    'organization_id', v_org_id,
    'role_code', 'super_admin'
  );
END;
$$;

COMMENT ON FUNCTION hrms.initialize_super_admin(text, text, text, text) IS
  'Links an existing Supabase Auth user to Super Admin employee and role records. No passwords are set.';

REVOKE ALL ON FUNCTION hrms.bootstrap_constants() FROM PUBLIC;
REVOKE ALL ON FUNCTION hrms.is_master_data_seeded() FROM PUBLIC;
REVOKE ALL ON FUNCTION hrms.get_bootstrap_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION hrms.user_has_permission(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION hrms.initialize_super_admin(text, text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION hrms.bootstrap_constants() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION hrms.is_master_data_seeded() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION hrms.get_bootstrap_status() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION hrms.user_has_permission(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION hrms.initialize_super_admin(text, text, text, text) TO service_role;
