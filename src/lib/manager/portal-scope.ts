import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getManagerRecruitmentContext } from "@/lib/manager/services/manager-recruitment-context";
import {
  assertTeamMember,
  getManagerTeamScope,
} from "@/lib/manager/services/team-queries";
import { hasPermission } from "@/lib/permissions/utils";
import type { UserProfile } from "@/types/auth";

export function hasHrPortalAccess(profile: UserProfile) {
  return hasPermission(profile.permissionCodes, PORTAL_PERMISSIONS.hr);
}

export function hasManagerPortalAccess(profile: UserProfile) {
  return hasPermission(profile.permissionCodes, PORTAL_PERMISSIONS.manager);
}

/** Manager portal without HR — data must stay in the reporting hierarchy. */
export function isManagerOnlyProfile(profile: UserProfile) {
  return hasManagerPortalAccess(profile) && !hasHrPortalAccess(profile);
}

export function managerOrPermissions(...codes: string[]) {
  return [...codes, PORTAL_PERMISSIONS.manager];
}

export async function resolveTeamEmployeeIds(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<string[] | null> {
  if (!isManagerOnlyProfile(profile)) return null;
  const { teamIds } = await getManagerTeamScope(supabase, profile);
  return teamIds;
}

export async function resolveManagerDepartmentIds(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<string[] | null> {
  if (!isManagerOnlyProfile(profile)) return null;
  const context = await getManagerRecruitmentContext(supabase, profile);
  return context.departmentIds;
}

export async function assertManagerTeamEmployee(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string | null | undefined,
) {
  if (!employeeId || !isManagerOnlyProfile(profile)) return;
  const teamIds = await resolveTeamEmployeeIds(supabase, profile);
  assertTeamMember(teamIds ?? [], employeeId);
}

export function emptyPagedResult<T>(page: number, pageSize: number) {
  return { data: [] as T[], total: 0, page, pageSize };
}

export function scopedEmployeeIds(
  teamIds: string[] | null,
  employeeId?: string,
): string[] | null {
  if (!teamIds) return null;
  if (employeeId) {
    return teamIds.includes(employeeId) ? [employeeId] : [];
  }
  return teamIds;
}
