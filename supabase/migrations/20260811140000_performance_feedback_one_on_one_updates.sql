-- Meeting link on 1:1 records + soft-delete RPCs for feedback and meetings.

ALTER TABLE hrms.performance_one_on_ones
  ADD COLUMN IF NOT EXISTS meeting_link text;

CREATE OR REPLACE FUNCTION hrms.soft_delete_performance_feedback(p_feedback_id uuid)
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
    hrms.user_has_permission('performance.feedback')
    OR hrms.user_has_permission('performance.edit')
    OR hrms.user_has_permission('performance.create')
  ) THEN
    RAISE EXCEPTION 'You do not have permission to delete feedback';
  END IF;

  SELECT f.organization_id
  INTO v_org_id
  FROM hrms.performance_feedback AS f
  WHERE f.id = p_feedback_id
    AND f.deleted_at IS NULL;

  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT hrms.user_belongs_to_organization(v_org_id) THEN
    RAISE EXCEPTION 'You do not have access to this feedback';
  END IF;

  UPDATE hrms.performance_feedback AS f
  SET
    deleted_at = public.utc_now(),
    updated_at = public.utc_now(),
    updated_by = auth.uid()
  WHERE f.id = p_feedback_id
    AND f.deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

COMMENT ON FUNCTION hrms.soft_delete_performance_feedback(uuid) IS
  'Soft-deletes feedback when the caller has performance.feedback, performance.edit, or performance.create permission.';

REVOKE ALL ON FUNCTION hrms.soft_delete_performance_feedback(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_performance_feedback(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_performance_feedback(uuid) TO service_role;

CREATE OR REPLACE FUNCTION hrms.soft_delete_performance_one_on_one(p_meeting_id uuid)
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
    hrms.user_has_permission('performance.create')
    OR hrms.user_has_permission('performance.edit')
  ) THEN
    RAISE EXCEPTION 'You do not have permission to delete 1:1 meetings';
  END IF;

  SELECT m.organization_id
  INTO v_org_id
  FROM hrms.performance_one_on_ones AS m
  WHERE m.id = p_meeting_id
    AND m.deleted_at IS NULL;

  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT hrms.user_belongs_to_organization(v_org_id) THEN
    RAISE EXCEPTION 'You do not have access to this meeting';
  END IF;

  UPDATE hrms.performance_one_on_ones AS m
  SET
    deleted_at = public.utc_now(),
    updated_at = public.utc_now(),
    updated_by = auth.uid()
  WHERE m.id = p_meeting_id
    AND m.deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

COMMENT ON FUNCTION hrms.soft_delete_performance_one_on_one(uuid) IS
  'Soft-deletes a 1:1 meeting when the caller has performance.create or performance.edit permission.';

REVOKE ALL ON FUNCTION hrms.soft_delete_performance_one_on_one(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_performance_one_on_one(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_performance_one_on_one(uuid) TO service_role;

DROP POLICY IF EXISTS performance_feedback_update_policy ON hrms.performance_feedback;
CREATE POLICY performance_feedback_update_policy ON hrms.performance_feedback
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT hrms.current_user_organization_ids())
  )
  WITH CHECK (
    organization_id IN (SELECT hrms.current_user_organization_ids())
  );

DROP POLICY IF EXISTS performance_one_on_ones_update_policy ON hrms.performance_one_on_ones;
CREATE POLICY performance_one_on_ones_update_policy ON hrms.performance_one_on_ones
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT hrms.current_user_organization_ids())
  )
  WITH CHECK (
    organization_id IN (SELECT hrms.current_user_organization_ids())
  );
