import { cache } from "react";
import type {
  Employee,
  EmploymentStatus,
  Organization,
  Permission,
  Role,
  UserProfile,
} from "@/types/auth";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationLogoSignedUrl } from "@/lib/organization/services/org-logo";
import { cleanDisplayText } from "@/lib/employees/parse-employee-name";
import { isEmployeeAppVisible } from "@/lib/employees/app-hidden";

export type AuthSupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** Employment statuses that may sign in (must also have record status = active). */
const LOGIN_ELIGIBLE_EMPLOYMENT_STATUSES: EmploymentStatus[] = [
  "active",
  "probation",
];

const LOGIN_ELIGIBLE_ACCOUNT_STATUSES = [
  "active",
  "invited",
  "invitation_pending",
  "invitation_accepted",
] as const;

type EmployeeRow = {
  id: string;
  organization_id: string;
  branch_id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  employment_status: Employee["employmentStatus"];
  account_status: NonNullable<Employee["accountStatus"]>;
  status: Employee["status"];
  deleted_at: string | null;
  app_hidden_at: string | null;
};

type OrganizationRow = {
  id: string;
  name: string;
  legal_name: string | null;
  email: string | null;
  logo_storage_path: string | null;
  status: Organization["status"];
};

function mapOrganization(
  row: OrganizationRow,
  logoUrl: string | null = null,
): Organization {
  return {
    id: row.id,
    name: row.name,
    legalName: row.legal_name,
    email: row.email,
    logoStoragePath: row.logo_storage_path,
    logoUrl,
    status: row.status,
  };
}

function mapEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    organizationId: row.organization_id,
    branchId: row.branch_id,
    employeeCode: row.employee_code,
    firstName: cleanDisplayText(row.first_name),
    lastName: cleanDisplayText(row.last_name),
    email: row.email,
    employmentStatus: row.employment_status,
    accountStatus: row.account_status,
    status: row.status,
  };
}

export type ProfileLoadError =
  | "EMPLOYEE_NOT_FOUND"
  | "EMPLOYEE_DELETED"
  | "EMPLOYEE_INACTIVE"
  | "NO_ROLES"
  | "ORGANIZATION_NOT_FOUND"
  | "PROFILE_LOOKUP_FAILED";

export type ProfileLoadResult =
  | { success: true; profile: UserProfile }
  | { success: false; error: ProfileLoadError };

export type LoadUserProfileOptions = {
  /** When false, skip storage signed-URL work (layout critical path). */
  includeOrganizationLogo?: boolean;
  /**
   * HMAC-verified permission codes from the signed cookie.
   * When provided and non-empty, skips get_user_permission_codes RPC.
   * Callers must only pass codes from getVerifiedPermissionCodesForUser.
   */
  verifiedPermissionCodes?: string[] | null;
};

