import "server-only";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { isItSystemProvisioningAccount } from "@/lib/ceo/provisioning-directory-filters";
import type { UserProfile } from "@/types/auth";

/** Canonical Technology / IT department codes in seeded org data. */
const TECHNOLOGY_DEPARTMENT_CODES = new Set(["tech", "it"]);

/** Fallback name match when department code is customized. */
const TECHNOLOGY_DEPARTMENT_NAME_PATTERN =
  /^(technology|information technology|it|it team|tech)$/i;

/**
 * True for the IT Team system account (`it@ifranchise.in`).
 * Identity is email-based (same rule as provisioning filters) — not a hardcoded employee list.
 */
export function isItTeamAccount(profile: UserProfile): boolean {
  return (
    isItSystemProvisioningAccount(profile.employee.email) ||
    isItSystemProvisioningAccount(profile.email)
  );
}

/**
 * Resolve Technology/IT department IDs for an organization from live department rows.
 */
export async function resolveTechnologyDepartmentIds(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("departments")
    .select("id, code, name")
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((row) => {
      const code = String(row.code ?? "")
        .trim()
        .toLowerCase();
      const name = String(row.name ?? "").trim();
      if (code && TECHNOLOGY_DEPARTMENT_CODES.has(code)) return true;
      return TECHNOLOGY_DEPARTMENT_NAME_PATTERN.test(name);
    })
    .map((row) => row.id as string);
}

/**
 * Employee IDs belonging to the Technology/IT team for the IT account.
 * Returns `null` when the caller is not the IT Team account (no extra restriction).
 * Returns `[]` when IT is logged in but no Technology department/members exist.
 *
 * Excludes the IT system account itself (not a payroll team member).
 */
export async function resolveItTeamEmployeeScope(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<string[] | null> {
  if (!isItTeamAccount(profile)) return null;

  const organizationId = profile.employee.organizationId;
  const departmentIds = await resolveTechnologyDepartmentIds(supabase, organizationId);
  if (departmentIds.length === 0) return [];

  const { data, error } = await supabase
    .schema("hrms")
    .from("employees")
    .select("id, email")
    .eq("organization_id", organizationId)
    .in("department_id", departmentIds)
    .is("deleted_at", null)
    .is("app_hidden_at", null);

  if (error) throw new Error(error.message);

  const selfId = profile.employee.id;
  return (data ?? [])
    .filter((row) => {
      if (row.id === selfId) return false;
      if (isItSystemProvisioningAccount(row.email as string | null)) return false;
      return true;
    })
    .map((row) => row.id as string);
}

/** Throw when IT tries to access an employee outside Technology/IT. */
export async function assertItTeamEmployeeAccess(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string | null | undefined,
): Promise<void> {
  if (!employeeId || !isItTeamAccount(profile)) return;
  const scope = await resolveItTeamEmployeeScope(supabase, profile);
  if (!scope) return;
  if (!scope.includes(employeeId)) {
    throw new Error("You can only access Technology team employees.");
  }
}

export function filterIdsToScope(
  ids: string[],
  scope: string[] | null,
): string[] {
  if (!scope) return ids;
  const allowed = new Set(scope);
  return ids.filter((id) => allowed.has(id));
}
