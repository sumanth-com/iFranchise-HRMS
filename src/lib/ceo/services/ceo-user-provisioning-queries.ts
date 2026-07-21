import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { fromHrms, unwrapRelation } from "@/lib/reports/services/reports-utils";
import {
  derivePortalFromRoleCode,
  loadExecutiveDirectoryRoleCodes,
  loadProvisionableRoles,
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

  const { data, error } = await fromHrms(supabase, "user_roles")
    .select(
      `
      user_id,
      roles:role_id ( code, name, portal_key ),
      employee:employee_id (
        id, user_id, employee_code, first_name, last_name, email,
        account_status, invitation_sent_at, invitation_cancelled_at,
        first_login_at, last_login_at, account_activated_at,
        account_deactivated_at, account_suspended_at, created_by,
        updated_at, date_of_joining, employment_type_id,
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

    const portalKey =
      normalizePortalKey(role.portal_key) ?? derivePortalFromRoleCode(roleCode);

    const existing = byEmployee.get(employee.id);
    if (existing && rolePriority(existing.roleCode) <= rolePriority(roleCode)) {
      continue;
    }

    const department = unwrapRelation<LooseRow>(employee.departments);
    const branch = unwrapRelation<LooseRow>(employee.branches);
    const designation = unwrapRelation<LooseRow>(employee.designations);
    const employmentType = unwrapRelation<LooseRow>(employee.employment_types);
    const manager = unwrapRelation<LooseRow>(employee.manager);

    if (employee.created_by) createdByIds.add(String(employee.created_by));

    byEmployee.set(employee.id, {
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
    });
  }

  // Resolve "Sent by" display names from created_by auth user ids.
  if (createdByIds.size > 0) {
    const { data: inviters } = await fromHrms(supabase, "employees")
      .select("user_id, first_name, last_name")
      .eq("organization_id", organizationId)
      .in("user_id", [...createdByIds])
      .is("deleted_at", null);

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
  }

  return [...byEmployee.values()].sort((a, b) =>
    a.fullName.localeCompare(b.fullName),
  );
}

export function summarizeExecutiveUsers(
  users: NormalizedExecutiveUser[],
): CeoProvisioningSummary {
  return {
    totalExecutiveUsers: users.length,
    pendingInvitations: users.filter((u) => u.invitationStatus === "pending").length,
    acceptedInvitations: users.filter((u) => u.invitationStatus === "accepted").length,
    expiredInvitations: users.filter((u) => u.invitationStatus === "expired").length,
    activeManagers: users.filter(
      (u) => u.roleCode === "manager" && u.accountStatus === "active",
    ).length,
    activeHrUsers: users.filter(
      (u) =>
        (u.roleCode === "hr_admin" || u.roleCode === "hr_executive") &&
        u.accountStatus === "active",
    ).length,
    coFounders: users.filter((u) => u.roleCode === "co_founder").length,
    founders: users.filter((u) => u.roleCode === "founder").length,
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

  const [provisionableRoles, departmentsRes, branchesRes, employmentTypesRes, managersRes] =
    await Promise.all([
      loadProvisionableRoles(supabase, organizationId),
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
    roles: provisionableRoles.map((role) => ({
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
