"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState, useTransition, type ReactNode } from "react";

import { Button, buttonVariants, POLICY_HEADER_BUTTON_CLASS } from "@/components/common/button";
import { EmployeeAttendanceHistoryTable } from "@/components/employee/attendance/employee-attendance-history-table";
import { SelfAttendanceLiveProvider, useSelfAttendanceLive } from "@/components/attendance/self-attendance-live-context";
import { SelfAttendanceTodayCard } from "@/components/attendance/self-attendance-today-card";
import { ManagerAttendanceCalendar } from "@/components/manager/profile/manager-attendance-calendar";
import { ManagerProfileSummaryCards } from "@/components/manager/profile/manager-profile-summary-cards";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { cn } from "@/lib/utils";
import type { ManagerProfilePageData } from "@/types/manager-self-attendance";

import { MyLeaveSelfServiceView, type MyLeaveSelfServiceProps, type LeaveWorkspaceParts } from "@/components/leave/my-leave-self-service-view";
import {
  attendanceWorkspaceQuery,
  normalizeAttendanceStatusFilter,
} from "@/lib/attendance/attendance-leave-navigation";

type Props = {
  leave?: MyLeaveSelfServiceProps | null;
  data: ManagerProfilePageData;
  status?: string;
  searchDate?: string;
  /** Base path for calendar/history filters. Defaults to employee portal attendance. */
  basePath?: string;
  policyHref?: string;
  title?: string;
  description?: string;
  /** When false, omit the outer employee-portal padding wrapper. */
  padded?: boolean;
  showPageHeading?: boolean;
  /** Keeps the hub tab in the URL when filtering calendar/history. */
  /** When false, policy link is rendered by a parent hub header instead. */
  showPolicyLink?: boolean;
  tabQuery?: string;
};

export function EmployeeAttendanceView({
  data,
  leave,
  status,
  searchDate,
  basePath = EMPLOYEE_ROUTES.attendance,
  policyHref,
  title = "My Attendance",
  description = "Your personal attendance, identity, and regularization requests.",
  padded = true,
  showPageHeading = true,
  showPolicyLink = true,
  tabQuery,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isNavigating, startNavigation] = useTransition();
  const historyTab = searchParams.get("history") === "leave" ? "leave" : "attendance";
  useEffect(() => {
    const currentStatus = searchParams.get("status") ?? undefined;
    if (!currentStatus || normalizeAttendanceStatusFilter(currentStatus)) return;

    const query = attendanceWorkspaceQuery(searchParams.toString(), {
      status: undefined,
    });
    window.history.replaceState(null, "", query ? `${basePath}?${query}` : basePath);
  }, [basePath, searchParams]);

  function setHistoryTab(value: "attendance" | "leave") {
    const query = attendanceWorkspaceQuery(searchParams.toString(), { history: value });
    window.history.replaceState(null, "", `${basePath}?${query}`);
  }
  const [selectedDate, setSelectedDate] = useState<string | null>(data.selectedDate);
  useEffect(() => setSelectedDate(data.selectedDate), [data.selectedDate]);

  function pushParams(next: {
    month: number;
    year: number;
    date?: string | null;
    status?: string;
    searchDate?: string;
    page?: number;
  }) {
    const query = attendanceWorkspaceQuery(searchParams.toString(), {
      ...next, date: next.date, status: next.status, searchDate: next.searchDate,
      page: next.page && next.page > 1 ? next.page : undefined,
      ...(tabQuery ? { tab: tabQuery } : {}),
    });
    startNavigation(() => router.push(`${basePath}?${query}`, { scroll: false }));
  }

  const pageHeading = (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{leave ? "Your attendance, leave balances, and monthly history." : description}</p>
    </div>
  );
  const policyActions = <>
    {leave?.policyHref ? <Link href={leave.policyHref} className={cn(buttonVariants({ variant: "outline" }), POLICY_HEADER_BUTTON_CLASS, "gap-1.5")}><FileText className="size-4" />Leave Policy</Link> : null}
    {policyHref && showPolicyLink ? <Link href={policyHref} className={cn(buttonVariants({ variant: "outline" }), POLICY_HEADER_BUTTON_CLASS, "gap-1.5")}><FileText className="size-4" />Attendance Policy</Link> : null}
  </>;

  const renderWorkspace = (leaveParts?: LeaveWorkspaceParts) => (
    <div className="flex flex-col gap-4" aria-busy={isNavigating}>
      {!leaveParts && showPageHeading ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          {pageHeading}
          <div className="flex flex-wrap items-center gap-2">{policyActions}</div>
        </div>
      ) : !leaveParts && !showPageHeading ? <div className="flex justify-end gap-2">{policyActions}</div> : null}

      <AttendanceLiveBody
        leaveParts={leaveParts}
        heading={leaveParts && showPageHeading ? pageHeading : undefined}
        historyActions={leaveParts ? policyActions : undefined}
        historyTab={historyTab}
        onHistoryTabChange={setHistoryTab}
        data={data}
        basePath={basePath}
        selectedDate={selectedDate}
        status={status}
        searchDate={searchDate}
        onMonthChange={(month, year) =>
          pushParams({ month, year, date: selectedDate, status, searchDate })
        }
        onSelectDate={(date) => {
          setSelectedDate(date);
          pushParams({
            month: data.month,
            year: data.year,
            date,
            status,
            searchDate,
          });
        }}
        onHistoryFilterChange={(filters) =>
          pushParams({
            month: filters.month,
            year: filters.year,
            date: selectedDate,
            status: filters.status,
            searchDate: filters.searchDate,
            page: filters.page,
          })
        }
      />
    </div>
  );

  const content = (
    <SelfAttendanceLiveProvider today={data.today} calendarDays={data.calendarDays}>
      {leave ? <MyLeaveSelfServiceView {...leave} policyHref={undefined} renderWorkspace={renderWorkspace}
        onHistorySelect={() => setHistoryTab("leave")}
        onPeriodChange={(month, year) => pushParams({ month, year, date: selectedDate, status, searchDate })}
      /> : renderWorkspace()}
    </SelfAttendanceLiveProvider>
  );

  if (!padded) return <div className={cn(leave && "attendance-leave-workspace")}>{content}</div>;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5", leave && "attendance-leave-workspace")}>
      {content}
    </div>
  );
}

