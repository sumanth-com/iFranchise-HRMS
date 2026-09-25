"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ClientSectionBoundary } from "@/components/common/client-section-boundary";
import { SoftLoadError } from "@/components/common/soft-load-error";
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
import { CeoDashboardKpis } from "@/components/ceo/ceo-dashboard-kpis";
import { CeoDashboardPipeline } from "@/components/ceo/ceo-dashboard-pipeline";
import { CeoDashboardToday } from "@/components/ceo/ceo-dashboard-today";
import { EmployeeDashboardHeader } from "@/components/employee/dashboard/employee-dashboard-header";
import { EmployeeUpcomingEvents } from "@/components/employee/dashboard/employee-upcoming-events";
import {
  SECTION_LOAD_ERROR_DESCRIPTION,
  SECTION_LOAD_ERROR_TITLE,
} from "@/lib/errors/employee-facing";
import type { CeoDashboardData } from "@/types/ceo-dashboard";
import { useAuth } from "@/providers/auth-provider";

type CeoDashboardProps = {
  data: CeoDashboardData;
  error?: string | null;
};

/** Soft RSC refresh when returning to the tab — not polling. */
const FOCUS_REFRESH_MIN_MS = 15_000;

export function CeoDashboard({ data, error }: CeoDashboardProps) {
  const { profile } = useAuth();
  const router = useRouter();
  const [referenceDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const lastRefreshAt = useRef(Date.now());

  useEffect(() => {
    const refreshIfStale = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefreshAt.current < FOCUS_REFRESH_MIN_MS) return;
      lastRefreshAt.current = now;
      router.refresh();
    };

    document.addEventListener("visibilitychange", refreshIfStale);
    window.addEventListener("focus", refreshIfStale);
    return () => {
      document.removeEventListener("visibilitychange", refreshIfStale);
      window.removeEventListener("focus", refreshIfStale);
    };
  }, [router]);

  if (error) {
    return <SoftLoadError variant="page" />;
  }

  const firstName = profile?.employee?.firstName ?? "there";
  const lastName = profile?.employee?.lastName ?? "";
  const employeeId = profile?.employee?.id ?? "ceo";
  const employeeCode = profile?.employee?.employeeCode ?? "";

  return (
    <ClientSectionBoundary
      title={SECTION_LOAD_ERROR_TITLE}
      description={SECTION_LOAD_ERROR_DESCRIPTION}
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <div className={DASHBOARD_HOME_SHELL}>
        <div className={DASHBOARD_HOME_INNER}>
          <div className={DASHBOARD_HOME_BAND}>
            <EmployeeDashboardHeader
              greeting={{
                employeeId,
                firstName,
                lastName,
                fullName: `${firstName} ${lastName}`.trim(),
                employeeCode,
                designation: null,
                departmentName: null,
                avatarUrl: null,
              }}
            />
          </div>

          <div className={DASHBOARD_HOME_BAND}>
            <CeoDashboardKpis kpis={data.kpis} />
          </div>

          <div className={DASHBOARD_HOME_MAIN_GRID}>
            <div className={DASHBOARD_HOME_LEFT_STACK}>
              <div className="grid w-full min-w-0 shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:items-stretch">
                <CeoDashboardToday attendance={data.attendance} />
                <CeoDashboardPipeline recruitment={data.recruitment} />
              </div>
              <DailyBoostCard
                firstName={firstName}
                lastName={lastName}
                personKey={employeeId}
                referenceDate={referenceDate}
                tone="executive"
                className={DASHBOARD_HOME_BOOST}
              />
            </div>
            <EmployeeUpcomingEvents
              events={data.upcomingHolidays ?? []}
              referenceDate={referenceDate}
              canManageAnnouncements={data.canManageAnnouncements === true}
              pairHolidayBirthday
              showImportantNotices
              className={DASHBOARD_HOME_EVENTS}
            />
          </div>
        </div>
      </div>
    </ClientSectionBoundary>
  );
}
