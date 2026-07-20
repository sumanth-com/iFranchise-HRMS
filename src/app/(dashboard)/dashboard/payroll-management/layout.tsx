import { ModuleShell } from "@/components/common/sticky-layout";
import { PayrollSubNav } from "@/components/payroll/payroll-sub-nav";

export default function PayrollLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ModuleShell header={<PayrollSubNav />}>{children}</ModuleShell>;
}
