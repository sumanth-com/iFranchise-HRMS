import { ModuleShell } from "@/components/common/sticky-layout";
import { ReportsSubNav } from "@/components/reports/reports-sub-nav";

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ModuleShell header={<ReportsSubNav />}>{children}</ModuleShell>;
}
