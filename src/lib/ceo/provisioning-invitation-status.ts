import type { ProvisioningInvitationStatus } from "@/types/ceo-user-provisioning";

const INVITATION_EXPIRY_HOURS = 48;

type InvitationStatusInput = {
  account_status?: string | null;
  user_id?: string | null;
  first_login_at?: string | null;
  last_login_at?: string | null;
  invitation_sent_at?: string | null;
  invitation_cancelled_at?: string | null;
};

/**
 * Portal ACTIVE/PENDING from actual access state:
 * - ACTIVE when the employee has a linked auth user and has used the portal
 *   (first/last login) or is already marked active.
 * - PENDING for invites that are still waiting (no portal login yet).
 */
export function deriveProvisioningInvitationStatus(
  row: InvitationStatusInput,
): ProvisioningInvitationStatus {
  const status = String(row.account_status ?? "draft");
  const hasPortalUser = Boolean(row.user_id);
  const hasLoggedIn = Boolean(row.first_login_at || row.last_login_at);

  if (status === "suspended") return "revoked";
  if (status === "inactive") return "inactive";
  if (status === "draft") {
    return row.invitation_cancelled_at ? "cancelled" : "pending";
  }

  if (status === "active" && hasPortalUser) {
    return "active";
  }

  if (hasPortalUser && hasLoggedIn) {
    return "active";
  }

  if (
    status === "invitation_accepted" ||
    status === "invitation_pending" ||
    status === "invited"
  ) {
    if (row.invitation_sent_at && !hasLoggedIn) {
      const ageMs = Date.now() - new Date(row.invitation_sent_at).getTime();
      if (ageMs > INVITATION_EXPIRY_HOURS * 60 * 60 * 1000) return "expired";
    }
    return "pending";
  }

  if (status === "active" && !hasLoggedIn) {
    return "pending";
  }

  return "pending";
}
