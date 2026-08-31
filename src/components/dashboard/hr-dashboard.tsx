"use client";

import { ErrorState } from "@/components/common";
import { DashboardOperationsRow } from "@/components/dashboard/dashboard-panels";
import { HrTodayPulseSection } from "@/components/dashboard/hr-today-pulse-section";
import { ASSETS_ROUTES } from "@/lib/assets/constants";
import { DASHBOARD_KPI_LINKS } from "@/lib/dashboard/constants";
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
    <div className="relative flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 md:p-4">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.14),transparent_55%),radial-gradient(ellipse_at_top_right,rgba(14,165,233,0.12),transparent_50%),radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.10),transparent_55%)] dark:opacity-40"
        aria-hidden
      />
      <section className="relative z-10 shrink-0" aria-label="Today's Pulse">
        <HrTodayPulseSection pulse={data.todayPulse} visualTone="vibrant" />
      </section>

      <section
        className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden"
        aria-label="Operations"
      >
        <DashboardOperationsRow
          visualTone="vibrant"
          tasks={data.tasks}
          rightPanel="focus-pair"
          rightFocusTitle="Workforce"
          rightFocusDescription="Headcount and upcoming celebrations"
          rightFocusItems={[
            {
              id: "headcount",
              label: "Active employees",
              value: data.kpis.totalEmployees,
              hint: "Workforce",
              href: EMPLOYEE_ROUTES.list,
            },
            {
              id: "upcoming-birthdays",
              label: "Upcoming birthdays",
              value: data.secondary.upcomingBirthdaysCount,
              hint: "Next 7 days",
              href: EMPLOYEE_ROUTES.list,
            },
          ]}
          watchItems={[
            {
              id: "company-assets",
              label: "Company Assets",
              value: data.secondary.assignedAssetsCount,
              hint: "Assigned inventory",
              href: ASSETS_ROUTES.dashboard,
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
          insightsDescription="Assets and exits to review"
        />
      </section>
    </div>
  );
}
