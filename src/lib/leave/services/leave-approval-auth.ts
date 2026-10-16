/** Pure leave-approval authorization helpers — safe for unit tests (no admin client). */

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { isEmployeeAppVisible } from "@/lib/employees/app-hidden";
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
 * Active, portal-usable CEO leave assignees. App-hidden shells must not receive
 * pending executive leave steps — they cannot open CEO Approvals.
 */
export function isEligibleActiveCeoLeaveApproverEmployee(row: {
  status: string | null | undefined;
  employment_status: string | null | undefined;
  email?: string | null;
  app_hidden_at?: string | null;
  deleted_at?: string | null;
}): boolean {
  if (!isEmployeeAppVisible(row)) return false;
  if (row.status !== "active") return false;
  return ["active", "probation"].includes(row.employment_status ?? "");
}

/**
 * Manager Team Leave row actionability (first-wins).
 * Executive applicants (HR / Manager / super_admin) route to CEO steps — a
 * reporting manager may act only when they are also a CEO leave approver and
 * own a pending step. Blindly forcing `!executiveApplicant` hid assigned CEO
 * managers from their own queue.
 */
export function canManagerActOnTeamLeaveApproval(input: {
  profile: UserProfile;
  leaveStatus: string;
  executiveApplicant: boolean;
  hasOwnPendingStep: boolean;
}): boolean {
  if (input.leaveStatus !== "pending" || !input.hasOwnPendingStep) {
    return false;
  }
  if (!input.executiveApplicant) {
    return true;
  }
  return isCeoLeaveApprover(input.profile);
}

/**
 * Employee leave: assigned Manager, HR, or CEO may approve; the first accept
 * finalizes the request. Executive applicants (HR / Manager / super_admin):
 * CEO or HR may decide (first-wins); Manager Team Leave still scopes canAct
 * via canManagerActOnTeamLeaveApproval.
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
    // CEO-routed leave remains on CEO Approvals; HR may also first-wins decide
    // from Team Leave without a dedicated leave_approvals row.
    return isCeoLeaveApprover(input.profile) || isHrLeaveActor(input.profile);
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
