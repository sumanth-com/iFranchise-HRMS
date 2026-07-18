"use client";

import { EmployeeAttendanceWidget } from "@/components/employee/dashboard/employee-attendance-widget";
import { EmployeeBirthdayCard } from "@/components/employee/dashboard/employee-birthday-card";
import { EmployeeDailyQuoteCard } from "@/components/employee/dashboard/employee-daily-quote-card";
import { EmployeeDashboardHeader } from "@/components/employee/dashboard/employee-dashboard-header";
import { EmployeeDashboardKpiCards } from "@/components/employee/dashboard/employee-dashboard-kpis";
import { EmployeeUpcomingEvents } from "@/components/employee/dashboard/employee-upcoming-events";
import type { EmployeeDashboardData } from "@/types/employee-dashboard";

export function EmployeeDashboardView(data: EmployeeDashboardData) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-5">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-4">
        <div className="shrink-0">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back! Here&apos;s everything you need for your workday.
          </p>
        </div>

        <EmployeeDashboardHeader greeting={data.greeting} />

        <EmployeeDashboardKpiCards kpis={data.kpis} />

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-5">
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto lg:col-span-3">
            <EmployeeAttendanceWidget today={data.today} />
            <EmployeeBirthdayCard
              birthdays={data.birthdaysThisWeek}
              referenceDate={data.referenceDate}
            />
            <EmployeeDailyQuoteCard
              name={data.greeting.firstName}
              referenceDate={data.referenceDate}
            />
          </div>
          <div className="min-h-0 lg:col-span-2">
            <EmployeeUpcomingEvents
              events={data.upcomingHolidays}
              referenceDate={data.referenceDate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
