-- Soft-delete all notifications owned by the current user.

CREATE OR REPLACE FUNCTION hrms.soft_delete_all_own_notifications()
RETURNS integer
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
  WHERE n.user_id = auth.uid()
    AND n.deleted_at IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

COMMENT ON FUNCTION hrms.soft_delete_all_own_notifications() IS
  'Soft-deletes all notifications owned by the current auth user. Returns deleted count.';

REVOKE ALL ON FUNCTION hrms.soft_delete_all_own_notifications() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_all_own_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION hrms.soft_delete_all_own_notifications() TO service_role;
