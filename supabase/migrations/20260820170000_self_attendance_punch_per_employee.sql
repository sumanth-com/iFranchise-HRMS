-- =============================================================================
-- Self-service attendance punch: one active record per employee per day.
-- Soft-deleted rows must not block a new check-in, and punches always bind to
-- the authenticated user's employee (never another portal user's row).
-- =============================================================================

ALTER TABLE hrms.attendance
  DROP CONSTRAINT IF EXISTS attendance_unique_per_employee_date;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_unique_active_employee_date_idx
  ON hrms.attendance (employee_id, attendance_date)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX hrms.attendance_unique_active_employee_date_idx IS
  'One active attendance row per employee per date; soft-deleted rows are ignored.';

CREATE OR REPLACE FUNCTION hrms.self_service_attendance_punch(
  p_type text,
  p_attendance_status hrms.attendance_status,
  p_work_hours numeric DEFAULT 0,
  p_overtime_hours numeric DEFAULT 0,
  p_notes text DEFAULT NULL
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT e.id, e.organization_id, e.branch_id
  INTO v_employee_id, v_organization_id, v_branch_id
  FROM hrms.employees e
  WHERE e.user_id = auth.uid()
    AND e.deleted_at IS NULL
  ORDER BY e.created_at ASC
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    RAISE EXCEPTION 'Employee profile not found for the signed-in user';
  END IF;

  IF v_branch_id IS NULL THEN
    RAISE EXCEPTION 'Employee branch is required before marking attendance';
  END IF;

  IF v_type NOT IN ('in', 'out') THEN
    RAISE EXCEPTION 'Invalid punch type';
  END IF;

  -- Office calendar day (Asia/Kolkata), matching application getTodayDateString().
  v_today := (v_now AT TIME ZONE 'Asia/Kolkata')::date;

  -- Prefer an active row; otherwise revive the latest soft-deleted row for this employee+day.
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
            'action', 'already_checked_in'
          );
        END IF;

        UPDATE hrms.attendance
        SET
          check_in_at = v_now,
          attendance_status = p_attendance_status,
          notes = coalesce(p_notes, notes),
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
      'action', 'checked_in'
    );
  END IF;

  -- Own row only — revive if soft-deleted.
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
      -- Idempotent: already punched in today on this employee's own record.
      RETURN jsonb_build_object(
        'id', v_row.id,
        'employee_id', v_employee_id,
        'attendance_date', v_today,
        'check_in_at', v_row.check_in_at,
        'check_out_at', v_row.check_out_at,
        'attendance_status', v_row.attendance_status,
        'work_hours', v_row.work_hours,
        'overtime_hours', v_row.overtime_hours,
        'action', 'already_checked_in'
      );
    END IF;

    UPDATE hrms.attendance
    SET
      check_in_at = v_now,
      attendance_status = p_attendance_status,
      notes = coalesce(p_notes, notes),
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
      'action', 'checked_in'
    );
  END IF;

  -- Check out / update checkout
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
    'action', 'checked_out'
  );
END;
$$;

COMMENT ON FUNCTION hrms.self_service_attendance_punch(text, hrms.attendance_status, numeric, numeric, text) IS
  'Check-in/out for the authenticated employee only. Creates or revives that employee''s own attendance row for today.';

REVOKE ALL ON FUNCTION hrms.self_service_attendance_punch(text, hrms.attendance_status, numeric, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms.self_service_attendance_punch(text, hrms.attendance_status, numeric, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION hrms.self_service_attendance_punch(text, hrms.attendance_status, numeric, numeric, text) TO service_role;
