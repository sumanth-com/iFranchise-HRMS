"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  FileText,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmployeeStatCard } from "@/components/employee/dashboard/employee-module-primitives";
import { EmployeeLeaveCalendar } from "@/components/employee/leave/employee-leave-calendar";
import { ApplyLeaveDialog } from "@/components/leave/apply-leave-dialog";
import { LeaveStatusBadge } from "@/components/leave/leave-status-badge";
import { formatLeaveDate } from "@/lib/leave/services/leave-utils";
import { cn } from "@/lib/utils";
import type {
  LeaveCalendarEntry,
  LeaveEmployeeBalanceSnapshot,
  LeaveHolidayEntry,
  LeaveListItem,
  LeaveLookups,
} from "@/types/leave";

type Props = {
  title?: string;
  description?: string;
  policyHref?: string;
  canApply: boolean;
  employeeId?: string;
  applyLeaveLookups?: LeaveLookups | null;
  balances: LeaveEmployeeBalanceSnapshot[];
  requests: LeaveListItem[];
  calendarMonth: number;
  calendarYear: number;
  calendarLeaves: LeaveCalendarEntry[];
  calendarHolidays: LeaveHolidayEntry[];
  showPageHeading?: boolean;
};

export function MyLeaveSelfServiceView({
  title = "My Leave",
  description = "Your leave balances and request history.",
  policyHref,
  canApply,
  employeeId,
  applyLeaveLookups,
  balances,
  requests,
  calendarMonth,
  calendarYear,
  calendarLeaves,
  calendarHolidays,
  showPageHeading = true,
}: Props) {
  const router = useRouter();
  const [applyOpen, setApplyOpen] = useState(false);
  const canOpenApplyDialog = canApply && employeeId && applyLeaveLookups;
  const totalBalance = balances.reduce((sum, row) => sum + row.balanceDays, 0);
  const totalUsed = balances.reduce((sum, row) => sum + row.usedDays, 0);
  const totalPendingDays = balances.reduce((sum, row) => sum + row.pendingDays, 0);
  const pendingRequests = requests.filter((row) => row.leaveStatus === "pending").length;

  const today = format(new Date(), "yyyy-MM-dd");
  const upcomingLeave = requests
    .filter((row) => row.leaveStatus === "approved" && row.startDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const upcomingLeaveLabel = upcomingLeave
    ? upcomingLeave.startDate === upcomingLeave.endDate
      ? formatLeaveDate(upcomingLeave.startDate)
      : `${formatLeaveDate(upcomingLeave.startDate)} – ${formatLeaveDate(upcomingLeave.endDate)}`
    : "None scheduled";

  const columns: DataTableColumn<LeaveListItem>[] = [
    { key: "leaveTypeName", header: "Leave Type" },
    {
      key: "dates",
      header: "Dates",
      render: (row) => (
        <span className="whitespace-nowrap text-sm">
          {row.startDate === row.endDate
            ? formatLeaveDate(row.startDate)
            : `${formatLeaveDate(row.startDate)} – ${formatLeaveDate(row.endDate)}`}
        </span>
      ),
    },
    { key: "totalDays", header: "Days", render: (row) => String(row.totalDays) },
    {
      key: "leaveStatus",
      header: "Status",
      render: (row) => <LeaveStatusBadge status={row.leaveStatus} />,
    },
    {
      key: "appliedAt",
      header: "Applied",
      render: (row) => formatLeaveDate(row.appliedAt),
    },
  ];

  const headerActions =
    policyHref || canApply ? (
      <div className="flex shrink-0 items-center gap-2">
        {policyHref ? (
          <Link
            href={policyHref}
            className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
          >
            <FileText className="size-4" />
            Leave Policy
          </Link>
        ) : null}
        {canApply ? (
          canOpenApplyDialog ? (
            <Button type="button" className="gap-1.5" onClick={() => setApplyOpen(true)}>
              <CalendarPlus className="size-4" />
              Apply Leave
            </Button>
          ) : null
        ) : null}
      </div>
    ) : null;

  return (
    <div className="space-y-4">
      {showPageHeading ? (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {headerActions}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <EmployeeStatCard
          label="Available Balance"
          value={`${Math.round(totalBalance * 100) / 100} days`}
          icon={CalendarCheck}
          accent="text-indigo-600 dark:text-indigo-400"
          iconBg="bg-indigo-500/10"
          hint="Days you can still apply for"
        />
        <EmployeeStatCard
          label="Days Used"
          value={`${Math.round(totalUsed * 100) / 100} days`}
          icon={CalendarDays}
          accent="text-sky-600 dark:text-sky-400"
          iconBg="bg-sky-500/10"
          hint="Approved leave taken this year"
        />
        <EmployeeStatCard
          label="Pending Approval"
          value={String(pendingRequests)}
          icon={CalendarClock}
          accent="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-500/10"
          hint={
            totalPendingDays > 0
              ? `${Math.round(totalPendingDays * 100) / 100} days awaiting HR`
              : "Requests awaiting HR"
          }
        />
        <EmployeeStatCard
          label="Upcoming Leave"
          value={upcomingLeave ? formatLeaveDate(upcomingLeave.startDate) : "—"}
          icon={CalendarCheck}
          accent="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-500/10"
          hint={upcomingLeave ? upcomingLeave.leaveTypeName : upcomingLeaveLabel}
        />
      </div>

      <EmployeeLeaveCalendar
        initialMonth={calendarMonth}
        initialYear={calendarYear}
        initialLeaves={calendarLeaves}
        initialHolidays={calendarHolidays}
      />

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold tracking-tight">My Requests</h2>
        <DataTable
          columns={columns}
          data={requests}
          emptyMessage="You haven't submitted any leave requests yet."
        />
      </section>

      {showPageHeading && applyLeaveLookups && employeeId ? (
        <ApplyLeaveDialog
          open={applyOpen}
          onOpenChange={setApplyOpen}
          lookups={applyLeaveLookups}
          employeeId={employeeId}
          onSubmitted={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}
