import type { UserProfile } from "@/types/auth";

/**
 * Every self-service user may update their own checkout after punching out
 * (employee, manager, HR, IT, executives). Keeps the Update Check Out action
 * visible so punch controls do not disappear after checkout.
 */
export function canUpdateOwnCheckout(
  _profile?: Pick<UserProfile, "roles" | "permissionCodes">,
): boolean {
  return true;
}
