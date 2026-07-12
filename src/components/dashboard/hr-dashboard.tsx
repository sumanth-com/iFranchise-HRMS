import { ErrorState, PageScroll } from "@/components/common";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import {
  DashboardKpiRow,
  DashboardSecondaryRow,
} from "@/components/dashboard/dashboard-kpi-rows";
import {
  DashboardBottomLists,
  DashboardChartsGrid,
  DashboardEventsRow,
  DashboardMiddleRow,
  DashboardQuickAccess,
} from "@/components/dashboard/dashboard-panels";
import type { HrDashboardData } from "@/types/dashboard";

type Props = {
  data: HrDashboardData;
  permissionCodes: string[];
  error?: string | null;
};

export function HrDashboard({ data, permissionCodes, error }: Props) {
  if (error) {
    return (
      <PageScroll>
        <DashboardHeader />
        <ErrorState title="Unable to load dashboard" description={error} />
      </PageScroll>
    );
  }

  return (
    <PageScroll className="gap-3 pb-4 md:gap-3">
      <DashboardHeader />
      <DashboardKpiRow kpis={data.kpis} />
      <DashboardSecondaryRow secondary={data.secondary} />
      <DashboardMiddleRow activities={data.activities} tasks={data.tasks} />
      <DashboardChartsGrid charts={data.charts} />
      <DashboardQuickAccess permissionCodes={permissionCodes} />
      <DashboardEventsRow
        birthdays={data.upcomingBirthdays}
        anniversaries={data.upcomingAnniversaries}
        interviews={data.upcomingInterviews}
        holidays={data.upcomingHolidays}
      />
      <DashboardBottomLists data={data} />
    </PageScroll>
  );
}
