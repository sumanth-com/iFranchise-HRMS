-- =============================================================================
-- Never overwrite a valid attendance GPS fix with a poorer-accuracy reading.
-- Fresh high-accuracy coords still replace missing or equal/better accuracy.
-- =============================================================================

CREATE OR REPLACE FUNCTION hrms.self_service_attendance_save_location(
  p_attendance_id uuid,
  p_type text,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_m double precision DEFAULT NULL,
  p_expected_employee_id uuid DEFAULT NULL
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
  v_existing_lat double precision;
  v_existing_lng double precision;
  v_existing_accuracy double precision;
  v_should_write boolean := true;
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

  -- Reject obviously poor network/cell approximations at the DB boundary.
  IF p_accuracy_m IS NOT NULL AND p_accuracy_m > 250 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'poor_accuracy');
  END IF;

  v_employee_id := hrms.resolve_self_attendance_employee_id(p_expected_employee_id);

  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'Employee profile not found for the signed-in user';
  END IF;

  IF v_type = 'in' THEN
    SELECT a.check_in_latitude, a.check_in_longitude, a.check_in_accuracy_m
      INTO v_existing_lat, v_existing_lng, v_existing_accuracy
    FROM hrms.attendance a
    WHERE a.id = p_attendance_id
      AND a.deleted_at IS NULL
      AND a.employee_id IN (
        SELECT e.id
        FROM hrms.employees e
        WHERE e.user_id = auth.uid()
          AND e.deleted_at IS NULL
      );

    IF FOUND
      AND v_existing_lat IS NOT NULL
      AND v_existing_lng IS NOT NULL
      AND NOT (v_existing_lat = 0 AND v_existing_lng = 0)
      AND v_existing_accuracy IS NOT NULL
      AND p_accuracy_m IS NOT NULL
      AND p_accuracy_m > v_existing_accuracy
    THEN
      v_should_write := false;
    END IF;

    IF NOT v_should_write THEN
      RETURN jsonb_build_object(
        'ok', true,
        'id', p_attendance_id,
        'employee_id', v_employee_id,
        'kept_existing', true
      );
    END IF;

    UPDATE hrms.attendance a
    SET
      check_in_latitude = p_latitude,
      check_in_longitude = p_longitude,
      check_in_accuracy_m = p_accuracy_m,
      check_in_location_at = public.utc_now(),
      check_in_address = NULL,
      updated_at = public.utc_now(),
      updated_by = auth.uid()
    WHERE a.id = p_attendance_id
      AND a.deleted_at IS NULL
      AND a.employee_id IN (
        SELECT e.id
        FROM hrms.employees e
        WHERE e.user_id = auth.uid()
          AND e.deleted_at IS NULL
      )
    RETURNING a.id INTO v_row_id;
  ELSE
    SELECT a.check_out_latitude, a.check_out_longitude, a.check_out_accuracy_m
      INTO v_existing_lat, v_existing_lng, v_existing_accuracy
    FROM hrms.attendance a
    WHERE a.id = p_attendance_id
      AND a.deleted_at IS NULL
      AND a.employee_id IN (
        SELECT e.id
        FROM hrms.employees e
        WHERE e.user_id = auth.uid()
          AND e.deleted_at IS NULL
      );

    IF FOUND
      AND v_existing_lat IS NOT NULL
      AND v_existing_lng IS NOT NULL
      AND NOT (v_existing_lat = 0 AND v_existing_lng = 0)
      AND v_existing_accuracy IS NOT NULL
      AND p_accuracy_m IS NOT NULL
      AND p_accuracy_m > v_existing_accuracy
    THEN
      v_should_write := false;
    END IF;

    IF NOT v_should_write THEN
      RETURN jsonb_build_object(
        'ok', true,
        'id', p_attendance_id,
        'employee_id', v_employee_id,
        'kept_existing', true
      );
    END IF;

    UPDATE hrms.attendance a
    SET
      check_out_latitude = p_latitude,
      check_out_longitude = p_longitude,
      check_out_accuracy_m = p_accuracy_m,
      check_out_location_at = public.utc_now(),
      check_out_address = NULL,
      updated_at = public.utc_now(),
      updated_by = auth.uid()
    WHERE a.id = p_attendance_id
      AND a.deleted_at IS NULL
      AND a.employee_id IN (
        SELECT e.id
        FROM hrms.employees e
        WHERE e.user_id = auth.uid()
          AND e.deleted_at IS NULL
      )
    RETURNING a.id INTO v_row_id;
  END IF;

  IF v_row_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_row_id, 'employee_id', v_employee_id);
END;
$$;

COMMENT ON FUNCTION hrms.self_service_attendance_save_location(uuid, text, double precision, double precision, double precision, uuid) IS
  'Persist GPS for the signed-in user own attendance row; never replaces a better-accuracy fix with a poorer one.';
