"use client";

import { SelfAttendanceLiveProvider } from "@/components/attendance/self-attendance-live-context";
import { SelfAttendanceTodayCard } from "@/components/attendance/self-attendance-today-card";
import { ClientSectionBoundary } from "@/components/common/client-section-boundary";
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
  // Always allow self checkout updates for every employee portal user.
  const allowCheckoutUpdate = true;
  return (
    <ClientSectionBoundary
      title="Dashboard unavailable"
      description="We couldn't render this dashboard section. The rest of the portal stays available — try again or open another module."
      contentClassName="contents"
    >
      <SelfAttendanceLiveProvider today={today}>
        {/*
          Fill the main pane at desktop, but keep overflow-y-auto (never overflow-hidden)
          so higher browser zoom can scroll instead of clipping sections.
        */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5">
          <div className="mx-auto flex w-full min-w-0 max-w-[88rem] flex-1 flex-col gap-3 xl:min-h-0">
            <div className="w-full min-w-0 shrink-0">
              <EmployeeDashboardHeader greeting={greeting} subtitle={subtitle} />
            </div>

            <div className="w-full min-w-0 shrink-0">
              <EmployeeDashboardKpiCards kpis={kpis} today={today} />
            </div>

            {/*
              Two-column desktop layout: left grows, right keeps a real min-width so
              Celebrations tabs + holiday art never collapse at 100% zoom.
            */}
            <div className="grid w-full min-w-0 flex-1 gap-3 max-lg:flex-none lg:min-h-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,minmax(0,1fr))] lg:items-stretch xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,minmax(0,1fr))]">
              <div className="flex min-h-0 min-w-0 flex-col gap-3 lg:h-full">
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
                  className="min-h-[11.5rem] w-full min-w-0 max-lg:min-h-0 lg:h-full lg:min-h-0 lg:flex-1"
                />
              </div>
              <EmployeeUpcomingEvents
                events={upcomingHolidays}
                referenceDate={referenceDate}
                canManageAnnouncements={canManageAnnouncements}
                pairHolidayBirthday={pairHolidayBirthday}
                showImportantNotices={showImportantNotices}
                className="min-h-[16rem] w-full min-w-0 max-lg:h-auto lg:h-full lg:min-h-0"
              />
            </div>
          </div>
        </div>
      </SelfAttendanceLiveProvider>
    </ClientSectionBoundary>
  );
}
