import { ErrorState } from "@/components/common";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardKpiRow } from "@/components/dashboard/dashboard-kpi-rows";
import { DashboardOperationsRow } from "@/components/dashboard/dashboard-panels";
import type { HrDashboardData } from "@/types/dashboard";
import { cn } from "@/lib/utils";

type Props = {
  data: HrDashboardData;
  permissionCodes: string[];
  error?: string | null;
};

export function HrDashboard({ data, error }: Props) {
  if (error) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 md:p-5">
        <DashboardHeader showGreeting={false} />
        <ErrorState title="Unable to load dashboard" description={error} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 md:gap-3 md:p-5 lg:overflow-hidden",
      )}
    >
      <div className="shrink-0">
        <DashboardHeader showGreeting={false} />
      </div>

      <section className="shrink-0" aria-label="Key performance indicators">
        <DashboardKpiRow kpis={data.kpis} />
      </section>

      <section
        className="flex min-h-0 flex-1 flex-col"
        aria-label="Operations"
      >
        <DashboardOperationsRow
          activities={data.activities}
          tasks={data.tasks}
          charts={data.charts}
        />
      </section>
    </div>
  );
}
