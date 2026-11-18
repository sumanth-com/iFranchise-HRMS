import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { SoftLoadError } from "@/components/common/soft-load-error";
import {
  DASHBOARD_HOME_EVENTS,
  DASHBOARD_HOME_INNER,
  DASHBOARD_HOME_SHELL,
} from "@/components/dashboard/dashboard-surface-classes";
import { DailyBoostCard } from "@/components/dashboard/daily-boost-card";
import { EmployeeDashboardHeader } from "@/components/employee/dashboard/employee-dashboard-header";
import { EmployeeDashboardView } from "@/components/employee/dashboard/employee-dashboard-view";
import { EmployeeUpcomingEvents } from "@/components/employee/dashboard/employee-upcoming-events";
import {
  getEmployeeDashboardCoreData,
  getEmployeeDashboardEvents,
  greetingFromProfile,
} from "@/lib/employee/services/employee-dashboard-queries";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/types/auth";

function DashboardContentPending({ firstName, lastName, employeeId }: {
  firstName: string;
  lastName: string;
  employeeId: string;
}) {
  return (
    <div className="grid min-h-[15rem] gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]" role="status" aria-live="polite">
      <div className="flex min-h-0 flex-col gap-3">
        <div className="flex min-h-24 flex-1 items-center justify-center gap-2 rounded-2xl border bg-card px-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          <span>Getting today&apos;s attendance ready…</span>
        </div>
        <DailyBoostCard
          firstName={firstName}
          lastName={lastName}
          personKey={employeeId}
          referenceDate={new Date().toISOString().slice(0, 10)}
          compact
          className="min-h-[11rem]"
        />
      </div>
      <div className="flex min-h-24 items-center justify-center rounded-2xl border bg-card px-4 text-sm text-muted-foreground">
        Loading your dashboard summary…
      </div>
    </div>
  );
}

async function EmployeeDashboardEvents({
  profile,
  referenceDate,
  canManageAnnouncements,
  pairHolidayBirthday,
  showImportantNotices,
}: {
  profile: UserProfile;
  referenceDate: string;
  canManageAnnouncements: boolean;
  pairHolidayBirthday: boolean;
  showImportantNotices: boolean;
}) {
  try {
    const supabase = await createClient();
    const { upcomingHolidays, companyAnnouncements } =
      await getEmployeeDashboardEvents(supabase, profile);

    return (
      <EmployeeUpcomingEvents
        events={upcomingHolidays}
        referenceDate={referenceDate}
        canManageAnnouncements={canManageAnnouncements}
        pairHolidayBirthday={pairHolidayBirthday}
        showImportantNotices={showImportantNotices}
        companyAnnouncements={companyAnnouncements}
        className={DASHBOARD_HOME_EVENTS}
      />
    );
  } catch (error) {
    console.error("[employee-dashboard] events load failed", error);
    return (
      <div className={`${DASHBOARD_HOME_EVENTS} flex items-center justify-center rounded-2xl border bg-card px-4 text-center text-sm text-muted-foreground`}>
        Team highlights will appear here when available.
      </div>
    );
  }
}

async function EmployeeDashboardCore({
  profile,
  subtitle,
  canManageAnnouncements,
  pairHolidayBirthday,
  showImportantNotices,
}: {
  profile: UserProfile;
  subtitle: string;
  canManageAnnouncements: boolean;
  pairHolidayBirthday: boolean;
  showImportantNotices: boolean;
}) {
  try {
    const supabase = await createClient();
    const core = await getEmployeeDashboardCoreData(supabase, profile);
    const eventsSlot = (
      <Suspense
        fallback={
          <div className={`${DASHBOARD_HOME_EVENTS} flex items-center justify-center rounded-2xl border bg-card px-4 text-sm text-muted-foreground`} role="status">
            Highlights are on the way…
          </div>
        }
      >
        <EmployeeDashboardEvents
          profile={profile}
          referenceDate={core.referenceDate}
          canManageAnnouncements={canManageAnnouncements}
          pairHolidayBirthday={pairHolidayBirthday}
          showImportantNotices={showImportantNotices}
        />
      </Suspense>
    );

    return (
      <EmployeeDashboardView
        {...core}
        upcomingHolidays={[]}
        companyAnnouncements={[]}
        subtitle={subtitle}
        canManageAnnouncements={canManageAnnouncements}
        pairHolidayBirthday={pairHolidayBirthday}
        showImportantNotices={showImportantNotices}
        eventsSlot={eventsSlot}
        embedded
        showHeader={false}
      />
    );
  } catch (error) {
    console.error("[employee-dashboard] page load failed", error);
    return <SoftLoadError variant="page" />;
  }
}

/**
 * Shows the authenticated dashboard header immediately, then streams attendance
 * and highlights into separate boundaries instead of holding the whole page.
 */
export function EmployeeDashboardPageBody({
  profile,
  subtitle,
  canManageAnnouncements = false,
  pairHolidayBirthday = false,
  showImportantNotices = false,
}: {
  profile: UserProfile;
  subtitle: string;
  canManageAnnouncements?: boolean;
  pairHolidayBirthday?: boolean;
  showImportantNotices?: boolean;
}) {
  const greeting = greetingFromProfile(profile);

  return (
    <div className={DASHBOARD_HOME_SHELL}>
      <div className={DASHBOARD_HOME_INNER}>
        <EmployeeDashboardHeader greeting={greeting} subtitle={subtitle} />
        <Suspense
          fallback={
            <DashboardContentPending
              firstName={greeting.firstName}
              lastName={greeting.lastName}
              employeeId={greeting.employeeId}
            />
          }
        >
          <EmployeeDashboardCore
            profile={profile}
            subtitle={subtitle}
            canManageAnnouncements={canManageAnnouncements}
            pairHolidayBirthday={pairHolidayBirthday}
            showImportantNotices={showImportantNotices}
          />
        </Suspense>
      </div>
    </div>
  );
}
