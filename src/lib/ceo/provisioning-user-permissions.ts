import { provisioningContactFieldVisibility } from "@/lib/ceo/provisioning-contact-fields";
import type { CeoProvisioningUser } from "@/types/ceo-user-provisioning";

/** True when the person has activated portal access. */
function hasPortalAccess(user: CeoProvisioningUser) {
  return user.invitationStatus === "active";
}

function isActiveProvisioningUser(user: CeoProvisioningUser) {
  return hasPortalAccess(user);
}

/** Pending invite shells, or existing HR employees still waiting for portal access. */
function isPendingPortalInviteTarget(user: CeoProvisioningUser) {
  if (user.isSelf) return false;
  if (isActiveProvisioningUser(user)) return false;
  if (user.invitationStatus === "cancelled") return false;

  return (
    user.accountStatus === "invitation_pending" ||
    user.accountStatus === "draft" ||
    user.accountStatus === "invited" ||
    user.accountStatus === "invitation_accepted" ||
    (user.accountStatus === "active" && !user.userId) ||
    user.invitationStatus === "pending" ||
    user.invitationStatus === "opened" ||
    user.invitationStatus === "expired"
  );
}

export function canSendProvisioningInvitation(user: CeoProvisioningUser) {
  return isPendingPortalInviteTarget(user) && !user.invitationSentAt;
}

export function canResendProvisioningInvitation(user: CeoProvisioningUser) {
  if (!isPendingPortalInviteTarget(user)) return false;
  if (!user.invitationSentAt) return false;
  return (
    user.invitationStatus === "pending" ||
    user.invitationStatus === "opened" ||
    user.invitationStatus === "expired"
  );
}

export function canCancelProvisioningInvitation(user: CeoProvisioningUser) {
  return user.accountStatus === "invitation_pending";
}

export function canEditPendingProvisioningUser(user: CeoProvisioningUser) {
  return isPendingPortalInviteTarget(user);
}

export function canChangePendingProvisioningRole(user: CeoProvisioningUser) {
  return canEditPendingProvisioningUser(user);
}

export function canChangeProvisioningReportingContacts(user: CeoProvisioningUser) {
  if (user.isSelf) return false;
  const { showReportingManager, showAssignedHr } = provisioningContactFieldVisibility(user);
  return showReportingManager || showAssignedHr;
}
