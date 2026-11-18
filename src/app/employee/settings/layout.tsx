import { redirectSuperAdminToSystemPortal } from "@/lib/system-admin/guards";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";

export default function EmployeeSettingsPortalRedirect({
  children,
}: {
  children: React.ReactNode;
}): Promise<never> {
  void children;
  return redirectSuperAdminToSystemPortal(SYSTEM_ADMIN_ROUTES.home);
}
