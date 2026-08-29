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
  halfDayToday: MANAGER_DASHBOARD_KPI_LINKS.halfDayToday,
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
          rightPanel="focus-pair"
          rightFocusTitle="Team Snapshot"
          rightFocusDescription="Team size and probation at a glance"
          rightFocusItems={[
            {
              id: "team-size",
              label: "Team size",
              value: data.kpis.teamSize,
              hint: "People",
              href: MANAGER_DASHBOARD_KPI_LINKS.teamSize,
            },
            {
              id: "probation-ending",
              label: "Probation ending",
              value: data.kpis.probationEndingSoon,
              hint: "Confirm soon",
              href: MANAGER_DASHBOARD_KPI_LINKS.probationEndingSoon,
            },
          ]}
          watchItems={[
            {
              id: "pending-leave",
              label: "Pending leave",
              value: data.kpis.pendingLeaveApprovals,
              hint: "Needs decision",
              href: MANAGER_DASHBOARD_KPI_LINKS.pendingLeaveApprovals,
            },
            {
              id: "performance-reviews",
              label: "Performance reviews",
              value: data.kpis.pendingPerformanceReviews,
              hint: "Follow up",
              href: MANAGER_DASHBOARD_KPI_LINKS.pendingPerformanceReviews,
            },
          ]}
          upcomingHolidays={data.todayPulse.upcomingHolidays}
          upcomingBirthdays={data.upcomingBirthdays}
          upcomingAnniversaries={data.upcomingAnniversaries}
          insightsTitle="Team Focus"
          insightsDescription="Leave and performance waiting on you"
          focusDescription="Interviews, probation, leave, and hiring"
        />
      </section>
    </div>
  );
}
