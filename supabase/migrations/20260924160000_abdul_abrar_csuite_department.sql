-- Move Abdul and Abrar from Administration to C-Suite (User Provisioning department display).
-- Does not change roles, salaries, IDs, or other employees.

DO $$
DECLARE
  v_org_id uuid := 'a0000000-0000-4000-8000-000000000001';
  v_branch_id uuid := 'a0000000-0000-4000-8000-000000000002';
  v_csuite_id uuid;
  v_abdul_id uuid;
  v_abrar_id uuid;
BEGIN
  SELECT id INTO v_abdul_id
  FROM hrms.employees
  WHERE email = 'abdul@ifranchise.in'
    AND deleted_at IS NULL
  LIMIT 1;

  SELECT id INTO v_abrar_id
  FROM hrms.employees
  WHERE email = 'abrar@ifranchise.in'
    AND deleted_at IS NULL
  LIMIT 1;

  SELECT id INTO v_csuite_id
  FROM hrms.departments
  WHERE organization_id = v_org_id
    AND deleted_at IS NULL
    AND lower(name) = 'c-suite'
  LIMIT 1;

  IF v_csuite_id IS NULL THEN
    INSERT INTO hrms.departments (
      id,
      organization_id,
      branch_id,
      name,
      code,
      status,
      department_head_id,
      created_at,
      updated_at
    )
    VALUES (
      'a0000000-0000-4000-8000-000000000208',
      v_org_id,
      v_branch_id,
      'C-Suite',
      'CSUITE',
      'active',
      v_abdul_id,
      public.utc_now(),
      public.utc_now()
    )
    ON CONFLICT (id) DO UPDATE
      SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        status = 'active',
        deleted_at = NULL,
        updated_at = public.utc_now()
    RETURNING id INTO v_csuite_id;
  END IF;

  IF v_csuite_id IS NULL THEN
    SELECT id INTO v_csuite_id
    FROM hrms.departments
    WHERE organization_id = v_org_id
      AND deleted_at IS NULL
      AND lower(name) = 'c-suite'
    LIMIT 1;
  END IF;

  IF v_csuite_id IS NOT NULL THEN
    UPDATE hrms.employees
    SET
      department_id = v_csuite_id,
      updated_at = public.utc_now()
    WHERE deleted_at IS NULL
      AND id IN (v_abdul_id, v_abrar_id)
      AND id IS NOT NULL;
  END IF;
END $$;
