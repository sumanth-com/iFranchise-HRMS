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
  Eye,
  FileText,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/common/button";
import {
  DataTable,
  DATA_TABLE_SPLIT_SCROLL_MAX_HEIGHT,
  type DataTableColumn,
} from "@/components/common/data-table";
import { EmployeeStatCard } from "@/components/employee/dashboard/employee-module-primitives";
import { EmployeeLeaveCalendar } from "@/components/employee/leave/employee-leave-calendar";
import { ApplyLeaveDialog } from "@/components/leave/apply-leave-dialog";
import { LeaveStatusBadge } from "@/components/leave/leave-status-badge";
import { MyLeaveDetailPopup } from "@/components/leave/my-leave-detail-popup";
import { formatLeaveDate } from "@/lib/leave/services/leave-utils";
import { cn } from "@/lib/utils";
import type {
  LeaveCalendarEntry,
  LeaveEmployeeBalanceSnapshot,
  LeaveHolidayEntry,
  LeaveListItem,
  LeaveLookups,
} from "@/types/leave";
import type { LeaveCalendarContext } from "@/lib/leave/services/leave-calendar-engine";

type Props = {
  title?: string;
  description?: string;
  policyHref?: string;
  canApply: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  employeeId?: string;
  applyLeaveLookups?: LeaveLookups | null;
  balances: LeaveEmployeeBalanceSnapshot[];
  requests: LeaveListItem[];
  calendarMonth: number;
  calendarYear: number;
  calendarLeaves: LeaveCalendarEntry[];
  calendarHolidays: LeaveHolidayEntry[];
  calendarContext?: LeaveCalendarContext;
  showPageHeading?: boolean;
};

export function MyLeaveSelfServiceView({
  title = "My Leave",
  description = "Your leave balances and request history.",
  policyHref,
  canApply,
  canEdit = false,
  canDelete = false,
  employeeId,
  applyLeaveLookups,
  balances,
  requests,
  calendarMonth,
  calendarYear,
  calendarLeaves,
  calendarHolidays,
  calendarContext,
  showPageHeading = true,
}: Props) {
  const router = useRouter();
  const [applyOpen, setApplyOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewPreview, setViewPreview] = useState<LeaveListItem | null>(null);
  const canOpenApplyDialog = canApply && employeeId && applyLeaveLookups;

  const roundDays = (value: number) => Math.round(value * 100) / 100;

  const totalBalance = balances.reduce((sum, row) => sum + row.balanceDays, 0);
  const totalUsed = balances.reduce((sum, row) => sum + row.usedDays, 0);
  const pendingFromBalances = balances.reduce((sum, row) => sum + row.pendingDays, 0);

  const pendingRequestsList = requests.filter((row) => row.leaveStatus === "pending");
  const pendingRequestCount = pendingRequestsList.length;
  const pendingDaysFromRequests = pendingRequestsList.reduce(
    (sum, row) => sum + Number(row.totalDays ?? 0),
    0,
  );
  // Prefer live request totals so the cards match calendar / My Requests.
  // Fall back to balance ledger when the request list is empty but balances still show holds.
  const totalPendingDays =
    pendingRequestCount > 0 ? pendingDaysFromRequests : pendingFromBalances;

  const today = format(new Date(), "yyyy-MM-dd");
  const upcomingLeave = requests
    .filter((row) => row.leaveStatus === "approved" && row.startDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

  const availableHint =
    balances
      .filter((row) => row.balanceDays > 0)
      .map((row) => `${row.leaveTypeCode} ${roundDays(row.balanceDays)}`)
      .join(" · ") || "No days left";

  const pendingValue =
    pendingRequestCount > 0
      ? `${pendingRequestCount} ${pendingRequestCount === 1 ? "request" : "requests"}`
      : "None";
  const pendingHint =
    pendingRequestCount > 0
      ? `${roundDays(totalPendingDays)} ${roundDays(totalPendingDays) === 1 ? "day" : "days"} waiting`
      : "Nothing waiting";

  function openLeavePopup(row: LeaveListItem) {
    setViewPreview(row);
    setViewOpen(true);
  }

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
    {
      key: "actions",
      header: "",
      className: "w-[1%] whitespace-nowrap text-right",
      render: (row) => (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="View leave"
            onClick={() => openLeavePopup(row)}
          >
            <Eye className="size-4" />
          </Button>
        </div>
      ),
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
          label="Available"
          value={`${roundDays(totalBalance)} days`}
          icon={CalendarCheck}
          accent="text-indigo-600 dark:text-indigo-400"
          iconBg="bg-indigo-500/10"
          hint={availableHint}
        />
        <EmployeeStatCard
          label="Used"
          value={`${roundDays(totalUsed)} days`}
          icon={CalendarDays}
          accent="text-sky-600 dark:text-sky-400"
          iconBg="bg-sky-500/10"
          hint="Taken this year"
        />
        <EmployeeStatCard
          label="Pending"
          value={pendingValue}
          icon={CalendarClock}
          accent="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-500/10"
          hint={pendingHint}
        />
        <EmployeeStatCard
          label="Next leave"
          value={upcomingLeave ? formatLeaveDate(upcomingLeave.startDate) : "None"}
          icon={CalendarCheck}
          accent="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-500/10"
          hint={upcomingLeave ? upcomingLeave.leaveTypeName : "Nothing scheduled"}
        />
      </div>

      <EmployeeLeaveCalendar
        initialMonth={calendarMonth}
        initialYear={calendarYear}
        initialLeaves={calendarLeaves}
        initialHolidays={calendarHolidays}
        initialCalendar={calendarContext}
      />

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold tracking-tight">My Requests</h2>
        <DataTable
          columns={columns}
          data={requests}
          emptyMessage="You haven't submitted any leave requests yet."
          scrollable
          maxHeightClass={DATA_TABLE_SPLIT_SCROLL_MAX_HEIGHT}
        />
      </section>

      <MyLeaveDetailPopup
        leaveRequestId={viewPreview?.id ?? null}
        preview={viewPreview}
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) setViewPreview(null);
        }}
        lookups={applyLeaveLookups}
        canEdit={canEdit}
        canDelete={canDelete}
        onActionComplete={() => router.refresh()}
      />

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
