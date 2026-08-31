-- Rename the existing Super Admin / system account login email and display name.
-- Preserves auth.users.id, hrms.employees.id, and all role assignments.
-- Does NOT touch CEO/co-founder accounts, other employees, or EMAIL_FROM.

DO $$
DECLARE
  v_old_email text := 'sumanth.reddy@ifranchise.in';
  v_new_email text := 'it@ifranchise.in';
  v_user_id uuid;
  v_employee_id uuid;
  v_conflict_user_id uuid;
  v_conflict_employee_id uuid;
BEGIN
  -- Prefer the old email; if already renamed, still allow name update on the new email.
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) IN (lower(v_old_email), lower(v_new_email))
  ORDER BY CASE WHEN lower(email) = lower(v_old_email) THEN 0 ELSE 1 END
  LIMIT 1;

  SELECT id INTO v_conflict_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_new_email)
  LIMIT 1;

  IF v_conflict_user_id IS NOT NULL AND (v_user_id IS NULL OR v_conflict_user_id <> v_user_id) THEN
    -- it@ifranchise.in is already a separate auth account; sync display name only.
    v_user_id := v_conflict_user_id;

    SELECT e.id INTO v_employee_id
    FROM hrms.employees e
    WHERE lower(e.email::text) = lower(v_new_email)
      AND e.deleted_at IS NULL
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
      UPDATE auth.users
      SET
        raw_user_meta_data =
          COALESCE(raw_user_meta_data, '{}'::jsonb)
          || jsonb_build_object(
            'first_name', 'IT',
            'last_name', 'Team',
            'full_name', 'IT Team'
          ),
        updated_at = timezone('utc', now())
      WHERE id = v_user_id;
    END IF;

    IF v_employee_id IS NOT NULL THEN
      UPDATE hrms.employees
      SET
        first_name = 'IT',
        last_name = 'Team',
        updated_at = public.utc_now()
      WHERE id = v_employee_id;
    END IF;

    RAISE NOTICE
      'System account % already exists; synced IT Team display name (user_id=%, employee_id=%)',
      v_new_email,
      v_user_id,
      v_employee_id;
    RETURN;
  END IF;

  SELECT e.id INTO v_employee_id
  FROM hrms.employees e
  WHERE lower(e.email::text) IN (lower(v_old_email), lower(v_new_email))
    AND e.deleted_at IS NULL
  ORDER BY CASE WHEN lower(e.email::text) = lower(v_old_email) THEN 0 ELSE 1 END
  LIMIT 1;

  SELECT e.id INTO v_conflict_employee_id
  FROM hrms.employees e
  WHERE lower(e.email::text) = lower(v_new_email)
    AND e.deleted_at IS NULL
  LIMIT 1;

  IF v_conflict_employee_id IS NOT NULL
     AND (v_employee_id IS NULL OR v_conflict_employee_id <> v_employee_id) THEN
    v_employee_id := v_conflict_employee_id;

    UPDATE hrms.employees
    SET
      first_name = 'IT',
      last_name = 'Team',
      updated_at = public.utc_now()
    WHERE id = v_employee_id;

    RAISE NOTICE
      'Employee % already exists; synced IT Team display name (employee_id=%)',
      v_new_email,
      v_employee_id;
    RETURN;
  END IF;

  IF v_user_id IS NULL AND v_employee_id IS NULL THEN
    RAISE NOTICE 'No auth user or employee found for % / %. Nothing to rename.', v_old_email, v_new_email;
    RETURN;
  END IF;

  IF v_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET
      email = lower(v_new_email),
      raw_user_meta_data =
        COALESCE(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object(
          'email', lower(v_new_email),
          'first_name', 'IT',
          'last_name', 'Team',
          'full_name', 'IT Team'
        ),
      updated_at = timezone('utc', now())
    WHERE id = v_user_id;

    -- Keep email identity provider_id / identity_data in sync for password login.
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

  IF v_employee_id IS NOT NULL THEN
    UPDATE hrms.employees
    SET
      email = lower(v_new_email)::extensions.citext,
      first_name = 'IT',
      last_name = 'Team',
      updated_at = public.utc_now()
    WHERE id = v_employee_id;
  END IF;

  RAISE NOTICE
    'Renamed system account % -> % as IT Team (user_id=%, employee_id=%)',
    v_old_email,
    v_new_email,
    v_user_id,
    v_employee_id;
END $$;
