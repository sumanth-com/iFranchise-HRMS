import { redirectSuperAdminToSystemPortal } from "@/lib/system-admin/guards";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";

export default async function SettingsSelfServicePage() {
  await redirectSuperAdminToSystemPortal(SYSTEM_ADMIN_ROUTES.home);
}
