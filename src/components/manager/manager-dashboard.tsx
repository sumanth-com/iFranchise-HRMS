"use client";

import { ErrorState } from "@/components/common";
import { DashboardOperationsRow } from "@/components/dashboard/dashboard-panels";
import { HrTodayPulseSection } from "@/components/dashboard/hr-today-pulse-section";
import { MANAGER_DASHBOARD_KPI_LINKS, MANAGER_ROUTES } from "@/lib/manager/constants";
import type { ManagerDashboardData } from "@/types/manager-dashboard";

type ManagerDashboardProps = {
  data: ManagerDashboardData;
  error?: string | null;
};

const PULSE_LINKS = {
  presentToday: MANAGER_DASHBOARD_KPI_LINKS.presentToday,
  absentToday: MANAGER_DASHBOARD_KPI_LINKS.onLeaveToday,
  lateToday: MANAGER_DASHBOARD_KPI_LINKS.lateToday,
  pendingLeaveApprovals: MANAGER_DASHBOARD_KPI_LINKS.pendingLeaveApprovals,
  exitRequests: MANAGER_ROUTES.resignation,
};

export function ManagerDashboard({ data, error }: ManagerDashboardProps) {
  if (error) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 md:p-5">
        <ErrorState title="Unable to load manager overview" description={error} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 md:p-4">
      <section className="shrink-0" aria-label="Today's Pulse">
        <HrTodayPulseSection
          pulse={data.todayPulse}
          subtitle="Live snapshot of your team today"
          links={PULSE_LINKS}
        />
      </section>

      <section
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        aria-label="Operations"
      >
        <DashboardOperationsRow
          tasks={data.tasks}
          charts={data.charts}
          upcomingHolidays={data.todayPulse.upcomingHolidays}
          upcomingBirthdays={data.upcomingBirthdays}
          upcomingAnniversaries={data.upcomingAnniversaries}
          insightsTitle="Team Insights"
          insightsDescription="Attendance pulse and upcoming celebrations"
        />
      </section>
    </div>
  );
}
