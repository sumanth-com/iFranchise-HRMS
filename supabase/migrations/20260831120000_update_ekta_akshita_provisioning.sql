-- Update Akshita Potnuru and Ekta Pattanaik provisioning emails and Ekta's HR role.
-- Idempotent: safe to re-run.

DO $$
DECLARE
  v_org_id uuid := 'a0000000-0000-4000-8000-000000000001'::uuid;
  v_hr_admin_role_id uuid := 'a0000000-0000-4000-8000-000000000102'::uuid;
  v_employee_role_id uuid := 'a0000000-0000-4000-8000-000000000104'::uuid;
  v_ekta_employee_id uuid := 'e1000000-0000-4000-8000-000000000001'::uuid;
  v_akshita_employee_id uuid := 'e1000000-0000-4000-8000-000000000008'::uuid;
  v_user_id uuid;
  v_conflict_user_id uuid;
  v_conflict_employee_id uuid;
BEGIN
  -- ---------------------------------------------------------------------------
  -- Akshita Potnuru: akshitapotnuru@gmail.com -> akshita.potnuru@ifranchise.in
  -- ---------------------------------------------------------------------------
  DECLARE
    v_old_email text := 'akshitapotnuru@gmail.com';
    v_new_email text := 'akshita.potnuru@ifranchise.in';
    v_employee_id uuid;
  BEGIN
    SELECT id INTO v_conflict_user_id
    FROM auth.users
    WHERE lower(email) = lower(v_new_email)
    LIMIT 1;

    SELECT id INTO v_user_id
    FROM auth.users
    WHERE lower(email) IN (lower(v_old_email), lower(v_new_email))
    ORDER BY CASE WHEN lower(email) = lower(v_old_email) THEN 0 ELSE 1 END
    LIMIT 1;

    IF v_conflict_user_id IS NOT NULL AND (v_user_id IS NULL OR v_conflict_user_id <> v_user_id) THEN
      RAISE EXCEPTION
        'Cannot rename Akshita: % already exists as a different auth user (%)',
        v_new_email,
        v_conflict_user_id
        USING ERRCODE = 'P0001';
    END IF;

    SELECT e.id INTO v_conflict_employee_id
    FROM hrms.employees e
    WHERE lower(e.email::text) = lower(v_new_email)
      AND e.deleted_at IS NULL
      AND e.id <> v_akshita_employee_id
    LIMIT 1;

    IF v_conflict_employee_id IS NOT NULL THEN
      RAISE EXCEPTION
        'Cannot rename Akshita: % already exists as a different employee (%)',
        v_new_email,
        v_conflict_employee_id
        USING ERRCODE = 'P0001';
    END IF;

    IF v_user_id IS NOT NULL THEN
      UPDATE auth.users
      SET
        email = lower(v_new_email),
        raw_user_meta_data =
          COALESCE(raw_user_meta_data, '{}'::jsonb)
          || jsonb_build_object('email', lower(v_new_email)),
        updated_at = timezone('utc', now())
      WHERE id = v_user_id;

      UPDATE auth.identities
      SET
        identity_data =
          COALESCE(identity_data, '{}'::jsonb)
          || jsonb_build_object(
            'email', lower(v_new_email),
            'email_verified', true,
            'sub', id::text
          ),
        provider_id = CASE
          WHEN provider = 'email' THEN lower(v_new_email)
          ELSE provider_id
        END,
        updated_at = timezone('utc', now())
      WHERE user_id = v_user_id;
    END IF;

    UPDATE hrms.employees
    SET
      email = lower(v_new_email)::extensions.citext,
      updated_at = public.utc_now()
    WHERE id = v_akshita_employee_id
      AND deleted_at IS NULL;

    UPDATE hrms.employee_invitations
    SET
      email = lower(v_new_email)::extensions.citext,
      updated_at = public.utc_now()
    WHERE employee_id = v_akshita_employee_id
      AND deleted_at IS NULL;

    RAISE NOTICE 'Akshita email updated to % (user_id=%)', v_new_email, v_user_id;
  END;

  -- ---------------------------------------------------------------------------
  -- Ekta Pattanaik: ekta@ifranchise.in -> hr@ifranchise.in + HR Admin role
  -- ---------------------------------------------------------------------------
  DECLARE
    v_old_email text := 'ekta@ifranchise.in';
    v_new_email text := 'hr@ifranchise.in';
  BEGIN
    v_user_id := NULL;
    v_conflict_user_id := NULL;
    v_conflict_employee_id := NULL;

    SELECT id INTO v_conflict_user_id
    FROM auth.users
    WHERE lower(email) = lower(v_new_email)
    LIMIT 1;

    SELECT id INTO v_user_id
    FROM auth.users
    WHERE lower(email) IN (lower(v_old_email), lower(v_new_email))
    ORDER BY CASE WHEN lower(email) = lower(v_old_email) THEN 0 ELSE 1 END
    LIMIT 1;

    IF v_conflict_user_id IS NOT NULL AND (v_user_id IS NULL OR v_conflict_user_id <> v_user_id) THEN
      RAISE EXCEPTION
        'Cannot rename Ekta: % already exists as a different auth user (%)',
        v_new_email,
        v_conflict_user_id
        USING ERRCODE = 'P0001';
    END IF;

    SELECT e.id INTO v_conflict_employee_id
    FROM hrms.employees e
    WHERE lower(e.email::text) = lower(v_new_email)
      AND e.deleted_at IS NULL
      AND e.id <> v_ekta_employee_id
    LIMIT 1;

    IF v_conflict_employee_id IS NOT NULL THEN
      RAISE EXCEPTION
        'Cannot rename Ekta: % already exists as a different employee (%)',
        v_new_email,
        v_conflict_employee_id
        USING ERRCODE = 'P0001';
    END IF;

    IF v_user_id IS NOT NULL THEN
      UPDATE auth.users
      SET
        email = lower(v_new_email),
        raw_app_meta_data =
          COALESCE(raw_app_meta_data, '{}'::jsonb)
          || jsonb_build_object('role', 'hr_admin'),
        raw_user_meta_data =
          COALESCE(raw_user_meta_data, '{}'::jsonb)
          || jsonb_build_object('email', lower(v_new_email)),
        updated_at = timezone('utc', now())
      WHERE id = v_user_id;

      UPDATE auth.identities
      SET
        identity_data =
          COALESCE(identity_data, '{}'::jsonb)
          || jsonb_build_object(
            'email', lower(v_new_email),
            'email_verified', true,
            'sub', id::text
          ),
        provider_id = CASE
          WHEN provider = 'email' THEN lower(v_new_email)
          ELSE provider_id
        END,
        updated_at = timezone('utc', now())
      WHERE user_id = v_user_id;

      -- Deactivate non-HR roles for this auth user.
      UPDATE hrms.user_roles
      SET
        status = 'inactive',
        deleted_at = public.utc_now(),
        updated_at = public.utc_now()
      WHERE organization_id = v_org_id
        AND user_id = v_user_id
        AND role_id <> v_hr_admin_role_id
        AND deleted_at IS NULL;

      -- Ensure HR Admin role is active.
      UPDATE hrms.user_roles
      SET
        employee_id = v_ekta_employee_id,
        status = 'active',
        deleted_at = NULL,
        updated_at = public.utc_now()
      WHERE organization_id = v_org_id
        AND user_id = v_user_id
        AND role_id = v_hr_admin_role_id
        AND deleted_at IS NULL;

      IF NOT FOUND THEN
        INSERT INTO hrms.user_roles (
          organization_id,
          user_id,
          employee_id,
          role_id,
          status,
          created_at,
          updated_at,
          deleted_at
        )
        VALUES (
          v_org_id,
          v_user_id,
          v_ekta_employee_id,
          v_hr_admin_role_id,
          'active',
          public.utc_now(),
          public.utc_now(),
          NULL
        );
      END IF;
    END IF;

    UPDATE hrms.employees
    SET
      email = lower(v_new_email)::extensions.citext,
      invited_role_id = v_hr_admin_role_id,
      updated_at = public.utc_now()
    WHERE id = v_ekta_employee_id
      AND deleted_at IS NULL;

    UPDATE hrms.employee_invitations
    SET
      email = lower(v_new_email)::extensions.citext,
      role_id = v_hr_admin_role_id,
      portal_route = '/dashboard',
      updated_at = public.utc_now()
    WHERE employee_id = v_ekta_employee_id
      AND deleted_at IS NULL;

    -- Pending provisioning rows may only have employee role in user_roles without user_id.
    UPDATE hrms.user_roles
    SET
      status = 'inactive',
      deleted_at = public.utc_now(),
      updated_at = public.utc_now()
    WHERE organization_id = v_org_id
      AND employee_id = v_ekta_employee_id
      AND role_id = v_employee_role_id
      AND deleted_at IS NULL;

    UPDATE hrms.user_roles
    SET
      status = 'active',
      deleted_at = NULL,
      updated_at = public.utc_now()
    WHERE organization_id = v_org_id
      AND employee_id = v_ekta_employee_id
      AND role_id = v_hr_admin_role_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
      INSERT INTO hrms.user_roles (
        organization_id,
        user_id,
        employee_id,
        role_id,
        status,
        created_at,
        updated_at,
        deleted_at
      )
      SELECT
        v_org_id,
        e.user_id,
        v_ekta_employee_id,
        v_hr_admin_role_id,
        'active',
        public.utc_now(),
        public.utc_now(),
        NULL
      FROM hrms.employees e
      WHERE e.id = v_ekta_employee_id
        AND e.user_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM hrms.user_roles ur
          WHERE ur.organization_id = v_org_id
            AND ur.employee_id = v_ekta_employee_id
            AND ur.role_id = v_hr_admin_role_id
            AND ur.deleted_at IS NULL
        );
    END IF;

    RAISE NOTICE 'Ekta email updated to % with HR Admin role (user_id=%)', v_new_email, v_user_id;
  END;
END $$;
