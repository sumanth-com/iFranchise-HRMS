import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { fromHrms, unwrapRelation } from "@/lib/reports/services/reports-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  derivePortalFromRoleCode,
  loadExecutiveDirectoryRoleCodes,
  loadUserProvisioningInviteRoles,
} from "@/lib/user-provisioning/provisionable-roles";
import type { UserProfile } from "@/types/auth";
import type { LookupOption } from "@/types/employee";
import {
  ROLE_LABELS,
  type CeoProvisioningListParams,
  type CeoProvisioningListResult,
  type CeoProvisioningLookups,
  type CeoProvisioningSummary,
  type CeoProvisioningTimelineEntry,
  type CeoProvisioningUser,
  type CeoProvisioningUserDetail,
  type ProvisioningInvitationStatus,
} from "@/types/ceo-user-provisioning";

const INVITATION_EXPIRY_HOURS = 48;

const ROLE_PRIORITY: Record<string, number> = {
  founder: 0,
  co_founder: 1,
  ceo: 2,
  hr_admin: 3,
  hr_executive: 4,
  manager: 5,
  employee: 6,
};

function rolePriority(code: string) {
  return ROLE_PRIORITY[code] ?? 99;
}

function normalizePortalKey(value: string | null | undefined) {
  if (value === "hr" || value === "ceo" || value === "manager" || value === "employee") {
    return value;
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseRow = Record<string, any>;

type NormalizedExecutiveUser = CeoProvisioningUser & {
  employmentTypeId: string | null;
  employmentTypeName: string | null;
  joiningDate: string | null;
  firstLoginAt: string | null;
  invitationCancelledAt: string | null;
};

function fullName(first?: string | null, last?: string | null) {
  return [first, last].filter(Boolean).join(" ").trim();
}

function deriveInvitationStatus(row: LooseRow): ProvisioningInvitationStatus {
  const status = String(row.account_status ?? "draft");
  if (status === "active") return "accepted";
  if (status === "suspended") return "revoked";
  if (status === "inactive") return "inactive";
  if (status === "draft") {
    return row.invitation_cancelled_at ? "cancelled" : "pending";
  }
  // invited / invitation_pending
  if (row.invitation_sent_at) {
    const ageMs = Date.now() - new Date(row.invitation_sent_at).getTime();
    if (ageMs > INVITATION_EXPIRY_HOURS * 60 * 60 * 1000) return "expired";
  }
  return "pending";
}

function buildProvisioningUserRow(
  employee: LooseRow,
  role: LooseRow,
  profile: UserProfile,
): NormalizedExecutiveUser {
  const roleCode = String(role.code);
  const portalKey =
    normalizePortalKey(role.portal_key) ?? derivePortalFromRoleCode(roleCode);
  const department = unwrapRelation<LooseRow>(employee.departments);
  const branch = unwrapRelation<LooseRow>(employee.branches);
  const designation = unwrapRelation<LooseRow>(employee.designations);
  const employmentType = unwrapRelation<LooseRow>(employee.employment_types);
  const manager = unwrapRelation<LooseRow>(employee.manager);

  return {
    employeeId: employee.id,
    userId: employee.user_id ?? null,
    employeeCode: employee.employee_code,
    firstName: employee.first_name,
    lastName: employee.last_name,
    fullName: fullName(employee.first_name, employee.last_name),
    email: employee.email,
    roleCode,
    portalKey,
    roleLabel: ROLE_LABELS[roleCode] ?? role.name ?? roleCode,
    departmentName: department?.name ?? null,
    branchName: branch?.name ?? null,
    designationTitle: designation?.title ?? null,
    reportingManagerName: manager
      ? fullName(manager.first_name, manager.last_name) || null
      : null,
    invitationStatus: deriveInvitationStatus(employee),
    accountStatus: String(employee.account_status ?? "draft"),
    sentByName: null,
    invitationSentAt: employee.invitation_sent_at ?? null,
    acceptedAt: employee.account_activated_at ?? employee.first_login_at ?? null,
    lastActivityAt: employee.last_login_at ?? employee.updated_at ?? null,
    isSelf: employee.id === profile.employee.id,
    employmentTypeId: employee.employment_type_id ?? null,
    employmentTypeName: employmentType?.name ?? null,
    joiningDate: employee.date_of_joining ?? null,
    firstLoginAt: employee.first_login_at ?? null,
    invitationCancelledAt: employee.invitation_cancelled_at ?? null,
  };
}

const EMPLOYEE_SELECT_FIELDS = `
  id, user_id, employee_code, first_name, last_name, email,
  account_status, invitation_sent_at, invitation_cancelled_at,
  first_login_at, last_login_at, account_activated_at,
  account_deactivated_at, account_suspended_at, created_by,
  updated_at, date_of_joining, employment_type_id, invited_role_id,
  department_id, branch_id, designation_id, reporting_manager_id, deleted_at,
  departments:department_id ( name ),
  branches:branch_id ( name ),
  designations:designation_id ( title ),
  employment_types:employment_type_id ( name ),
  manager:reporting_manager_id ( first_name, last_name )
`;

const PENDING_ACCOUNT_STATUSES = new Set([
  "invitation_pending",
  "draft",
  "invited",
  "invitation_accepted",
]);

function isPendingProvisioningAccount(status: string | null | undefined) {
  return PENDING_ACCOUNT_STATUSES.has(String(status ?? ""));
}

async function loadRolesById(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  roleIds: string[],
): Promise<Map<string, LooseRow>> {
  const uniqueIds = [...new Set(roleIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await admin
    .schema("hrms")
    .from("roles")
    .select("id, code, name, portal_key")
    .eq("organization_id", organizationId)
    .in("id", uniqueIds);

  if (error) throw new Error(error.message);

  return new Map(
    ((data ?? []) as LooseRow[]).map((role) => [String(role.id), role]),
  );
}

async function loadEmployeeRolesFromUserRoles(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  employeeIds: string[],
): Promise<Map<string, LooseRow>> {
  const uniqueIds = [...new Set(employeeIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await admin
    .schema("hrms")
    .from("user_roles")
    .select("employee_id, roles:role_id ( code, name, portal_key )")
    .eq("organization_id", organizationId)
    .in("employee_id", uniqueIds)
    .eq("status", "active")
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const byEmployee = new Map<string, LooseRow>();
  for (const row of (data ?? []) as LooseRow[]) {
    const employeeId = row.employee_id ? String(row.employee_id) : null;
    const role = unwrapRelation<LooseRow>(row.roles);
    if (!employeeId || !role?.code) continue;

    const roleCode = String(role.code);
    const existing = byEmployee.get(employeeId);
    if (existing && rolePriority(String(existing.code)) <= rolePriority(roleCode)) {
      continue;
    }
    byEmployee.set(employeeId, role);
  }

  return byEmployee;
}

function resolveEmployeeRole(
  employee: LooseRow,
  rolesById: Map<string, LooseRow>,
  rolesByEmployeeId: Map<string, LooseRow>,
  rolesByInvitation: Map<string, LooseRow>,
): LooseRow {
  const joinedRole = unwrapRelation<LooseRow>(employee.invited_role);
  if (joinedRole?.code) return joinedRole;

  const invitedRoleId = employee.invited_role_id ? String(employee.invited_role_id) : null;
  if (invitedRoleId && rolesById.has(invitedRoleId)) {
    return rolesById.get(invitedRoleId)!;
  }

  const fromUserRole = rolesByEmployeeId.get(String(employee.id));
  if (fromUserRole?.code) return fromUserRole;

  const fromInvitation = rolesByInvitation.get(String(employee.id));
  if (fromInvitation?.code) return fromInvitation;

  // Always keep pending/draft invites visible even if role metadata was cleared.
  return {
    code: "employee",
    name: ROLE_LABELS.employee,
    portal_key: "employee",
  };
}

async function loadRolesFromInvitations(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  employeeIds: string[],
): Promise<Map<string, LooseRow>> {
  const uniqueIds = [...new Set(employeeIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await admin
    .schema("hrms")
    .from("employee_invitations")
    .select("employee_id, created_at, roles:role_id ( code, name, portal_key )")
    .eq("organization_id", organizationId)
    .in("employee_id", uniqueIds)
    .order("created_at", { ascending: false });

  if (error) {
    // Table may be unavailable in some environments; fall back gracefully.
    return new Map();
  }

  const byEmployee = new Map<string, LooseRow>();
  for (const row of (data ?? []) as LooseRow[]) {
    const employeeId = row.employee_id ? String(row.employee_id) : null;
    if (!employeeId || byEmployee.has(employeeId)) continue;
    const role = unwrapRelation<LooseRow>(row.roles);
    if (!role?.code) continue;
    byEmployee.set(employeeId, role);
  }

  return byEmployee;
}

/**
 * Loads every executive user (one row per employee, keeping the
 * highest-privilege role) scoped to the CEO's organization.
 */
async function loadExecutiveUsers(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<NormalizedExecutiveUser[]> {
  const organizationId = profile.employee.organizationId;
  const directoryRoleCodes = await loadExecutiveDirectoryRoleCodes(supabase, organizationId);
  const admin = createAdminClient();

  const { data, error } = await admin
    .schema("hrms")
    .from("user_roles")
    .select(
      `
      user_id,
      roles:role_id ( code, name, portal_key ),
      employee:employee_id (
        id, user_id, employee_code, first_name, last_name, email,
        account_status, invitation_sent_at, invitation_cancelled_at,
        first_login_at, last_login_at, account_activated_at,
        account_deactivated_at, account_suspended_at, created_by,
        updated_at, date_of_joining, employment_type_id, invited_role_id,
        department_id, branch_id, designation_id, reporting_manager_id, deleted_at,
        departments:department_id ( name ),
        branches:branch_id ( name ),
        designations:designation_id ( title ),
        employment_types:employment_type_id ( name ),
        manager:reporting_manager_id ( first_name, last_name )
      )
    `,
    )
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const byEmployee = new Map<string, NormalizedExecutiveUser>();
  const createdByIds = new Set<string>();

  for (const row of (data ?? []) as LooseRow[]) {
    const role = unwrapRelation<LooseRow>(row.roles);
    const employee = unwrapRelation<LooseRow>(row.employee);
    if (!role || !employee || employee.deleted_at) continue;

    const roleCode = String(role.code);
    if (!directoryRoleCodes.has(roleCode.toLowerCase())) continue;

    const existing = byEmployee.get(employee.id);
    if (existing && rolePriority(existing.roleCode) <= rolePriority(roleCode)) {
      continue;
    }

    if (employee.created_by) createdByIds.add(String(employee.created_by));

    byEmployee.set(employee.id, buildProvisioningUserRow(employee, role, profile));
  }

  const { data: pendingEmployees, error: pendingError } = await admin
    .schema("hrms")
    .from("employees")
    .select(
      `
      ${EMPLOYEE_SELECT_FIELDS},
      invited_role:invited_role_id ( code, name, portal_key )
    `,
    )
    .eq("organization_id", organizationId)
    .in("account_status", [...PENDING_ACCOUNT_STATUSES])
    .is("deleted_at", null);

  if (pendingError) throw new Error(pendingError.message);

  const pendingRows = (pendingEmployees ?? []) as LooseRow[];
  const missingEmployees = pendingRows.filter(
    (employee) => !employee.deleted_at && !byEmployee.has(employee.id),
  );
  const missingRoleEmployeeIds = missingEmployees.map((employee) => String(employee.id));

  const [rolesById, rolesByEmployeeId, rolesByInvitation] = await Promise.all([
    loadRolesById(
      admin,
      organizationId,
      pendingRows
        .map((employee) => (employee.invited_role_id ? String(employee.invited_role_id) : null))
        .filter((value): value is string => Boolean(value)),
    ),
    loadEmployeeRolesFromUserRoles(admin, organizationId, missingRoleEmployeeIds),
    loadRolesFromInvitations(admin, organizationId, missingRoleEmployeeIds),
  ]);

  for (const employee of missingEmployees) {
    const role = resolveEmployeeRole(
      employee,
      rolesById,
      rolesByEmployeeId,
      rolesByInvitation,
    );
    const roleCode = String(role.code).toLowerCase();
    // Keep invite records visible even when role metadata was cleared after cancel.
    if (
      !directoryRoleCodes.has(roleCode) &&
      !isPendingProvisioningAccount(employee.account_status)
    ) {
      continue;
    }

    if (employee.created_by) createdByIds.add(String(employee.created_by));
    byEmployee.set(employee.id, buildProvisioningUserRow(employee, role, profile));
  }

  // Resolve "Sent by" display names from created_by auth user ids.
  if (createdByIds.size > 0) {
    const { data: inviters, error: invitersError } = await admin
      .schema("hrms")
      .from("employees")
      .select("user_id, first_name, last_name")
      .eq("organization_id", organizationId)
      .in("user_id", [...createdByIds])
      .is("deleted_at", null);

    if (invitersError) throw new Error(invitersError.message);

    const inviterMap = new Map<string, string>();
    for (const inviter of (inviters ?? []) as LooseRow[]) {
      if (inviter.user_id) {
        inviterMap.set(
          String(inviter.user_id),
          fullName(inviter.first_name, inviter.last_name),
        );
      }
    }

    // created_by is not selected onto the normalized row, so re-read from source.
    for (const row of (data ?? []) as LooseRow[]) {
      const employee = unwrapRelation<LooseRow>(row.employee);
      if (!employee || !employee.created_by) continue;
      const target = byEmployee.get(employee.id);
      if (target && !target.sentByName) {
        target.sentByName = inviterMap.get(String(employee.created_by)) ?? null;
      }
    }

    for (const employee of pendingRows) {
      if (!employee.created_by) continue;
      const target = byEmployee.get(employee.id);
      if (target && !target.sentByName) {
        target.sentByName = inviterMap.get(String(employee.created_by)) ?? null;
      }
    }
  }

  return [...byEmployee.values()].sort((a, b) => {
    const aPending = isPendingProvisioningAccount(a.accountStatus) ? 0 : 1;
    const bPending = isPendingProvisioningAccount(b.accountStatus) ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;
    return a.fullName.localeCompare(b.fullName);
  });
}

export function summarizeExecutiveUsers(
  users: NormalizedExecutiveUser[],
): CeoProvisioningSummary {
  const isActive = (user: NormalizedExecutiveUser) => user.accountStatus === "active";
  const isDeactivated = (user: NormalizedExecutiveUser) =>
    user.accountStatus === "inactive" ||
    user.accountStatus === "suspended" ||
    user.invitationStatus === "revoked" ||
    user.invitationStatus === "inactive";

  return {
    executiveUsers: users.filter(
      (user) =>
        isActive(user) &&
        ["ceo", "co_founder", "founder"].includes(user.roleCode.toLowerCase()),
    ).length,
    hrUsers: users.filter(
      (user) =>
        isActive(user) &&
        ["hr_admin", "hr_executive"].includes(user.roleCode.toLowerCase()),
    ).length,
    managers: users.filter(
      (user) => isActive(user) && user.roleCode.toLowerCase() === "manager",
    ).length,
    employees: users.filter(
      (user) => isActive(user) && user.roleCode.toLowerCase() === "employee",
    ).length,
    deactivatedUsers: users.filter(isDeactivated).length,
  };
}

function paginateUsers(
  users: NormalizedExecutiveUser[],
  params: CeoProvisioningListParams,
): CeoProvisioningListResult {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.pageSize ?? 10);
  const search = params.search?.trim().toLowerCase();

  let filtered = users;
  if (search) {
    filtered = filtered.filter((u) =>
      [
        u.fullName,
        u.email,
        u.employeeCode,
        u.departmentName ?? "",
        u.roleLabel,
        u.invitationStatus,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }
  if (params.roleCode) {
    filtered = filtered.filter((u) => u.roleCode === params.roleCode);
  }
  if (params.portalKey) {
    filtered = filtered.filter((u) => u.portalKey === params.portalKey);
  }
  if (params.employmentTypeId) {
    filtered = filtered.filter((u) => u.employmentTypeId === params.employmentTypeId);
  }
  if (params.invitationStatus) {
    filtered = filtered.filter((u) => u.invitationStatus === params.invitationStatus);
  }
  // department/branch filters operate on names via lookups on the client side,
  // but here we accept ids resolved against the employee row is not available,
  // so filtering by department/branch is handled through name matching upstream.

  const total = filtered.length;
  const from = (page - 1) * pageSize;
  const data = filtered.slice(from, from + pageSize).map(stripInternal);

  return { data, total, page, pageSize };
}

function stripInternal(user: NormalizedExecutiveUser): CeoProvisioningUser {
  const {
    employmentTypeId: _employmentTypeId,
    employmentTypeName: _employmentTypeName,
    joiningDate: _joiningDate,
    firstLoginAt: _firstLoginAt,
    invitationCancelledAt: _invitationCancelledAt,
    ...rest
  } = user;
  void _employmentTypeId;
  void _employmentTypeName;
  void _joiningDate;
  void _firstLoginAt;
  void _invitationCancelledAt;
  return rest;
}

export async function getCeoProvisioningSummary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<CeoProvisioningSummary> {
  const users = await loadExecutiveUsers(supabase, profile);
  return summarizeExecutiveUsers(users);
}

export async function listCeoProvisioningUsers(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: CeoProvisioningListParams,
): Promise<CeoProvisioningListResult> {
  let users = await loadExecutiveUsers(supabase, profile);

  if (params.departmentId || params.branchId) {
    const lookups = await getCeoProvisioningLookups(supabase, profile);
    const deptName = params.departmentId
      ? lookups.departments.find((d) => d.id === params.departmentId)?.label ?? null
      : null;
    const branchName = params.branchId
      ? lookups.branches.find((b) => b.id === params.branchId)?.label ?? null
      : null;
    if (deptName) users = users.filter((u) => u.departmentName === deptName);
    if (branchName) users = users.filter((u) => u.branchName === branchName);
  }

  return paginateUsers(users, params);
}

export async function getCeoProvisioningLookups(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<CeoProvisioningLookups> {
  const organizationId = profile.employee.organizationId;

  const [
    inviteRoles,
    departmentsRes,
    branchesRes,
    employmentTypesRes,
    managersRes,
  ] = await Promise.all([
      loadUserProvisioningInviteRoles(supabase, organizationId),
      fromHrms(supabase, "departments")
        .select("id, name")
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .order("name"),
      fromHrms(supabase, "branches")
        .select("id, name")
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .order("name"),
      fromHrms(supabase, "employment_types")
        .select("id, name")
        .eq("organization_id", organizationId)
        .is("deleted_at", null)
        .order("name"),
      fromHrms(supabase, "user_roles")
        .select(
          `
          roles:role_id ( code ),
          employee:employee_id (
            id, first_name, last_name, employee_code, employment_status, deleted_at
          )
        `,
        )
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .is("deleted_at", null),
    ]);

  for (const res of [departmentsRes, branchesRes, employmentTypesRes, managersRes]) {
    if (res.error) throw new Error(res.error.message);
  }

  const directoryRoleCodes = await loadExecutiveDirectoryRoleCodes(supabase, organizationId);

  const managersMap = new Map<string, LookupOption>();
  for (const row of (managersRes.data ?? []) as LooseRow[]) {
    const role = unwrapRelation<LooseRow>(row.roles);
    const employee = unwrapRelation<LooseRow>(row.employee);
    if (!role || !employee || employee.deleted_at) continue;
    if (!directoryRoleCodes.has(String(role.code).toLowerCase())) continue;
    if (String(employee.employment_status ?? "") === "draft") continue;
    if (managersMap.has(employee.id)) continue;
    managersMap.set(employee.id, {
      id: employee.id,
      label: `${fullName(employee.first_name, employee.last_name)} · ${employee.employee_code}`,
    });
  }
  const managers = [...managersMap.values()].sort((a, b) =>
    a.label.localeCompare(b.label),
  );

  const portalOptions: LookupOption[] = [
    { id: "ceo", label: "Executive Portal" },
    { id: "hr", label: "HR Portal" },
    { id: "manager", label: "Manager Portal" },
    { id: "employee", label: "Self-Service Portal" },
  ];

  const statusOptions: LookupOption[] = [
    { id: "pending", label: "Pending" },
    { id: "accepted", label: "Accepted" },
    { id: "expired", label: "Expired" },
    { id: "cancelled", label: "Cancelled" },
    { id: "revoked", label: "Suspended" },
    { id: "inactive", label: "Inactive" },
  ];

  return {
    roles: inviteRoles.map((role) => ({
      id: role.code,
      code: role.code,
      name: role.name,
      description: role.description,
      portalKey: role.portalKey,
      portalLabel: role.portalLabel,
      departmentLabel: role.departmentLabel,
    })),
    departments: ((departmentsRes.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: row.name,
    })),
    branches: ((branchesRes.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: row.name,
    })),
    employmentTypes: ((employmentTypesRes.data ?? []) as LooseRow[]).map((row) => ({
      id: row.id,
      label: row.name,
    })),
    managers,
    portals: portalOptions,
    statuses: statusOptions,
  };
}

async function getRolePermissionCodes(
  supabase: AuthSupabaseClient,
  organizationId: string,
  roleCode: string,
): Promise<string[]> {
  const { data: role } = await fromHrms(supabase, "roles")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("code", roleCode)
    .is("deleted_at", null)
    .maybeSingle();

  if (!role?.id) return [];

  const { data: rolePerms } = await fromHrms(supabase, "role_permissions")
    .select("permissions:permission_id ( code )")
    .eq("role_id", role.id)
    .eq("status", "active")
    .is("deleted_at", null);

  const codes = ((rolePerms ?? []) as LooseRow[])
    .map((row) => unwrapRelation<LooseRow>(row.permissions)?.code)
    .filter((code): code is string => Boolean(code));

  return [...new Set(codes)].sort();
}

function buildTimeline(user: NormalizedExecutiveUser): CeoProvisioningTimelineEntry[] {
  const entries: CeoProvisioningTimelineEntry[] = [];
  if (user.invitationSentAt)
    entries.push({ label: "Invitation sent", timestamp: user.invitationSentAt });
  if (user.invitationCancelledAt)
    entries.push({ label: "Invitation cancelled", timestamp: user.invitationCancelledAt });
  if (user.firstLoginAt)
    entries.push({ label: "First login", timestamp: user.firstLoginAt });
  if (user.acceptedAt)
    entries.push({ label: "Account activated", timestamp: user.acceptedAt });
  if (user.lastActivityAt)
    entries.push({ label: "Last activity", timestamp: user.lastActivityAt });

  return entries
    .filter((entry, index, all) => all.findIndex((e) => e.label === entry.label) === index)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export async function getCeoProvisioningUserDetail(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
): Promise<CeoProvisioningUserDetail | null> {
  const users = await loadExecutiveUsers(supabase, profile);
  const user = users.find((u) => u.employeeId === employeeId);
  if (!user) return null;

  const permissions = await getRolePermissionCodes(
    supabase,
    profile.employee.organizationId,
    user.roleCode,
  );

  return {
    user: stripInternal(user),
    employmentTypeName: user.employmentTypeName,
    joiningDate: user.joiningDate,
    firstLoginAt: user.firstLoginAt,
    invitationCancelledAt: user.invitationCancelledAt,
    timeline: buildTimeline(user),
    permissions,
  };
}
