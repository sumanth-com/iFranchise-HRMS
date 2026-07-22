import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";

type RoleParentRow = {
  id: string;
  parent_role_id: string | null;
};

/**
 * Resolves permission codes for a user, including inherited parent-role permissions.
 * Mirrors hrms.get_user_permission_codes() when the RPC is available.
 */
export async function resolveUserPermissionCodes(
  supabase: AuthSupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data: rpcCodes, error: rpcError } = await supabase
    .schema("hrms")
    .rpc("get_user_permission_codes", { p_user_id: userId });

  if (!rpcError && Array.isArray(rpcCodes)) {
    return rpcCodes.filter((code): code is string => typeof code === "string");
  }

  const { data: userRoles, error: userRolesError } = await supabase
    .schema("hrms")
    .from("user_roles")
    .select("role_id, organization_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .is("deleted_at", null);

  if (userRolesError || !userRoles?.length) return [];

  const roleIds = [...new Set(userRoles.map((row) => row.role_id as string))];
  const organizationIds = [
    ...new Set(userRoles.map((row) => row.organization_id as string)),
  ];

  const { data: orgRoles, error: orgRolesError } = await supabase
    .schema("hrms")
    .from("roles")
    .select("id, parent_role_id")
    .in("organization_id", organizationIds)
    .is("deleted_at", null);

  if (orgRolesError || !orgRoles?.length) return [];

  const parentMap = new Map(
    (orgRoles as RoleParentRow[]).map((role) => [role.id, role.parent_role_id]),
  );

  const allRoleIds = new Set<string>(roleIds);
  for (const roleId of roleIds) {
    let parentId = parentMap.get(roleId) ?? null;
    const visited = new Set<string>();
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId);
      allRoleIds.add(parentId);
      parentId = parentMap.get(parentId) ?? null;
    }
  }

  const { data: rolePermissions, error: rolePermissionsError } = await supabase
    .schema("hrms")
    .from("role_permissions")
    .select("permission_id")
    .in("role_id", [...allRoleIds])
    .eq("status", "active")
    .is("deleted_at", null);

  if (rolePermissionsError || !rolePermissions?.length) return [];

  const permissionIds = [
    ...new Set(rolePermissions.map((row) => row.permission_id as string)),
  ];

  const { data: permissions, error: permissionsError } = await supabase
    .schema("hrms")
    .from("permissions")
    .select("code")
    .in("id", permissionIds)
    .eq("status", "active")
    .is("deleted_at", null);

  if (permissionsError || !permissions?.length) return [];
  return permissions.map((permission) => permission.code as string);
}

export async function resolveUserPortalRoute(
  supabase: AuthSupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data: portalRoute, error } = await supabase
    .schema("hrms")
    .rpc("get_user_portal_route", { p_user_id: userId });

  if (!error && typeof portalRoute === "string" && portalRoute.length > 0) {
    return portalRoute;
  }

  return null;
}

export async function userAccountAllowsPortalAccess(
  supabase: AuthSupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data: allowed, error } = await supabase
    .schema("hrms")
    .rpc("user_account_allows_portal_access", { p_user_id: userId });

  if (!error && typeof allowed === "boolean") {
    return allowed;
  }

  const { data: employee, error: employeeError } = await supabase
    .schema("hrms")
    .from("employees")
    .select("account_status, status")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (employeeError || !employee) return false;

  const allowedStatuses = new Set([
    "active",
    "invited",
    "invitation_pending",
    "invitation_accepted",
  ]);

  return (
    employee.status === "active" &&
    allowedStatuses.has(employee.account_status as string)
  );
}
