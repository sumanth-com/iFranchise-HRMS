-- Soft-delete own notifications without RLS RETURNING/SELECT conflicts.
-- Direct UPDATE + representation fails because SELECT policy requires deleted_at IS NULL.

CREATE OR REPLACE FUNCTION hrms.soft_delete_own_notification(p_notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, hrms
AS $$
DECLARE
  v_updated integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE hrms.notifications AS n
  SET
    deleted_at = public.utc_now(),
    updated_at = public.utc_now(),
    updated_by = auth.uid()
  WHERE n.id = p_notification_id
    AND n.user_id = auth.uid()
    AND n.deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

COMMENT ON FUNCTION hrms.soft_delete_own_notification(uuid) IS
  'Soft-deletes a notification owned by the current auth user.';

REVOKE ALL ON FUNCTION hrms.soft_delete_own_notification(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_own_notification(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_own_notification(uuid) TO service_role;

-- Keep owner updates allowed even when soft-deleting (deleted_at becomes non-null).
DROP POLICY IF EXISTS notifications_update_policy ON hrms.notifications;
CREATE POLICY notifications_update_policy ON hrms.notifications
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND hrms.user_belongs_to_organization(organization_id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND hrms.user_belongs_to_organization(organization_id)
  );
