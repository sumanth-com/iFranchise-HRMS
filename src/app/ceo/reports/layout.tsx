import { ModuleShell } from "@/components/common/sticky-layout";
import { ReportsSubNav } from "@/components/reports/reports-sub-nav";
import { CEO_ROUTES } from "@/lib/ceo/constants";

export default function CeoReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModuleShell header={<ReportsSubNav basePath={CEO_ROUTES.reports} />}>
      {children}
    </ModuleShell>
  );
}
