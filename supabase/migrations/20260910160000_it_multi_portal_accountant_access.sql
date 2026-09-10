-- Grant Accountant Portal to the existing IT multi-portal access role.
-- Additive only: mirrors HR / CEO / Manager / Employee grants on it_multi_portal_access.
-- Does not hardcode emails in application code; does not change Super Admin defaults.

DO $$
DECLARE
  v_org_id uuid := 'a0000000-0000-4000-8000-000000000001';
  v_role_code text := 'it_multi_portal_access';
  v_role_id uuid;
  v_perm_code text := 'portal.accountant.access';
BEGIN
  SELECT id INTO v_role_id
  FROM hrms.roles
  WHERE organization_id = v_org_id
    AND code = v_role_code
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_role_id IS NULL THEN
    RAISE NOTICE 'it_multi_portal_access role not found; skip accountant portal grant';
    RETURN;
  END IF;

  UPDATE hrms.roles
  SET
    description = 'Explicit HR / Executive / Manager / Accountant / Employee portal access for the IT system account only. Not inherited by Super Admin.',
    updated_at = public.utc_now()
  WHERE id = v_role_id;

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
END $$;
