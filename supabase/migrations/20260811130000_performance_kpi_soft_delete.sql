-- Soft-delete performance KPIs via SECURITY DEFINER (RLS blocks UPDATE representation when deleted_at is set).

CREATE OR REPLACE FUNCTION hrms.soft_delete_performance_kpi(p_kpi_id uuid)
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
    hrms.user_has_permission('kpi.manage')
    OR hrms.user_has_permission('performance.edit')
    OR hrms.user_has_permission('performance.create')
  ) THEN
    RAISE EXCEPTION 'You do not have permission to delete performance KPIs';
  END IF;

  SELECT k.organization_id
  INTO v_org_id
  FROM hrms.performance_kpis AS k
  WHERE k.id = p_kpi_id
    AND k.deleted_at IS NULL;

  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT hrms.user_belongs_to_organization(v_org_id) THEN
    RAISE EXCEPTION 'You do not have access to this KPI';
  END IF;

  UPDATE hrms.performance_kpis AS k
  SET
    deleted_at = public.utc_now(),
    updated_at = public.utc_now(),
    updated_by = auth.uid()
  WHERE k.id = p_kpi_id
    AND k.deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

COMMENT ON FUNCTION hrms.soft_delete_performance_kpi(uuid) IS
  'Soft-deletes a performance KPI when the caller has kpi.manage, performance.edit, or performance.create permission.';

REVOKE ALL ON FUNCTION hrms.soft_delete_performance_kpi(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_performance_kpi(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_performance_kpi(uuid) TO service_role;

DROP POLICY IF EXISTS performance_kpis_update_policy ON hrms.performance_kpis;
CREATE POLICY performance_kpis_update_policy ON hrms.performance_kpis
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (SELECT hrms.current_user_organization_ids())
  )
  WITH CHECK (
    organization_id IN (SELECT hrms.current_user_organization_ids())
  );
