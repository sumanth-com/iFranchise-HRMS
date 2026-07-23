"use client";

import { EmployeeAttendanceWidget } from "@/components/employee/dashboard/employee-attendance-widget";
import { DailyBoostCard } from "@/components/dashboard/daily-boost-card";
import { EmployeeDashboardHeader } from "@/components/employee/dashboard/employee-dashboard-header";
import { EmployeeDashboardKpiCards } from "@/components/employee/dashboard/employee-dashboard-kpis";
import { EmployeeUpcomingEvents } from "@/components/employee/dashboard/employee-upcoming-events";
import type { EmployeeDashboardData } from "@/types/employee-dashboard";

export function EmployeeDashboardView({
  greeting,
  today,
  kpis,
  referenceDate,
  upcomingHolidays,
}: EmployeeDashboardData) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-5 lg:overflow-hidden">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[88rem] flex-col gap-3 md:gap-4 lg:overflow-hidden">
        <div className="shrink-0">
          <EmployeeDashboardHeader greeting={greeting} />
        </div>

        <div className="shrink-0">
          <EmployeeDashboardKpiCards kpis={kpis} />
        </div>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[3fr_2fr] lg:items-stretch lg:overflow-hidden">
          <div className="min-h-0 lg:h-full">
            <EmployeeAttendanceWidget today={today} />
          </div>
          <EmployeeUpcomingEvents
            events={upcomingHolidays}
            referenceDate={referenceDate}
            className="min-h-0 lg:h-full"
          />
        </div>

        <DailyBoostCard
          firstName={greeting.firstName}
          lastName={greeting.lastName}
          personKey={greeting.employeeId}
          referenceDate={referenceDate}
          compact
          className="shrink-0"
        />
      </div>
    </div>
  );
}
