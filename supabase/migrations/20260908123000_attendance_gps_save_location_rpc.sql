-- Additive helper: persist GPS for the signed-in employee's own attendance row.
-- Does not change status, work hours, or punch RPC calculation logic.

CREATE OR REPLACE FUNCTION hrms.self_service_attendance_save_location(
  p_attendance_id uuid,
  p_type text,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_m double precision DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, hrms
AS $$
DECLARE
  v_employee_id uuid;
  v_type text := lower(trim(coalesce(p_type, '')));
  v_row_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_attendance_id IS NULL THEN
    RAISE EXCEPTION 'Attendance id is required';
  END IF;

  IF v_type NOT IN ('in', 'out') THEN
    RAISE EXCEPTION 'Invalid location punch type';
  END IF;

  IF p_latitude IS NULL OR p_longitude IS NULL THEN
    RAISE EXCEPTION 'Latitude and longitude are required';
  END IF;

  IF p_latitude < -90 OR p_latitude > 90 OR p_longitude < -180 OR p_longitude > 180 THEN
    RAISE EXCEPTION 'Invalid coordinates';
  END IF;

  IF p_latitude = 0 AND p_longitude = 0 THEN
    RAISE EXCEPTION 'Invalid coordinates';
  END IF;

  SELECT e.id
  INTO v_employee_id
  FROM hrms.employees e
  WHERE e.user_id = auth.uid()
    AND e.deleted_at IS NULL
  ORDER BY e.created_at ASC
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'Employee profile not found for the signed-in user';
  END IF;

  IF v_type = 'in' THEN
    UPDATE hrms.attendance a
    SET
      check_in_latitude = p_latitude,
      check_in_longitude = p_longitude,
      check_in_accuracy_m = p_accuracy_m,
      check_in_location_at = public.utc_now(),
      updated_at = public.utc_now(),
      updated_by = auth.uid()
    WHERE a.id = p_attendance_id
      AND a.employee_id = v_employee_id
      AND a.deleted_at IS NULL
    RETURNING a.id INTO v_row_id;
  ELSE
    UPDATE hrms.attendance a
    SET
      check_out_latitude = p_latitude,
      check_out_longitude = p_longitude,
      check_out_accuracy_m = p_accuracy_m,
      check_out_location_at = public.utc_now(),
      updated_at = public.utc_now(),
      updated_by = auth.uid()
    WHERE a.id = p_attendance_id
      AND a.employee_id = v_employee_id
      AND a.deleted_at IS NULL
    RETURNING a.id INTO v_row_id;
  END IF;

  IF v_row_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_row_id);
END;
$$;

REVOKE ALL ON FUNCTION hrms.self_service_attendance_save_location(uuid, text, double precision, double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms.self_service_attendance_save_location(uuid, text, double precision, double precision, double precision) TO authenticated;

COMMENT ON FUNCTION hrms.self_service_attendance_save_location(uuid, text, double precision, double precision, double precision) IS
  'Best-effort GPS persist for self punch; writes only location columns on the caller own attendance row.';
