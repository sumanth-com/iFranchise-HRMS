import { ModuleShell } from "@/components/common/sticky-layout";
import { OrganizationSubNav } from "@/components/organization/organization-sub-nav";

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleShell header={<OrganizationSubNav />}>{children}</ModuleShell>
  );
}
