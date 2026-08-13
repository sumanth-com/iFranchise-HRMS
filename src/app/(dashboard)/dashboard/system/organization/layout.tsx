import { ModuleShell } from "@/components/common/sticky-layout";
import { OrganizationSubNav } from "@/components/organization/organization-sub-nav";
import { buildSuperAdminOrganizationSubNav } from "@/lib/organization/constants";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";

export default function SuperAdminOrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleShell
      header={
        <OrganizationSubNav
          basePath={SYSTEM_ADMIN_ROUTES.organization}
          items={[
            ...buildSuperAdminOrganizationSubNav(SYSTEM_ADMIN_ROUTES.organization),
          ]}
        />
      }
    >
      {children}
    </ModuleShell>
  );
}
