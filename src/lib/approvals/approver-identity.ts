import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { loadUserProfile } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";

export type ApproverIdentity = {
  employeeId: string;
  userId: string;
  email: string;
  name: string;
  /** Highest-priority role code, used for portal routing of "View Details". */
  roleCode: string;
  profile: UserProfile;
};

/** Ordered by portal precedence so routing picks the most privileged portal. */
const ROLE_ROUTING_PRIORITY = [
  "super_admin",
  "ceo",
  "founder",
  "co_founder",
  "hr_admin",
  "hr_executive",
  "manager",
  "employee",
] as const;

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Resolves an approver employee into a full authenticated-equivalent profile
 * (built with the service-role client) plus routing metadata. Returns null if
 * the employee has no login account or profile cannot be loaded.
 */
export async function loadApproverIdentity(
  admin: AuthSupabaseClient,
  employeeId: string,
): Promise<ApproverIdentity | null> {
  const { data: employee } = await admin
    .schema("hrms")
    .from("employees")
    .select("id, user_id, email, first_name, last_name")
    .eq("id", employeeId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!employee?.user_id || !employee.email) return null;

  const { data: roleRows } = await admin
    .schema("hrms")
    .from("user_roles")
    .select("roles:role_id (code)")
    .eq("user_id", employee.user_id)
    .eq("status", "active")
    .is("deleted_at", null);

  const codes = (roleRows ?? [])
    .map((row) => unwrap(row.roles as { code: string } | { code: string }[] | null)?.code)
    .filter((code): code is string => Boolean(code));

  const roleCode =
    ROLE_ROUTING_PRIORITY.find((code) => codes.includes(code)) ?? codes[0] ?? "employee";

  const result = await loadUserProfile(employee.user_id, employee.email, admin);
  if (!result.success) return null;

  return {
    employeeId: employee.id,
    userId: employee.user_id,
    email: employee.email,
    name: `${employee.first_name} ${employee.last_name}`.trim(),
    roleCode,
    profile: result.profile,
  };
}
