import { PerformanceShell } from "@/components/performance/performance-shell";

export default function PerformanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PerformanceShell>{children}</PerformanceShell>;
}
