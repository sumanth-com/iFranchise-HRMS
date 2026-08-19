-- Soft-delete assets via SECURITY DEFINER. Direct UPDATE of deleted_at fails
-- SELECT RLS (deleted_at IS NULL) with "new row violates row-level security".

CREATE OR REPLACE FUNCTION hrms.soft_delete_asset(p_asset_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, hrms
AS $$
DECLARE
  v_updated integer := 0;
  v_org_id uuid;
  v_assignment_id uuid;
  v_status hrms.asset_status;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT hrms.user_has_permission('asset.delete') THEN
    RAISE EXCEPTION 'You do not have permission to delete assets';
  END IF;

  SELECT a.organization_id, a.current_assignment_id, a.asset_status
  INTO v_org_id, v_assignment_id, v_status
  FROM hrms.assets AS a
  WHERE a.id = p_asset_id
    AND a.deleted_at IS NULL;

  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT hrms.user_belongs_to_organization(v_org_id) THEN
    RAISE EXCEPTION 'You do not have access to this asset';
  END IF;

  IF v_assignment_id IS NOT NULL OR v_status = 'assigned' THEN
    RAISE EXCEPTION 'Return the asset before deleting it';
  END IF;

  UPDATE hrms.assets AS a
  SET
    deleted_at = public.utc_now(),
    asset_status = 'disposed',
    updated_at = public.utc_now(),
    updated_by = auth.uid()
  WHERE a.id = p_asset_id
    AND a.deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

COMMENT ON FUNCTION hrms.soft_delete_asset(uuid) IS
  'Soft-deletes an unassigned asset when the caller has asset.delete permission.';

REVOKE ALL ON FUNCTION hrms.soft_delete_asset(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_asset(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_asset(uuid) TO service_role;

CREATE OR REPLACE FUNCTION hrms.soft_delete_assigned_asset(p_assignment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, hrms
AS $$
DECLARE
  v_updated integer := 0;
  v_org_id uuid;
  v_asset_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    hrms.user_has_permission('asset.delete')
    OR hrms.user_has_permission('asset.edit')
  ) THEN
    RAISE EXCEPTION 'You do not have permission to delete assigned assets';
  END IF;

  SELECT aa.organization_id, aa.asset_id
  INTO v_org_id, v_asset_id
  FROM hrms.asset_assignments AS aa
  WHERE aa.id = p_assignment_id
    AND aa.deleted_at IS NULL;

  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT hrms.user_belongs_to_organization(v_org_id) THEN
    RAISE EXCEPTION 'You do not have access to this assignment';
  END IF;

  UPDATE hrms.assets AS a
  SET
    current_assignment_id = NULL,
    asset_status = 'disposed',
    deleted_at = public.utc_now(),
    updated_at = public.utc_now(),
    updated_by = auth.uid()
  WHERE a.id = v_asset_id
    AND a.organization_id = v_org_id
    AND a.deleted_at IS NULL;

  UPDATE hrms.asset_assignments AS aa
  SET
    deleted_at = public.utc_now(),
    assignment_status = 'returned',
    updated_at = public.utc_now(),
    updated_by = auth.uid()
  WHERE aa.id = p_assignment_id
    AND aa.deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

COMMENT ON FUNCTION hrms.soft_delete_assigned_asset(uuid) IS
  'Unlinks and soft-deletes an assigned asset when the caller has asset.delete or asset.edit.';

REVOKE ALL ON FUNCTION hrms.soft_delete_assigned_asset(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_assigned_asset(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_assigned_asset(uuid) TO service_role;

CREATE OR REPLACE FUNCTION hrms.soft_delete_asset_maintenance(p_maintenance_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, hrms
AS $$
DECLARE
  v_updated integer := 0;
  v_org_id uuid;
  v_created_by uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT m.organization_id, m.created_by
  INTO v_org_id, v_created_by
  FROM hrms.asset_maintenance AS m
  WHERE m.id = p_maintenance_id
    AND m.deleted_at IS NULL;

  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT hrms.user_belongs_to_organization(v_org_id) THEN
    RAISE EXCEPTION 'You do not have access to this record';
  END IF;

  IF NOT (
    hrms.user_has_permission('asset.delete')
    OR hrms.user_has_permission('asset.edit')
    OR v_created_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You do not have permission to delete this record';
  END IF;

  UPDATE hrms.asset_maintenance AS m
  SET
    deleted_at = public.utc_now(),
    updated_at = public.utc_now(),
    updated_by = auth.uid()
  WHERE m.id = p_maintenance_id
    AND m.deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

COMMENT ON FUNCTION hrms.soft_delete_asset_maintenance(uuid) IS
  'Soft-deletes an asset maintenance/report row for HR or the employee who created it.';

REVOKE ALL ON FUNCTION hrms.soft_delete_asset_maintenance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_asset_maintenance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_asset_maintenance(uuid) TO service_role;

DROP POLICY IF EXISTS assets_update_policy ON hrms.assets;
CREATE POLICY assets_update_policy ON hrms.assets
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS asset_assignments_update_policy ON hrms.asset_assignments;
CREATE POLICY asset_assignments_update_policy ON hrms.asset_assignments
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));

DROP POLICY IF EXISTS asset_maintenance_update_policy ON hrms.asset_maintenance;
CREATE POLICY asset_maintenance_update_policy ON hrms.asset_maintenance
  FOR UPDATE TO authenticated
  USING (hrms.user_belongs_to_organization(organization_id))
  WITH CHECK (hrms.user_belongs_to_organization(organization_id));
