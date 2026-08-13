-- Soft-delete salary structures via SECURITY DEFINER to avoid RLS WITH CHECK
-- conflicts when setting deleted_at (SELECT policy requires deleted_at IS NULL).

CREATE OR REPLACE FUNCTION hrms.soft_delete_salary_structure(p_structure_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, hrms
AS $$
DECLARE
  v_updated integer := 0;
  v_employee_id uuid;
  v_effective_from date;
  v_effective_to date;
  v_was_current boolean := false;
  v_previous_id uuid;
  v_today date := (timezone('utc', now()))::date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    hrms.user_has_permission('salary_structure.delete')
    OR hrms.user_has_permission('salary_structure.edit')
    OR hrms.user_has_permission('salary_structure.create')
    OR hrms.user_has_permission('salary.edit')
  ) THEN
    RAISE EXCEPTION 'You do not have permission to delete salary structures';
  END IF;

  SELECT
    s.employee_id,
    s.effective_from,
    s.effective_to
  INTO
    v_employee_id,
    v_effective_from,
    v_effective_to
  FROM hrms.salary_structures AS s
  INNER JOIN hrms.employees AS e ON e.id = s.employee_id
  WHERE s.id = p_structure_id
    AND s.deleted_at IS NULL
    AND e.deleted_at IS NULL
    AND hrms.user_belongs_to_organization(e.organization_id);

  IF v_employee_id IS NULL THEN
    RETURN false;
  END IF;

  v_was_current :=
    v_effective_from <= v_today
    AND (v_effective_to IS NULL OR v_effective_to >= v_today);

  UPDATE hrms.salary_structures AS s
  SET
    deleted_at = public.utc_now(),
    updated_at = public.utc_now(),
    updated_by = auth.uid()
  WHERE s.id = p_structure_id
    AND s.deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    RETURN false;
  END IF;

  IF v_was_current THEN
    SELECT s.id
    INTO v_previous_id
    FROM hrms.salary_structures AS s
    WHERE s.employee_id = v_employee_id
      AND s.deleted_at IS NULL
      AND s.id <> p_structure_id
    ORDER BY s.effective_from DESC
    LIMIT 1;

    IF v_previous_id IS NOT NULL THEN
      UPDATE hrms.salary_structures AS s
      SET
        effective_to = NULL,
        updated_at = public.utc_now(),
        updated_by = auth.uid()
      WHERE s.id = v_previous_id
        AND s.deleted_at IS NULL;
    END IF;
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION hrms.soft_delete_salary_structure(uuid) IS
  'Soft-deletes a salary structure and reopens the prior structure when the deleted one was current.';

REVOKE ALL ON FUNCTION hrms.soft_delete_salary_structure(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_salary_structure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_salary_structure(uuid) TO service_role;

DROP POLICY IF EXISTS salary_structures_update_policy ON hrms.salary_structures;
CREATE POLICY salary_structures_update_policy ON hrms.salary_structures
  FOR UPDATE TO authenticated
  USING (hrms.employee_belongs_to_user_org(employee_id))
  WITH CHECK (hrms.employee_belongs_to_user_org(employee_id));
