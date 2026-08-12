-- Allow role.delete holders to soft-delete roles and clear assignments.
-- Previously only role.edit / user_role.assign / role.manage could UPDATE these tables,
-- so deleting a role with assigned users failed RLS on user_roles.

DROP POLICY IF EXISTS roles_update_policy ON hrms.roles;
CREATE POLICY roles_update_policy ON hrms.roles
  FOR UPDATE TO authenticated
  USING (
    hrms.user_belongs_to_organization(organization_id)
    AND (
      hrms.user_has_permission('role.edit')
      OR hrms.user_has_permission('role.delete')
      OR hrms.user_has_permission('role.manage')
      OR hrms.user_has_permission('settings.manage')
    )
  )
  WITH CHECK (
    hrms.user_belongs_to_organization(organization_id)
    AND (
      hrms.user_has_permission('role.edit')
      OR hrms.user_has_permission('role.delete')
      OR hrms.user_has_permission('role.manage')
      OR hrms.user_has_permission('settings.manage')
    )
  );

DROP POLICY IF EXISTS user_roles_update_policy ON hrms.user_roles;
CREATE POLICY user_roles_update_policy ON hrms.user_roles
  FOR UPDATE TO authenticated
  USING (
    hrms.user_belongs_to_organization(organization_id)
    AND (
      hrms.user_has_permission('user_role.assign')
      OR hrms.user_has_permission('role.delete')
      OR hrms.user_has_permission('role.manage')
      OR hrms.user_has_permission('settings.manage')
    )
  )
  WITH CHECK (
    hrms.user_belongs_to_organization(organization_id)
    AND (
      hrms.user_has_permission('user_role.assign')
      OR hrms.user_has_permission('role.delete')
      OR hrms.user_has_permission('role.manage')
      OR hrms.user_has_permission('settings.manage')
    )
  );
