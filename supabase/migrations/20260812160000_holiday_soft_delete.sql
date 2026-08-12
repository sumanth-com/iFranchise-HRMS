-- Soft-delete holidays via SECURITY DEFINER to avoid RLS WITH CHECK conflicts
-- when setting deleted_at (SELECT policy requires deleted_at IS NULL).

CREATE OR REPLACE FUNCTION hrms.soft_delete_holiday(p_holiday_id uuid)
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
    hrms.user_has_permission('holiday.manage')
    OR hrms.user_has_permission('organization.delete')
  ) THEN
    RAISE EXCEPTION 'You do not have permission to delete holidays';
  END IF;

  SELECT h.organization_id
  INTO v_org_id
  FROM hrms.holidays AS h
  WHERE h.id = p_holiday_id
    AND h.deleted_at IS NULL;

  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT hrms.user_belongs_to_organization(v_org_id) THEN
    RAISE EXCEPTION 'You do not have access to this holiday';
  END IF;

  UPDATE hrms.holidays AS h
  SET
    deleted_at = public.utc_now(),
    status = 'archived',
    updated_at = public.utc_now(),
    updated_by = auth.uid()
  WHERE h.id = p_holiday_id
    AND h.deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

COMMENT ON FUNCTION hrms.soft_delete_holiday(uuid) IS
  'Soft-deletes a holiday when the caller has holiday.manage or organization.delete permission.';

REVOKE ALL ON FUNCTION hrms.soft_delete_holiday(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_holiday(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_holiday(uuid) TO service_role;

DROP POLICY IF EXISTS holidays_update_policy ON hrms.holidays;
CREATE POLICY holidays_update_policy ON hrms.holidays
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));
