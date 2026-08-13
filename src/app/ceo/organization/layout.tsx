import { ModuleShell } from "@/components/common/sticky-layout";
import { OrganizationSubNav } from "@/components/organization/organization-sub-nav";
import { CEO_ROUTES } from "@/lib/ceo/constants";

export default function CeoOrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleShell header={<OrganizationSubNav basePath={CEO_ROUTES.organization} />}>
      {children}
    </ModuleShell>
  );
}
