import type {
  Employee,
  EmploymentStatus,
  Organization,
  Permission,
  Role,
  UserProfile,
} from "@/types/auth";
import { createClient } from "@/lib/supabase/server";

export type AuthSupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** Employment statuses that may sign in (must also have record status = active). */
const LOGIN_ELIGIBLE_EMPLOYMENT_STATUSES: EmploymentStatus[] = [
  "active",
  "probation",
];

type EmployeeRow = {
  id: string;
  organization_id: string;
  branch_id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  employment_status: Employee["employmentStatus"];
  status: Employee["status"];
  deleted_at: string | null;
};

type OrganizationRow = {
  id: string;
  name: string;
  legal_name: string | null;
  email: string | null;
  logo_storage_path: string | null;
  status: Organization["status"];
};

function mapEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id,
    employeeCode: row.employee_code,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    employmentStatus: row.employment_status,
    status: row.status,
  };
}

function mapOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    legalName: row.legal_name,
    email: row.email,
    logoStoragePath: row.logo_storage_path,
    status: row.status,
  };
}

export type ProfileLoadError =
  | "EMPLOYEE_NOT_FOUND"
  | "EMPLOYEE_DELETED"
  | "EMPLOYEE_INACTIVE"
  | "NO_ROLES"
  | "ORGANIZATION_NOT_FOUND";

export type ProfileLoadResult =
  | { success: true; profile: UserProfile }
  | { success: false; error: ProfileLoadError };

export async function loadUserProfile(
  userId: string,
  email: string,
  supabaseClient?: AuthSupabaseClient,
): Promise<ProfileLoadResult> {
  const supabase = supabaseClient ?? (await createClient());

  // HRMS RLS policies depend on auth.uid(). Reuse the client that holds the
  // active session (especially right after signInWithPassword in a Server Action).
  if (!supabaseClient) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return { success: false, error: "EMPLOYEE_NOT_FOUND" };
    }
  }

  const { data: employeeRow, error: employeeError } = await supabase
    .schema("hrms")
    .from("employees")
    .select(
      "id, organization_id, branch_id, employee_code, first_name, last_name, email, employment_status, status, deleted_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (employeeError || !employeeRow) {
    return { success: false, error: "EMPLOYEE_NOT_FOUND" };
  }

  if (employeeRow.deleted_at) {
    return { success: false, error: "EMPLOYEE_DELETED" };
  }

  if (
    employeeRow.status !== "active" ||
    !LOGIN_ELIGIBLE_EMPLOYMENT_STATUSES.includes(
      employeeRow.employment_status,
    )
  ) {
    return { success: false, error: "EMPLOYEE_INACTIVE" };
  }

  const { data: organizationRow, error: organizationError } = await supabase
    .schema("hrms")
    .from("organizations")
    .select("id, name, legal_name, email, logo_storage_path, status")
    .eq("id", employeeRow.organization_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (organizationError || !organizationRow) {
    return { success: false, error: "ORGANIZATION_NOT_FOUND" };
  }

  const { data: userRoleRows, error: userRolesError } = await supabase
    .schema("hrms")
    .from("user_roles")
    .select("role_id")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .eq("status", "active");

  if (userRolesError || !userRoleRows?.length) {
    return { success: false, error: "NO_ROLES" };
  }

  const roleIds = userRoleRows.map((row) => row.role_id);

  const { data: roleRows, error: rolesError } = await supabase
    .schema("hrms")
    .from("roles")
    .select("id, name, code, is_system_role, parent_role_id, status")
    .in("id", roleIds)
    .is("deleted_at", null)
    .eq("status", "active");

  if (rolesError || !roleRows?.length) {
    return { success: false, error: "NO_ROLES" };
  }

  const roles: Role[] = roleRows.map((role) => ({
    id: role.id,
    name: role.name,
    code: role.code,
    isSystemRole: role.is_system_role,
    status: role.status,
  }));

  const allRoleIds = new Set<string>(roleIds);
  const { data: orgRoles } = await supabase
    .schema("hrms")
    .from("roles")
    .select("id, parent_role_id")
    .eq("organization_id", employeeRow.organization_id)
    .is("deleted_at", null);

  const parentMap = new Map(
    (orgRoles ?? []).map((r) => [r.id, r.parent_role_id as string | null]),
  );

  for (const roleId of roleIds) {
    let parentId = parentMap.get(roleId) ?? null;
    const visited = new Set<string>();
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId);
      allRoleIds.add(parentId);
      parentId = parentMap.get(parentId) ?? null;
    }
  }

  const { data: rolePermissionRows, error: permissionsError } = await supabase
    .schema("hrms")
    .from("role_permissions")
    .select("permission_id")
    .in("role_id", [...allRoleIds])
    .is("deleted_at", null)
    .eq("status", "active");

  if (permissionsError) {
    return { success: false, error: "NO_ROLES" };
  }

  const permissionIds = [
    ...new Set(
      (rolePermissionRows ?? []).map((row) => row.permission_id),
    ),
  ];

  if (permissionIds.length === 0) {
    return {
      success: true,
      profile: {
        userId,
        email,
        employee: mapEmployee(employeeRow),
        organization: mapOrganization(organizationRow),
        roles,
        permissions: [],
        permissionCodes: [],
      },
    };
  }

  const { data: permissionRows, error: permissionRowsError } = await supabase
    .schema("hrms")
    .from("permissions")
    .select("id, code, module, action, resource")
    .in("id", permissionIds)
    .is("deleted_at", null)
    .eq("status", "active");

  if (permissionRowsError) {
    return { success: false, error: "NO_ROLES" };
  }

  const permissions: Permission[] = (permissionRows ?? []).map(
    (permission) => ({
      id: permission.id,
      code: permission.code,
      module: permission.module,
      action: permission.action,
      resource: permission.resource,
    }),
  );
  const permissionCodes = permissions.map((p) => p.code);

  return {
    success: true,
    profile: {
      userId,
      email,
      employee: mapEmployee(employeeRow),
      organization: mapOrganization(organizationRow),
      roles,
      permissions,
      permissionCodes,
    },
  };
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return null;
  }

  const result = await loadUserProfile(user.id, user.email, supabase);

  if (!result.success) {
    return null;
  }

  return result.profile;
}