function AttendanceLiveBody({
  leaveParts,
  heading,
  historyActions,
  historyTab,
  onHistoryTabChange,
  data,
  basePath,
  selectedDate,
  status,
  searchDate,
  onMonthChange,
  onSelectDate,
  onHistoryFilterChange,
}: {
  leaveParts?: LeaveWorkspaceParts;
  heading?: ReactNode;
  historyActions?: ReactNode;
  historyTab: "attendance" | "leave";
  onHistoryTabChange: (value: "attendance" | "leave") => void;
  data: ManagerProfilePageData;
  basePath: string;
  selectedDate: string | null;
  status?: string;
  searchDate?: string;
  onMonthChange: (month: number, year: number) => void;
  onSelectDate: (date: string) => void;
  onHistoryFilterChange: (filters: {
    month: number;
    year: number;
    status?: string;
    searchDate?: string;
    page: number;
  }) => void;
}) {
  const live = useSelfAttendanceLive();
  const historyId = useId();
  const summary = {
    ...data.summary,
    leave: live.calendarDays.filter(
      (day) => day.inMonth && day.status === "on_leave",
    ).length,
  };

  return (
    <>
      {heading ? <div>{heading}</div> : null}
      <SelfAttendanceTodayCard
        firstName={data.profileCard.firstName}
        today={live.today}
        allowUpdateCheckout
        compact={Boolean(leaveParts)}
        extraActions={leaveParts?.actions}
      />

      <div className="grid gap-3 xl:min-h-[min(32rem,calc(100dvh-16rem))] xl:grid-cols-[minmax(0,1fr)_12.5rem] xl:items-stretch">
        <ManagerAttendanceCalendar
          days={live.calendarDays}
          leaveCalendar={leaveParts?.calendarData}
          month={data.month}
          year={data.year}
          selectedDate={selectedDate}
          onMonthChange={onMonthChange}
          onSelectDate={onSelectDate}
        />
        {leaveParts ? (
          <aside aria-label="Working hours and leave balances" className="grid grid-cols-2 gap-3 xl:grid-cols-1 xl:grid-rows-4">
            <div className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl border bg-card px-4 py-3 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Working Hours</p>
              <p className="text-2xl font-semibold leading-tight tracking-tight tabular-nums">{live.workingHoursLabel}</p>
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
            {leaveParts.balances}
          </aside>
        ) : <ManagerProfileSummaryCards
          summary={summary}
          today={{
            workingHoursLabel: live.workingHoursLabel,
            checkInAt: live.today.checkInAt,
            checkOutAt: live.today.checkOutAt,
          }}
          layout="sidebar"
          className="w-full"
        />}
      </div>

      {leaveParts ? <div className="flex flex-wrap items-center justify-between gap-3">
      <div role="tablist" aria-label="Monthly history" className="flex w-fit max-w-full gap-1 rounded-xl border bg-muted/50 p-1">
        {(["attendance", "leave"] as const).map((tab) => <Button key={tab} type="button" role="tab"
          id={`${historyId}-${tab}-tab`} aria-controls={`${historyId}-${tab}-panel`} aria-selected={historyTab === tab}
          tabIndex={historyTab === tab ? 0 : -1}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === "Home" ? "attendance" : event.key === "End" ? "leave" : tab === "attendance" ? "leave" : "attendance";
            onHistoryTabChange(next);
            document.getElementById(`${historyId}-${next}-tab`)?.focus();
          }}
          variant="ghost" className={cn("rounded-lg px-4", historyTab === tab && "bg-background shadow-sm")}
          onClick={() => onHistoryTabChange(tab)}>{tab === "attendance" ? "Attendance History" : "Leave History"}</Button>)}
      </div>
      <div className="flex flex-wrap items-center gap-2">{historyActions}</div>
      </div> : null}
      <div id={leaveParts ? `${historyId}-attendance-panel` : "attendance-history"} role={leaveParts ? "tabpanel" : undefined}
        aria-labelledby={leaveParts ? `${historyId}-attendance-tab` : undefined} hidden={Boolean(leaveParts) && historyTab !== "attendance"}>
        <EmployeeAttendanceHistoryTable
          history={data.history}
          month={data.month}
          year={data.year}
          status={status}
          searchDate={searchDate}
          attendanceBasePath={basePath}
          onFilterChange={onHistoryFilterChange}
        />
      </div>
      {leaveParts ? <div role="tabpanel" id={`${historyId}-leave-panel`} aria-labelledby={`${historyId}-leave-tab`} hidden={historyTab !== "leave"}>{leaveParts.history}</div> : null}
    </>
  );
}
