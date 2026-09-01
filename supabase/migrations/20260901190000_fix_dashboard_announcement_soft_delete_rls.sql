-- Soft-delete of dashboard announcements fails when SELECT requires deleted_at IS NULL:
-- PostgreSQL also applies SELECT policies to the updated row, so setting deleted_at is rejected.
-- Managers may still see (and therefore update) rows after deleted_at is set; the app list
-- continues to filter deleted_at IS NULL.

DROP POLICY IF EXISTS dashboard_announcements_select_policy ON hrms.dashboard_announcements;
CREATE POLICY dashboard_announcements_select_policy
  ON hrms.dashboard_announcements
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT hrms.current_user_organization_ids())
    AND (
      (
        deleted_at IS NULL
        AND is_published = true
        AND status = 'active'
      )
      OR hrms.user_has_permission('dashboard_announcement.manage')
    )
  );
