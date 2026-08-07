-- Soft-delete recruitment job openings via SECURITY DEFINER to avoid RLS WITH CHECK
-- conflicts when setting deleted_at (SELECT policy requires deleted_at IS NULL).

CREATE OR REPLACE FUNCTION hrms.soft_delete_recruitment_job_opening(p_job_opening_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, hrms
AS $$
DECLARE
  v_updated integer := 0;
  v_org_id uuid;
  v_candidate_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT hrms.user_has_permission('recruitment.delete') THEN
    RAISE EXCEPTION 'You do not have permission to delete job openings';
  END IF;

  SELECT j.organization_id
  INTO v_org_id
  FROM hrms.recruitment_job_openings AS j
  WHERE j.id = p_job_opening_id
    AND j.deleted_at IS NULL;

  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT hrms.user_belongs_to_organization(v_org_id) THEN
    RAISE EXCEPTION 'You do not have access to this job opening';
  END IF;

  SELECT COUNT(*)::integer
  INTO v_candidate_count
  FROM hrms.recruitment_candidates AS c
  WHERE c.job_opening_id = p_job_opening_id
    AND c.organization_id = v_org_id
    AND c.deleted_at IS NULL;

  IF v_candidate_count > 0 THEN
    RAISE EXCEPTION 'Remove or reassign candidates before deleting this job opening';
  END IF;

  UPDATE hrms.recruitment_job_openings AS j
  SET
    deleted_at = public.utc_now(),
    job_status = 'closed',
    closed_at = public.utc_now(),
    updated_at = public.utc_now(),
    updated_by = auth.uid()
  WHERE j.id = p_job_opening_id
    AND j.deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

COMMENT ON FUNCTION hrms.soft_delete_recruitment_job_opening(uuid) IS
  'Soft-deletes a recruitment job opening when the caller has recruitment.delete permission.';

REVOKE ALL ON FUNCTION hrms.soft_delete_recruitment_job_opening(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_recruitment_job_opening(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_recruitment_job_opening(uuid) TO service_role;

DROP POLICY IF EXISTS recruitment_job_openings_update_policy ON hrms.recruitment_job_openings;
CREATE POLICY recruitment_job_openings_update_policy ON hrms.recruitment_job_openings
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT hrms.current_user_organization_ids())
  )
  WITH CHECK (
    organization_id IN (SELECT hrms.current_user_organization_ids())
  );
