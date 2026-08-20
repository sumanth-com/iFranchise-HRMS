-- Soft-delete branches with employee/work-location cleanup.
-- Restore HR Admin org CRUD (previously inactivated) and grant CEO org CRUD.

CREATE OR REPLACE FUNCTION hrms.soft_delete_branch(p_branch_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, hrms
AS $$
DECLARE
  v_updated integer := 0;
  v_org_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    hrms.user_has_permission('branch.delete')
    OR hrms.user_has_permission('organization.delete')
  ) THEN
    RAISE EXCEPTION 'You do not have permission to delete branches';
  END IF;

  SELECT b.organization_id
  INTO v_org_id
  FROM hrms.branches AS b
  WHERE b.id = p_branch_id
    AND b.deleted_at IS NULL;

  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT hrms.user_belongs_to_organization(v_org_id) THEN
    RAISE EXCEPTION 'You do not have access to this branch';
  END IF;

  -- Unassign employees from the branch (matches UI copy).
  UPDATE hrms.employees AS e
  SET
    branch_id = NULL,
    updated_at = public.utc_now(),
    updated_by = auth.uid()
  WHERE e.organization_id = v_org_id
    AND e.branch_id = p_branch_id
    AND e.deleted_at IS NULL;

  -- Soft-delete work locations under this branch.
  UPDATE hrms.work_locations AS wl
  SET
    deleted_at = public.utc_now(),
    status = 'archived',
    updated_at = public.utc_now(),
    updated_by = auth.uid()
  WHERE wl.organization_id = v_org_id
    AND wl.branch_id = p_branch_id
    AND wl.deleted_at IS NULL;

  -- Clear branch refs on departments that pointed here.
  UPDATE hrms.departments AS d
  SET
    branch_id = NULL,
    updated_at = public.utc_now(),
    updated_by = auth.uid()
  WHERE d.organization_id = v_org_id
    AND d.branch_id = p_branch_id
    AND d.deleted_at IS NULL;

  UPDATE hrms.branches AS b
  SET
    deleted_at = public.utc_now(),
    status = 'archived',
    branch_head_id = NULL,
    is_head_office = false,
    updated_at = public.utc_now(),
    updated_by = auth.uid()
  WHERE b.id = p_branch_id
    AND b.deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

COMMENT ON FUNCTION hrms.soft_delete_branch(uuid) IS
  'Soft-deletes a branch, unassigns employees, and archives linked work locations.';

REVOKE ALL ON FUNCTION hrms.soft_delete_branch(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_branch(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_branch(uuid) TO service_role;

-- Ensure org CRUD permissions exist for HR Admin + executives.
WITH target_codes AS (
  SELECT unnest(ARRAY[
    'organization.view', 'organization.create', 'organization.edit', 'organization.delete',
    'branch.view', 'branch.create', 'branch.edit', 'branch.delete',
    'department.view', 'department.create', 'department.edit', 'department.delete',
    'designation.view', 'designation.create', 'designation.edit', 'designation.delete',
    'employment_type.view', 'employment_type.create', 'employment_type.edit', 'employment_type.delete',
    'work_location.view', 'work_location.create', 'work_location.edit', 'work_location.delete',
    'shift_template.view', 'shift_template.create', 'shift_template.edit', 'shift_template.delete',
    'holiday.view', 'holiday.manage'
  ]) AS code
),
target_roles AS (
  SELECT r.id AS role_id
  FROM hrms.roles r
  WHERE r.deleted_at IS NULL
    AND r.code IN ('hr_admin', 'super_admin', 'ceo', 'founder', 'co_founder')
)
INSERT INTO hrms.role_permissions (role_id, permission_id, status)
SELECT tr.role_id, p.id, 'active'::hrms.record_status
FROM target_roles tr
CROSS JOIN target_codes tc
JOIN hrms.permissions p ON p.code = tc.code AND p.deleted_at IS NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM hrms.role_permissions rp
  WHERE rp.role_id = tr.role_id
    AND rp.permission_id = p.id
    AND rp.deleted_at IS NULL
);

-- Re-activate any org CRUD permissions that were soft-disabled for these roles.
UPDATE hrms.role_permissions rp
SET status = 'active', updated_at = public.utc_now()
FROM hrms.permissions p, hrms.roles r
WHERE rp.permission_id = p.id
  AND rp.role_id = r.id
  AND rp.deleted_at IS NULL
  AND r.deleted_at IS NULL
  AND r.code IN ('hr_admin', 'super_admin', 'ceo', 'founder', 'co_founder')
  AND p.code IN (
    'organization.view', 'organization.create', 'organization.edit', 'organization.delete',
    'branch.view', 'branch.create', 'branch.edit', 'branch.delete',
    'department.view', 'department.create', 'department.edit', 'department.delete',
    'designation.view', 'designation.create', 'designation.edit', 'designation.delete',
    'employment_type.view', 'employment_type.create', 'employment_type.edit', 'employment_type.delete',
    'work_location.view', 'work_location.create', 'work_location.edit', 'work_location.delete',
    'shift_template.view', 'shift_template.create', 'shift_template.edit', 'shift_template.delete',
    'holiday.view', 'holiday.manage'
  );
