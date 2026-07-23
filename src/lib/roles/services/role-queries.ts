import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type {
  PermissionCatalogItem,
  PermissionMatrixModule,
  RoleComparison,
  RoleListItem,
  RoleListParams,
  RoleListResult,
  RolePermissionDetail,
  RoleSearchResult,
  RolesDashboardStats,
  UserRoleAssignment,
  UserRoleListParams,
  UserRoleListResult,
} from "@/types/roles";
import {
  MODULE_LABELS,
  ACTION_ORDER,
  roleListParamsSchema,
  userRoleListParamsSchema,
} from "@/lib/validations/roles";

function parseRoleListParams(params: RoleListParams) {
  return roleListParamsSchema.parse(params);
}

function parseUserRoleListParams(params: UserRoleListParams) {
  return userRoleListParamsSchema.parse(params);
}

export async function getAllPermissions(
  supabase: AuthSupabaseClient,
): Promise<PermissionCatalogItem[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("permissions")
    .select("id, code, module, action, resource, description")
    .is("deleted_at", null)
    .eq("status", "active")
    .order("module")
    .order("action");

  if (error) throw new Error(error.message);

  return (data ?? []).map((p) => ({
    id: p.id,
    code: p.code,
    module: p.module,
    action: p.action,
    resource: p.resource,
    description: p.description,
  }));
}

export function buildPermissionMatrix(
  permissions: PermissionCatalogItem[],
): PermissionMatrixModule[] {
  const moduleMap = new Map<string, PermissionCatalogItem[]>();

  for (const perm of permissions) {
    const list = moduleMap.get(perm.module) ?? [];
    list.push(perm);
    moduleMap.set(perm.module, list);
  }

  return Array.from(moduleMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([module, perms]) => ({
      module,
      label: MODULE_LABELS[module] ?? module.replace(/_/g, " "),
      permissions: perms.sort((a, b) => {
        const ai = ACTION_ORDER.indexOf(a.action as (typeof ACTION_ORDER)[number]);
        const bi = ACTION_ORDER.indexOf(b.action as (typeof ACTION_ORDER)[number]);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      }),
    }));
}

export async function getRoleAncestorIds(
  supabase: AuthSupabaseClient,
  roleId: string,
  organizationId: string,
): Promise<string[]> {
  const { data: allRoles, error } = await supabase
    .schema("hrms")
    .from("roles")
    .select("id, parent_role_id")
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const parentMap = new Map(
    (allRoles ?? []).map((r) => [r.id, r.parent_role_id as string | null]),
  );

  const ancestors: string[] = [];
  let currentId = parentMap.get(roleId) ?? null;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);
    ancestors.push(currentId);
    currentId = parentMap.get(currentId) ?? null;
  }

  return ancestors;
}

export async function getRolePermissionIds(
  supabase: AuthSupabaseClient,
  roleIds: string[],
): Promise<string[]> {
  if (roleIds.length === 0) return [];

  const { data, error } = await supabase
    .schema("hrms")
    .from("role_permissions")
    .select("permission_id")
    .in("role_id", roleIds)
    .is("deleted_at", null)
    .eq("status", "active");

  if (error) throw new Error(error.message);
  return [...new Set((data ?? []).map((r) => r.permission_id))];
}

export async function getRolePermissionDetail(
  supabase: AuthSupabaseClient,
  organizationId: string,
  roleId: string,
): Promise<RolePermissionDetail> {
  const { data: role, error } = await supabase
    .schema("hrms")
    .from("roles")
    .select("id, name, parent_role_id, parent:parent_role_id (name)")
    .eq("id", roleId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!role) throw new Error("Role not found");

  const ancestorIds = await getRoleAncestorIds(supabase, roleId, organizationId);
  const directPermissionIds = await getRolePermissionIds(supabase, [roleId]);
  const inheritedPermissionIds = ancestorIds.length
    ? await getRolePermissionIds(supabase, ancestorIds)
    : [];

  const inheritedSet = new Set(inheritedPermissionIds);
  const directSet = new Set(directPermissionIds);
  const effectiveSet = new Set([...directSet, ...inheritedSet]);

  const parent = role.parent as { name: string } | { name: string }[] | null;
  const parentName = Array.isArray(parent) ? parent[0]?.name : parent?.name;

  return {
    roleId: role.id,
    roleName: role.name,
    directPermissionIds,
    inheritedPermissionIds: inheritedPermissionIds.filter((id) => !directSet.has(id)),
    effectivePermissionIds: [...effectiveSet],
    parentRoleId: role.parent_role_id,
    parentRoleName: parentName ?? null,
  };
}

