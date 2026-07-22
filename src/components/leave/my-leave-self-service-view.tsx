import Link from "next/link";
import { CalendarCheck, CalendarClock, CalendarPlus, CalendarX, FileText } from "lucide-react";

import { buttonVariants } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmployeeStatCard } from "@/components/employee/dashboard/employee-module-primitives";
import { EmployeeLeaveCalendar } from "@/components/employee/leave/employee-leave-calendar";
import { LeaveStatusBadge } from "@/components/leave/leave-status-badge";
import { formatLeaveDate } from "@/lib/leave/services/leave-utils";
import { cn } from "@/lib/utils";
import type {
  LeaveCalendarEntry,
  LeaveEmployeeBalanceSnapshot,
  LeaveHolidayEntry,
  LeaveListItem,
} from "@/types/leave";

type Props = {
  title?: string;
  description?: string;
  applyHref: string;
  policyHref?: string;
  canApply: boolean;
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
  applyHref,
  policyHref,
  canApply,
  balances,
  requests,
  calendarMonth,
  calendarYear,
  calendarLeaves,
  calendarHolidays,
  showPageHeading = true,
}: Props) {
  const totalBalance = balances.reduce((sum, row) => sum + row.balanceDays, 0);
  const pending = requests.filter((row) => row.leaveStatus === "pending").length;
  const approved = requests.filter((row) => row.leaveStatus === "approved").length;

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
          <Link href={applyHref} className={cn(buttonVariants(), "gap-1.5")}>
            <CalendarPlus className="size-4" />
            Apply Leave
          </Link>
        ) : null}
      </div>
    ) : null;

  return (
    <div className="space-y-4">
      {showPageHeading ? (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          {headerActions}
        </div>
      ) : headerActions ? (
        <div className="flex justify-end">{headerActions}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <EmployeeStatCard
          label="Available Balance"
          value={`${Math.round(totalBalance * 100) / 100} days`}
          icon={CalendarCheck}
          accent="text-indigo-600 dark:text-indigo-400"
          iconBg="bg-indigo-500/10"
        />
        <EmployeeStatCard
          label="Pending"
          value={String(pending)}
          icon={CalendarClock}
          accent="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-500/10"
        />
        <EmployeeStatCard
          label="Approved"
          value={String(approved)}
          icon={CalendarX}
          accent="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-500/10"
        />
      </div>

      {balances.length > 0 ? (
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold tracking-tight">Leave Balances</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {balances.map((balance) => (
              <div key={balance.leaveTypeCode} className="rounded-lg border bg-muted/20 px-3 py-2">
                <p className="text-sm font-medium">{balance.leaveTypeName}</p>
                <p className="text-xs text-muted-foreground">
                  {balance.balanceDays} available · {balance.usedDays} used · {balance.pendingDays}{" "}
                  pending
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

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
    </div>
  );
}
