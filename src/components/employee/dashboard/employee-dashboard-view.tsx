"use client";

import { useEffect, useRef, useState } from "react";

import { EmployeeAttendanceWidget } from "@/components/employee/dashboard/employee-attendance-widget";
import { EmployeeDailyQuoteCard } from "@/components/employee/dashboard/employee-daily-quote-card";
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
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const [pairedColumnHeight, setPairedColumnHeight] = useState<number | null>(null);

  useEffect(() => {
    const leftColumn = leftColumnRef.current;
    if (!leftColumn) return;

    const syncPairedHeight = () => {
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      setPairedColumnHeight(isDesktop ? leftColumn.getBoundingClientRect().height : null);
    };

    const observer = new ResizeObserver(syncPairedHeight);
    observer.observe(leftColumn);
    window.addEventListener("resize", syncPairedHeight);
    syncPairedHeight();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncPairedHeight);
    };
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-4 md:p-5">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[88rem] flex-col gap-4 overflow-hidden md:gap-5">
        <EmployeeDashboardHeader greeting={greeting} />

        <EmployeeDashboardKpiCards kpis={kpis} />

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[3fr_2fr] lg:items-stretch">
          <div ref={leftColumnRef} className="flex min-h-0 flex-col gap-3">
            <EmployeeAttendanceWidget today={today} />
            <EmployeeDailyQuoteCard
              name={greeting.firstName}
              referenceDate={referenceDate}
              className="min-h-[12rem]"
            />
          </div>

          <div
            className="flex min-h-0 flex-col"
            style={pairedColumnHeight ? { height: pairedColumnHeight } : undefined}
          >
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
