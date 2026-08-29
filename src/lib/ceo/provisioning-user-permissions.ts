import type { CeoProvisioningUser } from "@/types/ceo-user-provisioning";

function isActiveProvisioningUser(user: CeoProvisioningUser) {
  return user.invitationStatus === "accepted" || user.accountStatus === "active";
}

export function canResendProvisioningInvitation(user: CeoProvisioningUser) {
  if (user.isSelf || isActiveProvisioningUser(user)) return false;
  if (user.invitationStatus === "cancelled") return false;

  return (
    user.accountStatus === "invitation_pending" ||
    user.accountStatus === "draft" ||
    user.accountStatus === "invited" ||
    user.invitationStatus === "pending" ||
    user.invitationStatus === "expired"
  );
}

export function canCancelProvisioningInvitation(user: CeoProvisioningUser) {
  return user.accountStatus === "invitation_pending";
}

export function canEditPendingProvisioningUser(user: CeoProvisioningUser) {
  if (user.isSelf) return false;
  return (
    user.accountStatus === "invitation_pending" ||
    user.accountStatus === "draft" ||
    user.accountStatus === "invited" ||
    user.invitationStatus === "pending" ||
    user.invitationStatus === "expired"
  );
}

export function canChangePendingProvisioningRole(user: CeoProvisioningUser) {
  return canEditPendingProvisioningUser(user);
}
