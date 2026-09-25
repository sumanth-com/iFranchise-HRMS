"use client";

import { SelfAttendanceLiveProvider } from "@/components/attendance/self-attendance-live-context";
import { SelfAttendanceTodayCard } from "@/components/attendance/self-attendance-today-card";
import { ClientSectionBoundary } from "@/components/common/client-section-boundary";
import { DailyBoostCard } from "@/components/dashboard/daily-boost-card";
import {
  DASHBOARD_HOME_BAND,
  DASHBOARD_HOME_BOOST,
  DASHBOARD_HOME_EVENTS,
  DASHBOARD_HOME_INNER,
  DASHBOARD_HOME_LEFT_STACK,
  DASHBOARD_HOME_MAIN_GRID,
  DASHBOARD_HOME_SHELL,
} from "@/components/dashboard/dashboard-surface-classes";
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
  // Always allow self checkout updates for every employee portal user.
  const allowCheckoutUpdate = true;
  return (
    <ClientSectionBoundary
      title="Dashboard unavailable"
      description="We couldn't render this dashboard section. The rest of the portal stays available — try again or open another module."
      contentClassName="contents"
    >
      <SelfAttendanceLiveProvider today={today}>
        <div className={DASHBOARD_HOME_SHELL}>
          <div className={DASHBOARD_HOME_INNER}>
            <div className={DASHBOARD_HOME_BAND}>
              <EmployeeDashboardHeader greeting={greeting} subtitle={subtitle} />
            </div>

            <div className={DASHBOARD_HOME_BAND}>
              <EmployeeDashboardKpiCards kpis={kpis} today={today} />
            </div>

            <div className={DASHBOARD_HOME_MAIN_GRID}>
              <div className={DASHBOARD_HOME_LEFT_STACK}>
                <div className="w-full min-w-0 shrink-0">
                  <SelfAttendanceTodayCard
                    firstName={greeting.firstName}
                    today={today}
                    allowUpdateCheckout={allowCheckoutUpdate}
                  />
                </div>
                <DailyBoostCard
                  firstName={greeting.firstName}
                  lastName={greeting.lastName}
                  personKey={greeting.employeeId}
                  referenceDate={referenceDate}
                  className={DASHBOARD_HOME_BOOST}
                />
              </div>
              <EmployeeUpcomingEvents
                events={upcomingHolidays}
                referenceDate={referenceDate}
                canManageAnnouncements={canManageAnnouncements}
                pairHolidayBirthday={pairHolidayBirthday}
                showImportantNotices={showImportantNotices}
                className={DASHBOARD_HOME_EVENTS}
              />
            </div>
          </div>
        </div>
      </SelfAttendanceLiveProvider>
    </ClientSectionBoundary>
  );
}
