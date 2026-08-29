"use client";

import { ErrorState } from "@/components/common";
import { DashboardOperationsRow } from "@/components/dashboard/dashboard-panels";
import { HrTodayPulseSection } from "@/components/dashboard/hr-today-pulse-section";
import { DASHBOARD_ACTION_LINKS, DASHBOARD_KPI_LINKS } from "@/lib/dashboard/constants";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import type { HrDashboardData } from "@/types/dashboard";

type Props = {
  data: HrDashboardData;
  permissionCodes: string[];
  error?: string | null;
};

export function HrDashboard({ data, error }: Props) {
  if (error) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 md:p-5">
        <ErrorState title="Unable to load dashboard" description={error} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 md:p-4">
      <section className="shrink-0" aria-label="Today's Pulse">
        <HrTodayPulseSection pulse={data.todayPulse} />
      </section>

      <section
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        aria-label="Operations"
      >
        <DashboardOperationsRow
          tasks={data.tasks}
          rightPanel="focus-pair"
          rightFocusTitle="Workforce"
          rightFocusDescription="Headcount and probation at a glance"
          rightFocusItems={[
            {
              id: "headcount",
              label: "Active employees",
              value: data.kpis.totalEmployees,
              hint: "Workforce",
              href: EMPLOYEE_ROUTES.list,
            },
            {
              id: "probation-ending",
              label: "On probation",
              value: data.secondary.probationEndingSoon,
              hint: "Review status",
              href: `${EMPLOYEE_ROUTES.list}?employmentStatus=probation`,
            },
          ]}
          watchItems={[
            {
              id: "documents-expiring",
              label: "Documents expiring",
              value: data.secondary.documentsExpiring,
              hint: "Renew soon",
              href: DASHBOARD_ACTION_LINKS.documentsExpiring,
            },
            {
              id: "exit-clearance",
              label: "Exit clearance",
              value: data.secondary.exitClearancePending,
              hint: "Pending action",
              href: DASHBOARD_KPI_LINKS.exitRequests,
            },
          ]}
          upcomingHolidays={data.todayPulse.upcomingHolidays}
          upcomingBirthdays={data.upcomingBirthdays}
          upcomingAnniversaries={data.upcomingAnniversaries}
          insightsTitle="People Focus"
          insightsDescription="Documents and exits to review"
        />
      </section>
    </div>
  );
}
