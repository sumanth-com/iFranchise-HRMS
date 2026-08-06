-- Soft-delete attendance via SECURITY DEFINER to avoid RLS conflicts on UPDATE representation.

CREATE OR REPLACE FUNCTION hrms.soft_delete_attendance(p_attendance_id uuid)
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

  IF NOT hrms.user_has_permission('attendance.delete') THEN
    RAISE EXCEPTION 'You do not have permission to delete attendance records';
  END IF;

  SELECT a.organization_id
  INTO v_org_id
  FROM hrms.attendance AS a
  WHERE a.id = p_attendance_id
    AND a.deleted_at IS NULL;

  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT hrms.user_belongs_to_organization(v_org_id) THEN
    RAISE EXCEPTION 'You do not have access to this attendance record';
  END IF;

  UPDATE hrms.attendance AS a
  SET
    status = 'inactive',
    deleted_at = public.utc_now(),
    updated_at = public.utc_now(),
    updated_by = auth.uid()
  WHERE a.id = p_attendance_id
    AND a.deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

COMMENT ON FUNCTION hrms.soft_delete_attendance(uuid) IS
  'Soft-deletes an attendance record when the caller has attendance.delete permission.';

REVOKE ALL ON FUNCTION hrms.soft_delete_attendance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_attendance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_attendance(uuid) TO service_role;
