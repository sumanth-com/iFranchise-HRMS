"use client";

import { SelfAttendanceTodayCard } from "@/components/attendance/self-attendance-today-card";
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
  subtitle,
}: EmployeeDashboardData & { subtitle?: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-5">
      <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-4">
        <div className="shrink-0">
          <EmployeeDashboardHeader greeting={greeting} subtitle={subtitle} />
        </div>

        <div className="shrink-0">
          <EmployeeDashboardKpiCards kpis={kpis} />
        </div>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[3fr_2fr] lg:items-stretch">
          <div className="flex min-h-0 flex-col gap-3 lg:gap-4">
            <SelfAttendanceTodayCard
              firstName={greeting.firstName}
              today={today}
            />
            <DailyBoostCard
              firstName={greeting.firstName}
              lastName={greeting.lastName}
              personKey={greeting.employeeId}
              referenceDate={referenceDate}
              className="min-h-[15rem] flex-1"
            />
          </div>
          <EmployeeUpcomingEvents
            events={upcomingHolidays}
            referenceDate={referenceDate}
            className="min-h-0 lg:h-full"
          />
        </div>
      </div>
    </div>
  );
}
