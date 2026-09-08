import type { UserProfile } from "@/types/auth";

/**
 * Every employee (regular, manager, HR, IT, admin) may update their own
 * checkout any time after punching out, until the calendar day ends
 * (Asia/Kolkata). This keeps Update Check Out visible for everyone.
 */
export function canUpdateOwnCheckout(
  _profile?: Pick<UserProfile, "roles" | "permissionCodes">,
): boolean {
  return true;
}
