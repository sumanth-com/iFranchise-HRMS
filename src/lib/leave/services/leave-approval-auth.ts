/** Pure leave-approval authorization helpers — safe for unit tests (no admin client). */

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { hasPermission } from "@/lib/permissions/utils";
import type { UserProfile } from "@/types/auth";

export const CEO_LEAVE_APPROVER_ROLE_CODES = [
  "ceo",
  "founder",
  "co_founder",
] as const;

export const HR_LEAVE_APPROVER_ROLE_CODES = [
  "hr_admin",
  "hr_executive",
] as const;

export function isCeoLeaveApprover(profile: UserProfile): boolean {
  return (
    profile.roles.some((role) =>
      (CEO_LEAVE_APPROVER_ROLE_CODES as readonly string[]).includes(role.code),
    ) || hasPermission(profile.permissionCodes, PORTAL_PERMISSIONS.ceo)
  );
}

export function isHrLeaveActor(profile: UserProfile): boolean {
  return (
    profile.roles.some((role) =>
      (HR_LEAVE_APPROVER_ROLE_CODES as readonly string[]).includes(role.code),
    ) || profile.roles.some((role) => role.code === "super_admin")
  );
}

/**
 * Employee leave: assigned Manager, HR, or CEO may approve; the first accept
 * finalizes the request. HR / manager leave: CEO only.
 */
export function canActorDecideLeaveRequest(input: {
  profile: UserProfile;
  applicantEmployeeId: string;
  leaveStatus: string;
  pendingLevel: number | null;
  pendingApproverEmployeeId?: string | null;
  executiveApplicant: boolean;
}): boolean {
  if (input.leaveStatus !== "pending" || input.pendingLevel == null) {
    return false;
  }
  if (input.applicantEmployeeId === input.profile.employee.id) {
    return false;
  }

  const assignedToActor =
    Boolean(input.pendingApproverEmployeeId) &&
    input.pendingApproverEmployeeId === input.profile.employee.id;

  if (input.executiveApplicant) {
    return isCeoLeaveApprover(input.profile);
  }

  if (isCeoLeaveApprover(input.profile)) {
    return true;
  }

  // Assigned reporting manager / HR step owner (email token or portal).
  if (assignedToActor) {
    return true;
  }

  return input.pendingLevel === 1 && isHrLeaveActor(input.profile);
}
