import { ModuleShell } from "@/components/common/sticky-layout";
import { ReportsSubNav } from "@/components/reports/reports-sub-nav";
import { ACCOUNTANT_ROUTES } from "@/lib/accountant/constants";

const ACCOUNTANT_REPORTS_NAV = [
  { title: "Payroll", href: ACCOUNTANT_ROUTES.reportsPayroll },
] as const;

export default function AccountantReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleShell
      header={
        <ReportsSubNav
          basePath={ACCOUNTANT_ROUTES.reports}
          items={ACCOUNTANT_REPORTS_NAV}
        />
      }
    >
      {children}
    </ModuleShell>
  );
}
