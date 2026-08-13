import { PerformanceShell } from "@/components/performance/performance-shell";
import { CEO_ROUTES } from "@/lib/ceo/constants";

export default function CeoPerformanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PerformanceShell basePath={CEO_ROUTES.performance}>{children}</PerformanceShell>;
}
