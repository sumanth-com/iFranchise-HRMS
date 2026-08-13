import { ModuleShell } from "@/components/common/sticky-layout";
import { SuperAdminRolesSubNav } from "@/components/system-admin/super-admin-roles-sub-nav";

export default function SuperAdminRolesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ModuleShell header={<SuperAdminRolesSubNav />}>{children}</ModuleShell>;
}
