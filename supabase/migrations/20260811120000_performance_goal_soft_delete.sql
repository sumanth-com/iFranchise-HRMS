-- Soft-delete performance goals via SECURITY DEFINER (RLS blocks UPDATE representation when deleted_at is set).

CREATE OR REPLACE FUNCTION hrms.soft_delete_performance_goal(p_goal_id uuid)
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
    hrms.user_has_permission('performance.edit')
    OR hrms.user_has_permission('performance.create')
  ) THEN
    RAISE EXCEPTION 'You do not have permission to delete performance goals';
  END IF;

  SELECT g.organization_id
  INTO v_org_id
  FROM hrms.performance_goals AS g
  WHERE g.id = p_goal_id
    AND g.deleted_at IS NULL;

  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT hrms.user_belongs_to_organization(v_org_id) THEN
    RAISE EXCEPTION 'You do not have access to this goal';
  END IF;

  UPDATE hrms.performance_goals AS g
  SET
    deleted_at = public.utc_now(),
    updated_at = public.utc_now(),
    updated_by = auth.uid()
  WHERE g.id = p_goal_id
    AND g.deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

COMMENT ON FUNCTION hrms.soft_delete_performance_goal(uuid) IS
  'Soft-deletes a performance goal when the caller has performance.edit or performance.create permission.';

REVOKE ALL ON FUNCTION hrms.soft_delete_performance_goal(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_performance_goal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_performance_goal(uuid) TO service_role;

-- Allow soft-delete updates without WITH CHECK conflicts on deleted_at.
DROP POLICY IF EXISTS performance_goals_update_policy ON hrms.performance_goals;
CREATE POLICY performance_goals_update_policy ON hrms.performance_goals
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT hrms.current_user_organization_ids())
  )
  WITH CHECK (
    organization_id IN (SELECT hrms.current_user_organization_ids())
  );
