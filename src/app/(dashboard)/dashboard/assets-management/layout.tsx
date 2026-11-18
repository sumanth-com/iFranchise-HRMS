import { ModuleShell } from "@/components/common/sticky-layout";
import { AssetsSubNav } from "@/components/assets/assets-sub-nav";
import { redirectSuperAdminToSystemPortal } from "@/lib/system-admin/guards";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";

export default async function AssetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectSuperAdminToSystemPortal(SYSTEM_ADMIN_ROUTES.assets);
  return <ModuleShell header={<AssetsSubNav />}>{children}</ModuleShell>;
}
