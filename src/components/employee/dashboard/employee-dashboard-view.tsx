"use client";

import { EmployeeAttendanceWidget } from "@/components/employee/dashboard/employee-attendance-widget";
import { EmployeeBirthdayCard } from "@/components/employee/dashboard/employee-birthday-card";
import { EmployeeDailyQuoteCard } from "@/components/employee/dashboard/employee-daily-quote-card";
import { EmployeeDashboardHeader } from "@/components/employee/dashboard/employee-dashboard-header";
import { EmployeeDashboardKpiCards } from "@/components/employee/dashboard/employee-dashboard-kpis";
import { EmployeeUpcomingEvents } from "@/components/employee/dashboard/employee-upcoming-events";
import type { EmployeeDashboardData } from "@/types/employee-dashboard";

export function EmployeeDashboardView({
  pageTitle = "Dashboard",
  pageSubtitle = "Welcome back! Here's everything you need for your workday.",
  showPageHeading = true,
  greeting,
  today,
  kpis,
  referenceDate,
  upcomingHolidays,
  birthdaysThisWeek,
}: EmployeeDashboardData & {
  pageTitle?: string;
  pageSubtitle?: string;
  showPageHeading?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-5">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[88rem] flex-col gap-4 md:gap-5">
        {showPageHeading ? (
          <div className="shrink-0">
            <h1 className="text-2xl font-semibold tracking-tight">{pageTitle}</h1>
            {pageSubtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{pageSubtitle}</p>
            ) : null}
          </div>
        ) : null}

        <EmployeeDashboardHeader greeting={greeting} />

        <EmployeeDashboardKpiCards kpis={kpis} />

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-5">
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto lg:col-span-3">
            <EmployeeAttendanceWidget today={today} />
            <EmployeeBirthdayCard
              birthdays={birthdaysThisWeek}
              referenceDate={referenceDate}
            />
            <EmployeeDailyQuoteCard
              name={greeting.firstName}
              referenceDate={referenceDate}
            />
          </div>
          <div className="min-h-0 lg:col-span-2">
            <EmployeeUpcomingEvents
              events={upcomingHolidays}
              referenceDate={referenceDate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
