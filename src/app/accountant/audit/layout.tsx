import { ModuleShell } from "@/components/common/sticky-layout";
import { AuditSubNav } from "@/components/audit/audit-sub-nav";
import { ACCOUNTANT_ROUTES } from "@/lib/accountant/constants";
import { AUDIT_VIEW_PERMISSIONS } from "@/lib/audit/constants";
import { requireServerAnyPermission } from "@/lib/permissions/server";

export default async function AccountantAuditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireServerAnyPermission([...AUDIT_VIEW_PERMISSIONS]);

  return (
    <ModuleShell
      header={
        <AuditSubNav
          profile={profile}
          routesBasePath={ACCOUNTANT_ROUTES.audit}
          readOnlyLogs
        />
      }
    >
      {children}
    </ModuleShell>
  );
}
