"use client";

import { SelfAttendanceLiveProvider } from "@/components/attendance/self-attendance-live-context";
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
  canManageAnnouncements = false,
  canUpdateCheckout = false,
  subtitle,
  pairHolidayBirthday = false,
  showImportantNotices = false,
}: EmployeeDashboardData & {
  subtitle?: string;
  pairHolidayBirthday?: boolean;
  showImportantNotices?: boolean;
}) {
  return (
    <SelfAttendanceLiveProvider today={today}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-5">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-[88rem] flex-col gap-3">
          <div className="shrink-0">
            <EmployeeDashboardHeader greeting={greeting} subtitle={subtitle} />
          </div>

          <div className="shrink-0">
            <EmployeeDashboardKpiCards kpis={kpis} today={today} />
          </div>

          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[3fr_2fr] lg:items-stretch">
            <div className="flex min-h-0 flex-col gap-3">
              <div className="shrink-0">
                <SelfAttendanceTodayCard
                  firstName={greeting.firstName}
                  today={today}
                  allowUpdateCheckout={canUpdateCheckout}
                />
              </div>
              <DailyBoostCard
                firstName={greeting.firstName}
                lastName={greeting.lastName}
                personKey={greeting.employeeId}
                referenceDate={referenceDate}
                className="min-h-[11.5rem] flex-[1.15]"
              />
            </div>
            <EmployeeUpcomingEvents
              events={upcomingHolidays}
              referenceDate={referenceDate}
              canManageAnnouncements={canManageAnnouncements}
              pairHolidayBirthday={pairHolidayBirthday}
              showImportantNotices={showImportantNotices}
              className="min-h-0 h-full"
            />
          </div>
        </div>
      </div>
    </SelfAttendanceLiveProvider>
  );
}