export async function getRolesDashboardStats(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<RolesDashboardStats> {
  const { data: roles, error } = await supabase
    .schema("hrms")
    .from("roles")
    .select("id, name, code, is_system_role, updated_at")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .eq("status", "active");

  if (error) throw new Error(error.message);

  const { count: usersAssigned } = await supabase
    .schema("hrms")
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .eq("status", "active");

  const allRoles = roles ?? [];
  const recentlyUpdated = [...allRoles]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 5);

  const recentItems: RoleListItem[] = await Promise.all(
    recentlyUpdated.map(async (r) => {
      const [userCount, permissionCount] = await Promise.all([
        countRoleUsers(supabase, organizationId, r.id),
        countRolePermissions(supabase, r.id),
      ]);
      return {
        id: r.id,
        name: r.name,
        code: r.code,
        description: null,
        isSystemRole: r.is_system_role,
        isDefault: false,
        parentRoleId: null,
        parentRoleName: null,
        status: "active" as const,
        userCount,
        permissionCount,
        updatedAt: r.updated_at,
      };
    }),
  );

  return {
    totalRoles: allRoles.length,
    systemRoles: allRoles.filter((r) => r.is_system_role).length,
    customRoles: allRoles.filter((r) => !r.is_system_role).length,
    usersAssigned: usersAssigned ?? 0,
    recentlyUpdated: recentItems,
  };
}

async function countRoleUsers(
  supabase: AuthSupabaseClient,
  organizationId: string,
  roleId: string,
) {
  const { count } = await supabase
    .schema("hrms")
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("role_id", roleId)
    .is("deleted_at", null)
    .eq("status", "active");
  return count ?? 0;
}

async function countRolePermissions(supabase: AuthSupabaseClient, roleId: string) {
  const { count } = await supabase
    .schema("hrms")
    .from("role_permissions")
    .select("id", { count: "exact", head: true })
    .eq("role_id", roleId)
    .is("deleted_at", null)
    .eq("status", "active");
  return count ?? 0;
}

