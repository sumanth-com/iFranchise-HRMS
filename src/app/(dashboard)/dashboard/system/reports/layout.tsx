import { ModuleShell } from "@/components/common/sticky-layout";
import { ReportsSubNav } from "@/components/reports/reports-sub-nav";
import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";

export default function SuperAdminReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleShell header={<ReportsSubNav basePath={SYSTEM_ADMIN_ROUTES.reports} />}>
      {children}
    </ModuleShell>
  );
}
