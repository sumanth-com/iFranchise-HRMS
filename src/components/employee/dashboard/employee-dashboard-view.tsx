"use client";

import { SelfAttendanceLiveProvider } from "@/components/attendance/self-attendance-live-context";
import { SelfAttendanceTodayCard } from "@/components/attendance/self-attendance-today-card";
import { ClientSectionBoundary } from "@/components/common/client-section-boundary";
import { DailyBoostCard } from "@/components/dashboard/daily-boost-card";
import {
  DASHBOARD_HOME_BOOST,
  DASHBOARD_HOME_EVENTS,
  DASHBOARD_HOME_LEFT_STACK,
  DASHBOARD_HOME_MAIN_GRID,
  DASHBOARD_HOME_INNER,
  DASHBOARD_HOME_SHELL,
} from "@/components/dashboard/dashboard-surface-classes";
import { EmployeeDashboardKpiCards } from "@/components/employee/dashboard/employee-dashboard-kpis";
import { EmployeeDashboardHeader } from "@/components/employee/dashboard/employee-dashboard-header";
import { EmployeeUpcomingEvents } from "@/components/employee/dashboard/employee-upcoming-events";
import type { EmployeeDashboardData } from "@/types/employee-dashboard";

export function EmployeeDashboardView({
  greeting,
  subtitle = "HR Portal",
  today,
  kpis,
  referenceDate,
  upcomingHolidays,
  companyAnnouncements,
  canManageAnnouncements = false,
  pairHolidayBirthday = false,
  showImportantNotices = false,
}: EmployeeDashboardData & {
  subtitle?: string;
  pairHolidayBirthday?: boolean;
  showImportantNotices?: boolean;
}) {
  const content = (
    <>
      <EmployeeDashboardHeader greeting={greeting} subtitle={subtitle} />
      <EmployeeDashboardKpiCards kpis={kpis} today={today} />

      <div className={DASHBOARD_HOME_MAIN_GRID}>
        <div className={DASHBOARD_HOME_LEFT_STACK}>
          <SelfAttendanceTodayCard
            firstName={greeting.firstName}
            today={today}
            allowUpdateCheckout
            compact
          />
          <DailyBoostCard
            firstName={greeting.firstName}
            lastName={greeting.lastName}
            personKey={greeting.employeeId}
            referenceDate={referenceDate}
            compact
            className={DASHBOARD_HOME_BOOST}
          />
        </div>
        <EmployeeUpcomingEvents
          events={upcomingHolidays}
          referenceDate={referenceDate}
          canManageAnnouncements={canManageAnnouncements}
          pairHolidayBirthday={pairHolidayBirthday}
          showImportantNotices={showImportantNotices}
          companyAnnouncements={companyAnnouncements}
          className={DASHBOARD_HOME_EVENTS}
        />
      </div>
    </>
  );

  return (
    <ClientSectionBoundary
      title="Dashboard unavailable"
      description="We couldn't render this dashboard section. The rest of the portal stays available — try again or open another module."
      contentClassName="contents"
    >
      <SelfAttendanceLiveProvider today={today}>
        <div className={DASHBOARD_HOME_SHELL}>
          <div className={DASHBOARD_HOME_INNER}>{content}</div>
        </div>
      </SelfAttendanceLiveProvider>
    </ClientSectionBoundary>
  );
}
