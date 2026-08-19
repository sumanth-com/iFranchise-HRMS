import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getInviteableRoleByCode } from "@/lib/auth/iam-roles";
import type { PortalKey } from "@/lib/auth/portals";
import { fromHrms } from "@/lib/reports/services/reports-utils";
import { hasSupabaseServiceRoleEnv } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";

export type ProvisionableRole = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  portalKey: PortalKey | null;
  portalLabel: string;
  departmentLabel: string;
};

const PORTAL_LABELS: Record<PortalKey, string> = {
  hr: "HR Portal",
  ceo: "Executive Portal",
  manager: "Manager Portal",
  employee: "Self-Service Portal",
};

const PORTAL_DEPARTMENT_HINTS: Record<PortalKey, string> = {
  hr: "Human Resources",
  ceo: "Executive Leadership",
  manager: "Operations",
  employee: "Workforce",
};

function normalizePortalKey(value: string | null | undefined): PortalKey | null {
  if (value === "hr" || value === "ceo" || value === "manager" || value === "employee") {
    return value;
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RoleRow = Record<string, any>;

/** Roles that may be selected when inviting from User Provisioning. */
export const USER_PROVISIONING_INVITE_ROLE_CODES = [
  "ceo",
  "co_founder",
  "hr_admin",
  "manager",
  "employee",
] as const;

/** Roles shown in the provisioning directory (includes legacy executive roles). */
export const PROVISIONING_DIRECTORY_ROLE_CODES = [
  ...USER_PROVISIONING_INVITE_ROLE_CODES,
  "founder",
  "hr_executive",
] as const;

/** @deprecated Use USER_PROVISIONING_INVITE_ROLE_CODES or PROVISIONING_DIRECTORY_ROLE_CODES. */
export const PROVISIONABLE_ROLE_CODES = PROVISIONING_DIRECTORY_ROLE_CODES;

const INVITE_ROLE_CODE_SET = new Set<string>(USER_PROVISIONING_INVITE_ROLE_CODES);
const DIRECTORY_ROLE_CODE_SET = new Set<string>(PROVISIONING_DIRECTORY_ROLE_CODES);

const INVITE_ROLE_DISPLAY_NAMES: Record<string, string> = {
  co_founder: "Cofounder",
  employee: "Employee",
};

const INVITE_ROLE_SORT_ORDER: Record<string, number> = {
  ceo: 0,
  co_founder: 1,
  hr_admin: 2,
  manager: 3,
  employee: 4,
};

export function isUserProvisioningInviteRoleCode(code: string): boolean {
  return INVITE_ROLE_CODE_SET.has(code.trim().toLowerCase());
}

export function isProvisionableRoleCode(code: string): boolean {
  return DIRECTORY_ROLE_CODE_SET.has(code.trim().toLowerCase());
}

function mapRoleRow(row: RoleRow): ProvisionableRole {
  const code = String(row.code);
  const portalKey =
    normalizePortalKey(row.portal_key) ?? derivePortalFromRoleCode(code);
  const portalLabel = portalKey ? PORTAL_LABELS[portalKey] : "—";
  const departmentLabel = portalKey ? PORTAL_DEPARTMENT_HINTS[portalKey] : "—";

  return {
    id: String(row.id),
    code,
    name: INVITE_ROLE_DISPLAY_NAMES[code.toLowerCase()] ?? String(row.name),
    description: row.description ? String(row.description) : null,
    portalKey,
    portalLabel,
    departmentLabel,
  };
}

function sortInviteRoles(roles: ProvisionableRole[]): ProvisionableRole[] {
  return [...roles].sort((a, b) => {
    const rankA = INVITE_ROLE_SORT_ORDER[a.code.toLowerCase()] ?? 99;
    const rankB = INVITE_ROLE_SORT_ORDER[b.code.toLowerCase()] ?? 99;
    if (rankA !== rankB) return rankA - rankB;
    return a.name.localeCompare(b.name);
  });
}

async function loadOrganizationRoles(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<RoleRow[]> {
  const { data, error } = await fromHrms(supabase, "roles")
    .select("id, code, name, description, portal_key, is_provisionable, status")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []) as RoleRow[];
}

async function fetchInviteRoleRow(
  supabase: AuthSupabaseClient,
  organizationId: string,
  code: string,
): Promise<RoleRow | null> {
  const { data, error } = await fromHrms(supabase, "roles")
    .select("id, code, name, description, portal_key, is_provisionable, status")
    .eq("organization_id", organizationId)
    .eq("code", code)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (!error && data) return data as RoleRow;

  if (!hasSupabaseServiceRoleEnv()) return null;

  const admin = createAdminClient();
  const { data: adminData, error: adminError } = await admin
    .schema("hrms")
    .from("roles")
    .select(
      "id, code, name, description, portal_key, portal_route, is_provisionable, is_inviteable, status, deleted_at",
    )
    .eq("organization_id", organizationId)
    .eq("code", code)
    .maybeSingle();

  if (adminError || !adminData) return null;

  // Recover archived / soft-deleted system roles (e.g. employee) for provisioning.
  if (adminData.deleted_at != null || adminData.status !== "active") {
    const recoveryPatch: Record<string, unknown> = {
      status: "active",
      deleted_at: null,
      is_inviteable: true,
      updated_at: new Date().toISOString(),
    };
    if (code === "employee") {
      recoveryPatch.is_provisionable = true;
      recoveryPatch.portal_key = "employee";
      recoveryPatch.portal_route = "/employee";
    }

    await admin.schema("hrms").from("roles").update(recoveryPatch).eq("id", adminData.id);

    return {
      ...adminData,
      status: "active",
      deleted_at: null,
      portal_key: code === "employee" ? "employee" : adminData.portal_key,
    } as RoleRow;
  }

  return adminData as RoleRow;
}

async function resolveInviteRole(
  supabase: AuthSupabaseClient,
  organizationId: string,
  code: string,
): Promise<ProvisionableRole | null> {
  const row = await fetchInviteRoleRow(supabase, organizationId, code);
  if (row) return mapRoleRow(row);

  if (!hasSupabaseServiceRoleEnv()) return null;

  try {
    const inviteRole = await getInviteableRoleByCode(
      createAdminClient(),
      organizationId,
      code,
    );
    const portalKey =
      inviteRole.portalKey ?? derivePortalFromRoleCode(code);
    return {
      id: inviteRole.id,
      code: inviteRole.code,
      name: INVITE_ROLE_DISPLAY_NAMES[code] ?? inviteRole.name,
      description:
        code === "employee" ? "Employee self-service portal access" : null,
      portalKey,
      portalLabel: portalKey ? PORTAL_LABELS[portalKey] : inviteRole.portalLabel,
      departmentLabel: portalKey ? PORTAL_DEPARTMENT_HINTS[portalKey] : "—",
    };
  } catch {
    return null;
  }
}

/**
 * Loads the fixed invite role list for User Provisioning (CEO, Cofounder, HR Admin, Manager, Employee).
 */
export async function loadUserProvisioningInviteRoles(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<ProvisionableRole[]> {
  const roles: ProvisionableRole[] = [];

  for (const code of USER_PROVISIONING_INVITE_ROLE_CODES) {
    const role = await resolveInviteRole(supabase, organizationId, code);
    if (role) roles.push(role);
  }

  return sortInviteRoles(roles);
}

/**
 * Loads active provisionable roles for the User Provisioning module.
 */
export async function loadProvisionableRoles(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<ProvisionableRole[]> {
  const rows = await loadOrganizationRoles(supabase, organizationId);

  return rows
    .filter((row) => isProvisionableRoleCode(String(row.code ?? "")))
    .map(mapRoleRow)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function derivePortalFromRoleCode(code: string): PortalKey | null {
  switch (code.toLowerCase()) {
    case "founder":
    case "co_founder":
    case "ceo":
      return "ceo";
    case "hr_admin":
    case "hr_executive":
    case "super_admin":
      return "hr";
    case "manager":
      return "manager";
    case "employee":
      return "employee";
    default:
      return null;
  }
}

export async function assertProvisionableRole(
  supabase: AuthSupabaseClient,
  organizationId: string,
  roleCode: string,
): Promise<ProvisionableRole> {
  const normalized = roleCode.trim().toLowerCase();

  const roles = await loadUserProvisioningInviteRoles(supabase, organizationId);
  const match = roles.find((role) => role.code.toLowerCase() === normalized);
  if (!match) {
    throw new Error("Select a valid active role from Roles & Permissions.");
  }
  return match;
}

export async function loadProvisionableRoleCodes(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<Set<string>> {
  const roles = await loadProvisionableRoles(supabase, organizationId);
  return new Set(roles.map((role) => role.code.toLowerCase()));
}

export async function loadExecutiveDirectoryRoleCodes(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<Set<string>> {
  const codes = new Set<string>(PROVISIONING_DIRECTORY_ROLE_CODES);
  const provisionable = await loadProvisionableRoleCodes(supabase, organizationId);
  for (const code of provisionable) codes.add(code);
  codes.add("ceo");
  return codes;
}

export async function findProvisioningNotifierUserIds(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<Array<{ userId: string; employeeId: string | null }>> {
  const { data, error } = await fromHrms(supabase, "user_roles")
    .select("user_id, employee_id, roles:role_id ( code )")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const notifyRoleCodes = new Set(["ceo", "founder", "co_founder"]);
  const recipients = new Map<string, { userId: string; employeeId: string | null }>();

  for (const row of (data ?? []) as RoleRow[]) {
    const role = Array.isArray(row.roles) ? row.roles[0] : row.roles;
    const roleCode = String(role?.code ?? "").toLowerCase();
    if (!notifyRoleCodes.has(roleCode)) continue;
    if (!row.user_id) continue;
    recipients.set(String(row.user_id), {
      userId: String(row.user_id),
      employeeId: row.employee_id ? String(row.employee_id) : null,
    });
  }

  return [...recipients.values()];
}
