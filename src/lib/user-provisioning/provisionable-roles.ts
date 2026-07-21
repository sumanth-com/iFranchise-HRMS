import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { PortalKey } from "@/lib/auth/portals";
import { fromHrms } from "@/lib/reports/services/reports-utils";

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
  employee: "Employee Portal",
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

/**
 * Loads active provisionable roles for the User Provisioning module.
 * Never returns the employee role — employees are managed by HR only.
 */
export async function loadProvisionableRoles(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<ProvisionableRole[]> {
  const { data, error } = await fromHrms(supabase, "roles")
    .select("id, code, name, description, portal_key, is_provisionable, status")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .is("deleted_at", null)
    .order("name");

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as RoleRow[];

  return rows
    .filter((row) => {
      const code = String(row.code ?? "").toLowerCase();
      if (code === "employee") return false;
      if (row.is_provisionable === true) return true;
      // Fallback when migration has not been applied yet.
      return ["founder", "co_founder", "ceo", "hr_admin", "hr_executive", "manager"].includes(
        code,
      );
    })
    .map((row) => {
      const portalKey =
        normalizePortalKey(row.portal_key) ??
        derivePortalFromRoleCode(String(row.code));
      const portalLabel = portalKey ? PORTAL_LABELS[portalKey] : "—";
      const departmentLabel = portalKey ? PORTAL_DEPARTMENT_HINTS[portalKey] : "—";

      return {
        id: String(row.id),
        code: String(row.code),
        name: String(row.name),
        description: row.description ? String(row.description) : null,
        portalKey,
        portalLabel,
        departmentLabel,
      };
    })
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
  if (normalized === "employee") {
    throw new Error("Employees cannot be invited from User Provisioning. Contact HR.");
  }

  const roles = await loadProvisionableRoles(supabase, organizationId);
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
  const provisionable = await loadProvisionableRoleCodes(supabase, organizationId);
  // Include CEO even if not provisionable in some org configs.
  provisionable.add("ceo");
  return provisionable;
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
