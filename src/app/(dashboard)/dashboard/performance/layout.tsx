import { ModuleShell } from "@/components/common/sticky-layout";
import { PerformanceSubNav } from "@/components/performance/performance-sub-nav";

export default function PerformanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ModuleShell header={<PerformanceSubNav />}>{children}</ModuleShell>;
}