export async function listRoles(
  supabase: AuthSupabaseClient,
  organizationId: string,
  params: RoleListParams,
): Promise<RoleListResult> {
  const { page, pageSize, search, status } = parseRoleListParams(params);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .schema("hrms")
    .from("roles")
    .select(
      `id, name, code, description, is_system_role, is_default, parent_role_id, status, updated_at,
       parent:parent_role_id (name)`,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (search) {
    const term = `%${search}%`;
    query = query.or(`name.ilike.${term},code.ilike.${term}`);
  }
  if (status) query = query.eq("status", status);

  query = query.order("name").range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const rows = await Promise.all(
    (data ?? []).map(async (row) => {
      const parent = row.parent as { name: string } | { name: string }[] | null;
      const parentName = Array.isArray(parent) ? parent[0]?.name : parent?.name;
      const [userCount, permissionCount] = await Promise.all([
        countRoleUsers(supabase, organizationId, row.id),
        countRolePermissions(supabase, row.id),
      ]);
      return {
        id: row.id,
        name: row.name,
        code: row.code,
        description: row.description,
        isSystemRole: row.is_system_role,
        isDefault: row.is_default ?? false,
        parentRoleId: row.parent_role_id,
        parentRoleName: parentName ?? null,
        status: row.status,
        userCount,
        permissionCount,
        updatedAt: row.updated_at,
      };
    }),
  );

  return { data: rows, total: count ?? 0, page, pageSize };
}

export async function listUserRoleAssignments(
  supabase: AuthSupabaseClient,
  organizationId: string,
  params: UserRoleListParams,
): Promise<UserRoleListResult> {
  const { page, pageSize, search, roleId } = parseUserRoleListParams(params);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .schema("hrms")
    .from("user_roles")
    .select(
      `id, user_id, employee_id, role_id, created_at,
       roles:role_id (name, code),
       employees:employee_id (employee_code, first_name, last_name, email, departments:department_id (name))`,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .eq("status", "active");

  if (roleId) query = query.eq("role_id", roleId);

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  let rows = await Promise.all(
    (data ?? []).map(async (row) => {
      const role = unwrap(row.roles as { name: string; code: string } | { name: string; code: string }[] | null);
      const emp = unwrap(
        row.employees as
          | {
              employee_code: string;
              first_name: string;
              last_name: string;
              email: string;
              departments: { name: string } | { name: string }[] | null;
            }
          | {
              employee_code: string;
              first_name: string;
              last_name: string;
              email: string;
              departments: { name: string } | { name: string }[] | null;
            }[]
          | null,
      );
      const dept = emp ? unwrap(emp.departments) : null;

      const permissionCodes = await getUserEffectivePermissionCodes(
        supabase,
        organizationId,
        row.user_id,
      );

      return {
        id: row.id,
        userId: row.user_id,
        employeeId: row.employee_id,
        employeeCode: emp?.employee_code ?? null,
        employeeName: emp ? `${emp.first_name} ${emp.last_name}` : null,
        employeeEmail: emp?.email ?? null,
        departmentName: dept?.name ?? null,
        roleId: row.role_id,
        roleName: role?.name ?? "—",
        roleCode: role?.code ?? "",
        assignedAt: row.created_at,
        permissionCodes,
      };
    }),
  );

  if (search) {
    const term = search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.employeeName?.toLowerCase().includes(term) ||
        r.employeeCode?.toLowerCase().includes(term) ||
        r.employeeEmail?.toLowerCase().includes(term) ||
        r.roleName.toLowerCase().includes(term),
    );
  }

  return { data: rows, total: count ?? 0, page, pageSize };
}

function unwrap<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getUserEffectivePermissionCodes(
  supabase: AuthSupabaseClient,
  organizationId: string,
  userId: string,
): Promise<string[]> {
  const { data: userRoles } = await supabase
    .schema("hrms")
    .from("user_roles")
    .select("role_id")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .eq("status", "active");

  const roleIds = (userRoles ?? []).map((r) => r.role_id);
  if (roleIds.length === 0) return [];

  const allRoleIds = new Set<string>();
  for (const roleId of roleIds) {
    allRoleIds.add(roleId);
    const ancestors = await getRoleAncestorIds(supabase, roleId, organizationId);
    for (const a of ancestors) allRoleIds.add(a);
  }

  const permissionIds = await getRolePermissionIds(supabase, [...allRoleIds]);
  if (permissionIds.length === 0) return [];

  const { data: perms } = await supabase
    .schema("hrms")
    .from("permissions")
    .select("code")
    .in("id", permissionIds)
    .is("deleted_at", null)
    .eq("status", "active");

  return (perms ?? []).map((p) => p.code);
}

export async function compareRoles(
  supabase: AuthSupabaseClient,
  organizationId: string,
  roleAId: string,
  roleBId: string,
): Promise<RoleComparison> {
  const [detailA, detailB, allPermissions] = await Promise.all([
    getRolePermissionDetail(supabase, organizationId, roleAId),
    getRolePermissionDetail(supabase, organizationId, roleBId),
    getAllPermissions(supabase),
  ]);

  const setA = new Set(detailA.effectivePermissionIds);
  const setB = new Set(detailB.effectivePermissionIds);

  const onlyInA = allPermissions.filter((p) => setA.has(p.id) && !setB.has(p.id));
  const onlyInB = allPermissions.filter((p) => setB.has(p.id) && !setA.has(p.id));
  const shared = allPermissions.filter((p) => setA.has(p.id) && setB.has(p.id));

  const { data: roles } = await supabase
    .schema("hrms")
    .from("roles")
    .select("id, name, code")
    .in("id", [roleAId, roleBId]);

  const roleMap = new Map((roles ?? []).map((r) => [r.id, r]));

  return {
    roleA: {
      id: roleAId,
      name: roleMap.get(roleAId)?.name ?? detailA.roleName,
      code: roleMap.get(roleAId)?.code ?? "",
    },
    roleB: {
      id: roleBId,
      name: roleMap.get(roleBId)?.name ?? detailB.roleName,
      code: roleMap.get(roleBId)?.code ?? "",
    },
    onlyInA,
    onlyInB,
    shared,
  };
}

export async function searchRolesModule(
  supabase: AuthSupabaseClient,
  organizationId: string,
  query: string,
): Promise<RoleSearchResult> {
  const term = `%${query}%`;

  const [roles, permissions, employees] = await Promise.all([
    supabase
      .schema("hrms")
      .from("roles")
      .select("id, name, code")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .or(`name.ilike.${term},code.ilike.${term}`)
      .limit(10),
    supabase
      .schema("hrms")
      .from("permissions")
      .select("id, code, module")
      .is("deleted_at", null)
      .or(`code.ilike.${term},module.ilike.${term},description.ilike.${term}`)
      .limit(10),
    supabase
      .schema("hrms")
      .from("employees")
      .select("id, employee_code, first_name, last_name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .or(`first_name.ilike.${term},last_name.ilike.${term},employee_code.ilike.${term},email.ilike.${term}`)
      .limit(10),
  ]);

  return {
    roles: (roles.data ?? []).map((r) => ({ id: r.id, name: r.name, code: r.code })),
    permissions: (permissions.data ?? []).map((p) => ({
      id: p.id,
      code: p.code,
      module: p.module,
    })),
    employees: (employees.data ?? []).map((e) => ({
      id: e.id,
      name: `${e.first_name} ${e.last_name}`,
      employeeCode: e.employee_code,
    })),
  };
}

export async function getRoleLookupOptions(
  supabase: AuthSupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("roles")
    .select("id, name, code")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .eq("status", "active")
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ id: r.id, label: r.name, code: r.code }));
}

