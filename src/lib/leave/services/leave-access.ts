import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { assertTeamMember, getManagerTeamScope } from "@/lib/manager/services/team-queries";
import { hasAnyPermission, hasRole } from "@/lib/permissions/utils";
import type { UserProfile } from "@/types/auth";

/**
 * Who may create/view apply context for a given employeeId.
 * Self always; HR (employee.edit / leave.manage / portal.hr); managers for team only.
 */
export async function assertCanApplyLeaveForEmployee(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  targetEmployeeId: string,
): Promise<void> {
  if (profile.employee.id === targetEmployeeId) return;

  const canActAsHr = hasAnyPermission(profile.permissionCodes, [
    "employee.edit",
    "leave.manage",
    PORTAL_PERMISSIONS.hr,
  ]);
  if (canActAsHr) return;

  if (hasRole(profile.roles, "manager")) {
    const { teamIds } = await getManagerTeamScope(supabase, profile);
    assertTeamMember(teamIds, targetEmployeeId);
    return;
  }

  throw new Error("You can only apply leave for yourself.");
}
