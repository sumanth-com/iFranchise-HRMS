-- Soft-delete RPC for promotion recommendations.

CREATE OR REPLACE FUNCTION hrms.soft_delete_performance_promotion(p_promotion_id uuid)
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
    RAISE EXCEPTION 'You do not have permission to delete promotions';
  END IF;

  SELECT p.organization_id
  INTO v_org_id
  FROM hrms.performance_promotions AS p
  WHERE p.id = p_promotion_id
    AND p.deleted_at IS NULL;

  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT hrms.user_belongs_to_organization(v_org_id) THEN
    RAISE EXCEPTION 'You do not have access to this promotion';
  END IF;

  UPDATE hrms.performance_promotions AS p
  SET
    deleted_at = public.utc_now(),
    updated_at = public.utc_now(),
    updated_by = auth.uid()
  WHERE p.id = p_promotion_id
    AND p.deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

COMMENT ON FUNCTION hrms.soft_delete_performance_promotion(uuid) IS
  'Soft-deletes a promotion recommendation when the caller has performance.edit or performance.create permission.';

REVOKE ALL ON FUNCTION hrms.soft_delete_performance_promotion(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_performance_promotion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_performance_promotion(uuid) TO service_role;
