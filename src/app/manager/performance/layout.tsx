import { PerformanceShell } from "@/components/performance/performance-shell";
import { MANAGER_ROUTES } from "@/lib/manager/constants";

export default function ManagerPerformanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PerformanceShell basePath={MANAGER_ROUTES.performance}>{children}</PerformanceShell>
  );
}
