import { ModuleShell } from "@/components/common/sticky-layout";
import { RolesSubNav } from "@/components/roles/roles-sub-nav";

export default function RolesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ModuleShell header={<RolesSubNav />}>{children}</ModuleShell>;
}
