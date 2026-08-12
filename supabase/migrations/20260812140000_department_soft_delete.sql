-- Soft-delete departments via SECURITY DEFINER to avoid RLS WITH CHECK conflicts
-- when setting deleted_at (SELECT policy requires deleted_at IS NULL).

CREATE OR REPLACE FUNCTION hrms.soft_delete_department(p_department_id uuid)
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
    hrms.user_has_permission('department.delete')
    OR hrms.user_has_permission('organization.delete')
  ) THEN
    RAISE EXCEPTION 'You do not have permission to delete departments';
  END IF;

  SELECT d.organization_id
  INTO v_org_id
  FROM hrms.departments AS d
  WHERE d.id = p_department_id
    AND d.deleted_at IS NULL;

  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT hrms.user_belongs_to_organization(v_org_id) THEN
    RAISE EXCEPTION 'You do not have access to this department';
  END IF;

  UPDATE hrms.employees AS e
  SET
    department_id = NULL,
    updated_at = public.utc_now(),
    updated_by = auth.uid()
  WHERE e.organization_id = v_org_id
    AND e.department_id = p_department_id
    AND e.deleted_at IS NULL;

  UPDATE hrms.departments AS d
  SET
    parent_department_id = NULL,
    updated_at = public.utc_now(),
    updated_by = auth.uid()
  WHERE d.organization_id = v_org_id
    AND d.parent_department_id = p_department_id
    AND d.deleted_at IS NULL;

  UPDATE hrms.designations AS des
  SET
    department_id = NULL,
    updated_at = public.utc_now(),
    updated_by = auth.uid()
  WHERE des.organization_id = v_org_id
    AND des.department_id = p_department_id
    AND des.deleted_at IS NULL;

  UPDATE hrms.departments AS d
  SET
    deleted_at = public.utc_now(),
    status = 'archived',
    department_head_id = NULL,
    updated_at = public.utc_now(),
    updated_by = auth.uid()
  WHERE d.id = p_department_id
    AND d.deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

COMMENT ON FUNCTION hrms.soft_delete_department(uuid) IS
  'Soft-deletes a department and unlinks related records when the caller has department.delete or organization.delete permission.';

REVOKE ALL ON FUNCTION hrms.soft_delete_department(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_department(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_department(uuid) TO service_role;

DROP POLICY IF EXISTS departments_update_policy ON hrms.departments;
CREATE POLICY departments_update_policy ON hrms.departments
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));