export async function getAssignableEmployees(
  supabase: AuthSupabaseClient,
  organizationId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("employees")
    .select("id, employee_code, first_name, last_name, email, user_id")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .in("employment_status", ["active", "probation", "on_leave"])
    .not("user_id", "is", null)
    .order("first_name");

  if (error) throw new Error(error.message);

  return (data ?? []).map((e) => ({
    id: e.id,
    label: `${e.first_name} ${e.last_name}`,
    code: e.employee_code,
  }));
}

export type EmployeeRoleAssignment = {
  userRoleId: string;
  roleId: string;
  roleName: string;
  roleCode: string;
  portalRoute: string | null;
};

export async function getEmployeeRoleAssignment(
  supabase: AuthSupabaseClient,
  organizationId: string,
  employeeId: string,
): Promise<EmployeeRoleAssignment | null> {
  const { data: employee } = await supabase
    .schema("hrms")
    .from("employees")
    .select("user_id")
    .eq("id", employeeId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!employee?.user_id) return null;

  const { data: assignment } = await supabase
    .schema("hrms")
    .from("user_roles")
    .select("id, role_id, roles:role_id (name, code, portal_route)")
    .eq("user_id", employee.user_id)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!assignment) return null;

  const role = unwrap(
    assignment.roles as
      | { name: string; code: string; portal_route: string | null }
      | { name: string; code: string; portal_route: string | null }[]
      | null,
  );

  if (!role) return null;

  return {
    userRoleId: assignment.id,
    roleId: assignment.role_id,
    roleName: role.name,
    roleCode: role.code,
    portalRoute: role.portal_route,
  };
}