export const loadUserProfile = cache(async function loadUserProfile(
  userId: string,
  email: string,
  supabaseClient?: AuthSupabaseClient,
  options?: LoadUserProfileOptions,
): Promise<ProfileLoadResult> {
  const t0 = performance.now();
  const mark = (label: string) => {
    if (process.env.NODE_ENV === "development") {
      console.info("[layout-timing]", {
        atMs: Math.round(performance.now() - t0),
        label: `loadUserProfile:${label}`,
      });
    }
  };

  const supabase = supabaseClient ?? (await createClient());

  // HRMS RLS policies depend on auth.uid(). Reuse the client that holds the
  // active session (especially right after signInWithPassword in a Server Action).
  if (!supabaseClient) {
    const {
      data: { user: sessionUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !sessionUser || sessionUser.id !== userId) {
      return { success: false, error: "EMPLOYEE_NOT_FOUND" };
    }
    mark("getUser");
  }

  const { data: employeeRow, error: employeeError } = await supabase
    .schema("hrms")
    .from("employees")
    .select(
      "id, organization_id, branch_id, employee_code, first_name, last_name, email, employment_status, account_status, status, deleted_at, app_hidden_at",
    )
    .eq("user_id", userId)
    .maybeSingle();
  mark("employee");

  if (employeeError) {
    if (process.env.NODE_ENV === "development") {
      console.error("[loadUserProfile] employee query failed:", {
        code: employeeError.code,
        message: employeeError.message,
        hasUserId: Boolean(userId),
      });
    }
    // Do not pretend the employee is unlinked when PostgREST/DB failed.
    return { success: false, error: "PROFILE_LOOKUP_FAILED" };
  }

  if (!employeeRow) {
    if (process.env.NODE_ENV === "development") {
      console.info("[login-timing]", {
        label: "loadUserProfile:employee_missing",
        hasUserId: Boolean(userId),
      });
    }
    return { success: false, error: "EMPLOYEE_NOT_FOUND" };
  }

  if (employeeRow.deleted_at || !isEmployeeAppVisible(employeeRow)) {
    return { success: false, error: "EMPLOYEE_DELETED" };
  }

  if (
    employeeRow.status !== "active" ||
    !LOGIN_ELIGIBLE_ACCOUNT_STATUSES.includes(
      employeeRow.account_status,
    )
  ) {
    return { success: false, error: "EMPLOYEE_INACTIVE" };
  }

  const isInviteSetupEmployee =
    employeeRow.employment_status === "draft" &&
    (employeeRow.account_status === "invited" ||
      employeeRow.account_status === "invitation_pending" ||
      employeeRow.account_status === "invitation_accepted");

  if (
    !isInviteSetupEmployee &&
    !LOGIN_ELIGIBLE_EMPLOYMENT_STATUSES.includes(
      employeeRow.employment_status,
    )
  ) {
    return { success: false, error: "EMPLOYEE_INACTIVE" };
  }

  const [
    { data: organizationRow, error: organizationError },
    { data: userRoleRows, error: userRolesError },
  ] = await Promise.all([
    supabase
      .schema("hrms")
      .from("organizations")
      .select("id, name, legal_name, email, logo_storage_path, status")
      .eq("id", employeeRow.organization_id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .schema("hrms")
      .from("user_roles")
      .select("role_id")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .eq("status", "active"),
  ]);
  mark("organization+user_roles");

  if (organizationError || !organizationRow) {
    return { success: false, error: "ORGANIZATION_NOT_FOUND" };
  }

  if (userRolesError || !userRoleRows?.length) {
    return { success: false, error: "NO_ROLES" };
  }

  const roleIds = userRoleRows.map((row) => row.role_id);

  const cachedPermissionCodes =
    Array.isArray(options?.verifiedPermissionCodes) &&
    options.verifiedPermissionCodes.length > 0
      ? options.verifiedPermissionCodes
      : null;

  // Layout critical path: skip storage signing (caller may load logo after paint).
  const logoPromise =
    options?.includeOrganizationLogo === false
      ? Promise.resolve(null)
      : getOrganizationLogoSignedUrl(
          supabase,
          organizationRow.logo_storage_path,
        );

  const rolesPromise = supabase
    .schema("hrms")
    .from("roles")
    .select("id, name, code, is_system_role, parent_role_id, status")
    .in("id", roleIds)
    .is("deleted_at", null)
    .eq("status", "active");

  // Fail-closed: only skip RPC when HMAC-verified codes were supplied by caller.
  const permissionCodesRpcPromise = cachedPermissionCodes
    ? Promise.resolve({ data: cachedPermissionCodes, error: null })
    : supabase.schema("hrms").rpc("get_user_permission_codes", {
        p_user_id: userId,
      });

  const [
    organizationLogoUrl,
    { data: roleRows, error: rolesError },
    { data: rpcCodes, error: rpcCodesError },
  ] = await Promise.all([
    logoPromise,
    rolesPromise,
    permissionCodesRpcPromise,
  ]);
  mark(
    cachedPermissionCodes
      ? "roles+permission_cookie"
      : "roles+permission_rpc",
  );
  if (options?.includeOrganizationLogo === false) {
    mark("logo_skipped");
  }

  if (rolesError || !roleRows?.length) {
    return { success: false, error: "NO_ROLES" };
  }

  const organization = mapOrganization(organizationRow, organizationLogoUrl);

  const roles: Role[] = roleRows.map((role) => ({
    id: role.id,
    name: role.name,
    code: role.code,
    isSystemRole: role.is_system_role,
    status: role.status,
  }));

  let permissions: Permission[] = [];
  let permissionCodes: string[] = [];

  if (!rpcCodesError && Array.isArray(rpcCodes)) {
    permissionCodes = rpcCodes.filter(
      (code): code is string => typeof code === "string",
    );

    // Nav and server guards use permissionCodes. Skip hydrating the full
    // permissions catalog on the layout critical path (extra round-trip).
    permissions = [];
  } else {
    const { data: orgRoles } = await supabase
      .schema("hrms")
      .from("roles")
      .select("id, parent_role_id")
      .eq("organization_id", employeeRow.organization_id)
      .is("deleted_at", null);

    const allRoleIds = new Set<string>(roleIds);
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

    if (permissionIds.length > 0) {
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

      permissions = (permissionRows ?? []).map((permission) => ({
        id: permission.id,
        code: permission.code,
        module: permission.module,
        action: permission.action,
        resource: permission.resource,
      }));
      permissionCodes = permissions.map((p) => p.code);
    }
  }

  return {
    success: true,
    profile: {
      userId,
      email,
      employee: mapEmployee(employeeRow),
      organization,
      roles,
      permissions,
      permissionCodes,
    },
  };
});

export const getCurrentUserProfile = cache(async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const { getLayoutUserProfile } = await import("@/lib/auth/layout-profile");
  const { getServerSession } = await import("@/lib/supabase/server");

  const session = await getServerSession();
  if (!session?.user.email) {
    return null;
  }

  const result = await getLayoutUserProfile(
    session.user.id,
    session.user.email,
    session.supabase,
  );

  if (!result.success) {
    return null;
  }

  return result.profile;
});
