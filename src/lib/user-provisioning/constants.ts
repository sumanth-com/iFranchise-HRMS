import { CEO_ROUTES } from "@/lib/ceo/constants";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";

export const USER_PROVISIONING_ROUTES = {
  hr: "/dashboard/user-provisioning",
  ceo: CEO_ROUTES.userProvisioning,
  system: SYSTEM_ADMIN_ROUTES.provisioning,
} as const;

export const USER_PROVISIONING_VIEW_PERMISSIONS = [
  "user_provisioning.view",
  "user_provisioning.manage",
] as const;

export function userProvisioningPaths() {
  return Object.values(USER_PROVISIONING_ROUTES);
}
