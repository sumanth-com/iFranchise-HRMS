-- Align self-attendance punch + GPS with the visible employee profile.
-- Prefer non-app-hidden employees, honor expected employee id from the app,
-- and persist check-in / check-out GPS on the same punch write when provided.

CREATE OR REPLACE FUNCTION hrms.current_user_employee_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
  SELECT e.id
  FROM hrms.employees e
  WHERE e.user_id = auth.uid()
    AND e.deleted_at IS NULL
  ORDER BY
    (e.app_hidden_at IS NULL) DESC,
    e.created_at DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION hrms.current_user_employee_id() IS
  'Returns the visible employee ID for the signed-in user (prefers non-app-hidden, newest).';

CREATE OR REPLACE FUNCTION hrms.resolve_self_attendance_employee_id(
  p_expected_employee_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = hrms, public
AS $$
DECLARE
  v_employee_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  -- Prefer the exact employee the app profile is using, when it belongs to this auth user.
  IF p_expected_employee_id IS NOT NULL THEN
    SELECT e.id
    INTO v_employee_id
    FROM hrms.employees e
    WHERE e.id = p_expected_employee_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
      AND e.app_hidden_at IS NULL;
  END IF;

  IF v_employee_id IS NULL THEN
    SELECT e.id
    INTO v_employee_id
    FROM hrms.employees e
    WHERE e.user_id = auth.uid()
      AND e.deleted_at IS NULL
      AND e.app_hidden_at IS NULL
    ORDER BY e.created_at DESC
    LIMIT 1;
  END IF;

  -- Last resort for legacy accounts (should be rare).
  IF v_employee_id IS NULL THEN
    SELECT e.id
    INTO v_employee_id
    FROM hrms.employees e
    WHERE e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    ORDER BY (e.app_hidden_at IS NULL) DESC, e.created_at DESC
    LIMIT 1;
  END IF;

  RETURN v_employee_id;
END;
$$;

REVOKE ALL ON FUNCTION hrms.resolve_self_attendance_employee_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms.resolve_self_attendance_employee_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION hrms.resolve_self_attendance_employee_id(uuid) TO service_role;

DROP FUNCTION IF EXISTS hrms.self_service_attendance_punch(text, hrms.attendance_status, numeric, numeric, text);

CREATE FUNCTION hrms.self_service_attendance_punch(
  p_type text,
  p_attendance_status hrms.attendance_status,
  p_work_hours numeric DEFAULT 0,
  p_overtime_hours numeric DEFAULT 0,
  p_notes text DEFAULT NULL,
  p_expected_employee_id uuid DEFAULT NULL,
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL,
  p_accuracy_m double precision DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, hrms
AS $$
DECLARE
  v_employee_id uuid;
  v_organization_id uuid;
  v_branch_id uuid;
  v_today date;
  v_now timestamptz := public.utc_now();
  v_row hrms.attendance%ROWTYPE;
  v_type text := lower(trim(coalesce(p_type, '')));
  v_has_geo boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_employee_id := hrms.resolve_self_attendance_employee_id(p_expected_employee_id);

  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'Employee profile not found for the signed-in user';
  END IF;

  SELECT e.organization_id, e.branch_id
  INTO v_organization_id, v_branch_id
  FROM hrms.employees e
  WHERE e.id = v_employee_id;

  IF v_branch_id IS NULL THEN
    RAISE EXCEPTION 'Employee branch is required before marking attendance';
  END IF;

  IF v_type NOT IN ('in', 'out') THEN
    RAISE EXCEPTION 'Invalid punch type';
  END IF;

  IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL
     AND p_latitude between -90 and 90
     AND p_longitude between -180 and 180
     AND NOT (p_latitude = 0 AND p_longitude = 0) THEN
    v_has_geo := true;
  END IF;

  v_today := (v_now AT TIME ZONE 'Asia/Kolkata')::date;

  SELECT a.*
  INTO v_row
  FROM hrms.attendance a
  WHERE a.employee_id = v_employee_id
    AND a.attendance_date = v_today
  ORDER BY a.deleted_at NULLS FIRST, a.updated_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    IF v_type = 'out' THEN
      RAISE EXCEPTION 'Check in before checking out.';
    END IF;

    BEGIN
      INSERT INTO hrms.attendance (
        organization_id,
        branch_id,
        employee_id,
        attendance_date,
        check_in_at,
        check_out_at,
        attendance_status,
        work_hours,
        overtime_hours,
        notes,
        check_in_latitude,
        check_in_longitude,
        check_in_accuracy_m,
        check_in_location_at,
        check_in_address,
        status,
        created_by,
        updated_by
      )
      VALUES (
        v_organization_id,
        v_branch_id,
        v_employee_id,
        v_today,
        v_now,
        NULL,
        p_attendance_status,
        0,
        0,
        p_notes,
        CASE WHEN v_has_geo THEN p_latitude ELSE NULL END,
        CASE WHEN v_has_geo THEN p_longitude ELSE NULL END,
        CASE WHEN v_has_geo THEN p_accuracy_m ELSE NULL END,
        CASE WHEN v_has_geo THEN v_now ELSE NULL END,
        NULL,
        'active'::hrms.record_status,
        auth.uid(),
        auth.uid()
      )
      RETURNING * INTO v_row;
    EXCEPTION
      WHEN unique_violation THEN
        SELECT a.*
        INTO v_row
        FROM hrms.attendance a
        WHERE a.employee_id = v_employee_id
          AND a.attendance_date = v_today
          AND a.deleted_at IS NULL
        ORDER BY a.updated_at DESC
        LIMIT 1
        FOR UPDATE;

        IF v_row.id IS NULL THEN
          RAISE EXCEPTION 'Attendance already exists for today.';
        END IF;

        IF v_row.check_in_at IS NOT NULL THEN
          RETURN jsonb_build_object(
            'id', v_row.id,
            'employee_id', v_employee_id,
            'attendance_date', v_today,
            'check_in_at', v_row.check_in_at,
            'check_out_at', v_row.check_out_at,
            'attendance_status', v_row.attendance_status,
            'work_hours', v_row.work_hours,
            'overtime_hours', v_row.overtime_hours,
            'location_saved', (
              v_row.check_in_latitude IS NOT NULL AND v_row.check_in_longitude IS NOT NULL
            ),
            'action', 'already_checked_in'
          );
        END IF;

        UPDATE hrms.attendance
        SET
          check_in_at = v_now,
          attendance_status = p_attendance_status,
          notes = coalesce(p_notes, notes),
          check_in_latitude = CASE WHEN v_has_geo THEN p_latitude ELSE check_in_latitude END,
          check_in_longitude = CASE WHEN v_has_geo THEN p_longitude ELSE check_in_longitude END,
          check_in_accuracy_m = CASE WHEN v_has_geo THEN p_accuracy_m ELSE check_in_accuracy_m END,
          check_in_location_at = CASE WHEN v_has_geo THEN v_now ELSE check_in_location_at END,
          check_in_address = CASE WHEN v_has_geo THEN NULL ELSE check_in_address END,
          deleted_at = NULL,
          status = 'active'::hrms.record_status,
          updated_at = v_now,
          updated_by = auth.uid()
        WHERE id = v_row.id
          AND employee_id = v_employee_id
        RETURNING * INTO v_row;
    END;

    RETURN jsonb_build_object(
      'id', v_row.id,
      'employee_id', v_employee_id,
      'attendance_date', v_today,
      'check_in_at', v_row.check_in_at,
      'check_out_at', v_row.check_out_at,
      'attendance_status', v_row.attendance_status,
      'work_hours', v_row.work_hours,
      'overtime_hours', v_row.overtime_hours,
      'location_saved', v_has_geo,
      'action', 'checked_in'
    );
  END IF;

  IF v_row.deleted_at IS NOT NULL OR v_row.status <> 'active'::hrms.record_status THEN
    UPDATE hrms.attendance
    SET
      deleted_at = NULL,
      status = 'active'::hrms.record_status,
      updated_at = v_now,
      updated_by = auth.uid()
    WHERE id = v_row.id
    RETURNING * INTO v_row;
  END IF;

  IF v_type = 'in' THEN
    IF v_row.check_in_at IS NOT NULL THEN
      RETURN jsonb_build_object(
        'id', v_row.id,
        'employee_id', v_employee_id,
        'attendance_date', v_today,
        'check_in_at', v_row.check_in_at,
        'check_out_at', v_row.check_out_at,
        'attendance_status', v_row.attendance_status,
        'work_hours', v_row.work_hours,
        'overtime_hours', v_row.overtime_hours,
        'location_saved', (
          v_row.check_in_latitude IS NOT NULL AND v_row.check_in_longitude IS NOT NULL
        ),
        'action', 'already_checked_in'
      );
    END IF;

    UPDATE hrms.attendance
    SET
      check_in_at = v_now,
      attendance_status = p_attendance_status,
      notes = coalesce(p_notes, notes),
      check_in_latitude = CASE WHEN v_has_geo THEN p_latitude ELSE check_in_latitude END,
      check_in_longitude = CASE WHEN v_has_geo THEN p_longitude ELSE check_in_longitude END,
      check_in_accuracy_m = CASE WHEN v_has_geo THEN p_accuracy_m ELSE check_in_accuracy_m END,
      check_in_location_at = CASE WHEN v_has_geo THEN v_now ELSE check_in_location_at END,
      check_in_address = CASE WHEN v_has_geo THEN NULL ELSE check_in_address END,
      deleted_at = NULL,
      status = 'active'::hrms.record_status,
      updated_at = v_now,
      updated_by = auth.uid()
    WHERE id = v_row.id
      AND employee_id = v_employee_id
    RETURNING * INTO v_row;

    RETURN jsonb_build_object(
      'id', v_row.id,
      'employee_id', v_employee_id,
      'attendance_date', v_today,
      'check_in_at', v_row.check_in_at,
      'check_out_at', v_row.check_out_at,
      'attendance_status', v_row.attendance_status,
      'work_hours', v_row.work_hours,
      'overtime_hours', v_row.overtime_hours,
      'location_saved', v_has_geo,
      'action', 'checked_in'
    );
  END IF;

  IF v_row.check_in_at IS NULL THEN
    RAISE EXCEPTION 'Check in before checking out.';
  END IF;

  IF v_now < v_row.check_in_at THEN
    RAISE EXCEPTION 'Checkout cannot be before check-in.';
  END IF;

  UPDATE hrms.attendance
  SET
    check_out_at = v_now,
    work_hours = CASE
      WHEN coalesce(p_work_hours, 0) > 0 THEN p_work_hours
      ELSE round((extract(epoch from (v_now - v_row.check_in_at)) / 3600.0)::numeric, 2)
    END,
    overtime_hours = greatest(coalesce(p_overtime_hours, 0), 0),
    attendance_status = p_attendance_status,
    notes = coalesce(p_notes, notes),
    check_out_latitude = CASE WHEN v_has_geo THEN p_latitude ELSE check_out_latitude END,
    check_out_longitude = CASE WHEN v_has_geo THEN p_longitude ELSE check_out_longitude END,
    check_out_accuracy_m = CASE WHEN v_has_geo THEN p_accuracy_m ELSE check_out_accuracy_m END,
    check_out_location_at = CASE WHEN v_has_geo THEN v_now ELSE check_out_location_at END,
    check_out_address = CASE WHEN v_has_geo THEN NULL ELSE check_out_address END,
    deleted_at = NULL,
    status = 'active'::hrms.record_status,
    updated_at = v_now,
    updated_by = auth.uid()
  WHERE id = v_row.id
    AND employee_id = v_employee_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'employee_id', v_employee_id,
    'attendance_date', v_today,
    'check_in_at', v_row.check_in_at,
    'check_out_at', v_row.check_out_at,
    'attendance_status', v_row.attendance_status,
    'work_hours', v_row.work_hours,
    'overtime_hours', v_row.overtime_hours,
    'location_saved', v_has_geo,
    'action', 'checked_out'
  );
END;
$$;

COMMENT ON FUNCTION hrms.self_service_attendance_punch(text, hrms.attendance_status, numeric, numeric, text, uuid, double precision, double precision, double precision) IS
  'Check-in/out for the authenticated employee (prefers visible profile employee). Optionally persists GPS on the same write.';

REVOKE ALL ON FUNCTION hrms.self_service_attendance_punch(text, hrms.attendance_status, numeric, numeric, text, uuid, double precision, double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms.self_service_attendance_punch(text, hrms.attendance_status, numeric, numeric, text, uuid, double precision, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION hrms.self_service_attendance_punch(text, hrms.attendance_status, numeric, numeric, text, uuid, double precision, double precision, double precision) TO service_role;

DROP FUNCTION IF EXISTS hrms.self_service_attendance_save_location(uuid, text, double precision, double precision, double precision);

CREATE FUNCTION hrms.self_service_attendance_save_location(
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

  v_employee_id := hrms.resolve_self_attendance_employee_id(p_expected_employee_id);

  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'Employee profile not found for the signed-in user';
  END IF;

  -- Own attendance only. Also allow the row when it belongs to any non-deleted
  -- employee linked to this auth user (guards against stale dual-profile rows).
  IF v_type = 'in' THEN
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
  'Persist GPS for the signed-in user own attendance row; accepts expected employee id and any auth-linked employee row.';

REVOKE ALL ON FUNCTION hrms.self_service_attendance_save_location(uuid, text, double precision, double precision, double precision, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms.self_service_attendance_save_location(uuid, text, double precision, double precision, double precision, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION hrms.self_service_attendance_save_location(uuid, text, double precision, double precision, double precision, uuid) TO service_role;
