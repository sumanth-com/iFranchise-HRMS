-- Restore paid balance days (not total LOP-inclusive days) when soft-deleting leave requests.

CREATE OR REPLACE FUNCTION hrms.soft_delete_leave_request(p_leave_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, hrms
AS $$
DECLARE
  v_employee_id uuid;
  v_leave_type_id uuid;
  v_start_date date;
  v_total_days numeric(5, 2);
  v_paid_days numeric(5, 2);
  v_duration_breakdown jsonb;
  v_leave_status text;
  v_balance_year smallint;
  v_updated integer := 0;
  v_is_owner boolean := false;
  v_can_delete boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT
    lr.employee_id,
    lr.leave_type_id,
    lr.start_date,
    lr.total_days,
    lr.duration_breakdown,
    lr.leave_status::text
  INTO
    v_employee_id,
    v_leave_type_id,
    v_start_date,
    v_total_days,
    v_duration_breakdown,
    v_leave_status
  FROM hrms.leave_requests AS lr
  INNER JOIN hrms.employees AS e ON e.id = lr.employee_id
  WHERE lr.id = p_leave_request_id
    AND lr.deleted_at IS NULL
    AND e.deleted_at IS NULL
    AND hrms.user_belongs_to_organization(e.organization_id);

  IF v_employee_id IS NULL THEN
    RETURN false;
  END IF;

  -- Match app-layer reservedPaidDays(): paid portion from breakdown, else legacy total_days.
  v_paid_days := COALESCE(
    NULLIF((v_duration_breakdown->>'paidDays')::numeric, NULL),
    v_total_days
  );

  v_is_owner := v_employee_id = hrms.current_user_employee_id();
  v_can_delete :=
    hrms.user_has_permission('leave.delete')
    OR hrms.user_has_permission('leave.cancel')
    OR (
      hrms.user_has_permission('leave.withdraw')
      AND v_is_owner
      AND v_leave_status = 'pending'
    );

  IF NOT v_can_delete THEN
    RAISE EXCEPTION 'You do not have permission to delete leave requests';
  END IF;

  IF v_is_owner
    AND NOT (
      hrms.user_has_permission('leave.delete')
      OR hrms.user_has_permission('leave.cancel')
    )
    AND v_leave_status <> 'pending'
  THEN
    RAISE EXCEPTION 'You can only delete pending leave requests';
  END IF;

  v_balance_year := EXTRACT(YEAR FROM v_start_date)::smallint;

  IF v_leave_status = 'pending' THEN
    UPDATE hrms.leave_balances AS lb
    SET
      pending_days = GREATEST(0, lb.pending_days - v_paid_days),
      balance_days = lb.allocated_days - lb.used_days - GREATEST(0, lb.pending_days - v_paid_days),
      updated_at = public.utc_now(),
      updated_by = auth.uid()
    WHERE lb.employee_id = v_employee_id
      AND lb.leave_type_id = v_leave_type_id
      AND lb.balance_year = v_balance_year
      AND lb.deleted_at IS NULL;
  ELSIF v_leave_status = 'approved' THEN
    UPDATE hrms.leave_balances AS lb
    SET
      used_days = GREATEST(0, lb.used_days - v_paid_days),
      balance_days = lb.allocated_days - GREATEST(0, lb.used_days - v_paid_days) - lb.pending_days,
      updated_at = public.utc_now(),
      updated_by = auth.uid()
    WHERE lb.employee_id = v_employee_id
      AND lb.leave_type_id = v_leave_type_id
      AND lb.balance_year = v_balance_year
      AND lb.deleted_at IS NULL;
  END IF;

  UPDATE hrms.leave_approvals AS la
  SET
    deleted_at = public.utc_now(),
    updated_at = public.utc_now(),
    updated_by = auth.uid()
  WHERE la.leave_request_id = p_leave_request_id
    AND la.deleted_at IS NULL;

  UPDATE hrms.leave_requests AS lr
  SET
    deleted_at = public.utc_now(),
    status = 'inactive',
    updated_at = public.utc_now(),
    updated_by = auth.uid()
  WHERE lr.id = p_leave_request_id
    AND lr.deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

COMMENT ON FUNCTION hrms.soft_delete_leave_request(uuid) IS
  'Soft-deletes a leave request; restores paid balance days from duration_breakdown.paidDays (fallback total_days).';
