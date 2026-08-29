import type { CeoProvisioningUser } from "@/types/ceo-user-provisioning";

/** True when the person already has a usable portal login. */
function hasPortalAccess(user: CeoProvisioningUser) {
  return Boolean(user.userId) && (
    user.invitationStatus === "accepted" ||
    user.accountStatus === "active"
  );
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
    // Existing employee record with no portal user yet
    (user.accountStatus === "active" && !user.userId) ||
    user.invitationStatus === "pending" ||
    user.invitationStatus === "expired"
  );
}

export function canResendProvisioningInvitation(user: CeoProvisioningUser) {
  return isPendingPortalInviteTarget(user);
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
