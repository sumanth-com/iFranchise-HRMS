import { ModuleShell } from "@/components/common/sticky-layout";
import { ReportsSubNav } from "@/components/reports/reports-sub-nav";
import { MANAGER_REPORTS_SUB_NAV, MANAGER_ROUTES } from "@/lib/manager/constants";

export default function ManagerReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleShell
      header={
        <ReportsSubNav
          basePath={MANAGER_ROUTES.reports}
          items={MANAGER_REPORTS_SUB_NAV}
        />
      }
    >
      {children}
    </ModuleShell>
  );
}
