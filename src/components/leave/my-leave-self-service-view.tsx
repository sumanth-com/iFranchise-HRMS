"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { format } from "date-fns";
import { CalendarDays, CalendarPlus, Eye, FileText, type LucideIcon } from "lucide-react";

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
import {
  LEAVE_BALANCE_CARD_TONES,
  LEAVE_BALANCE_DISPLAY_CODES,
  LEAVE_BALANCE_DISPLAY_LABELS,
} from "@/lib/leave/constants";
import { formatLeaveDayCount } from "@/lib/leave/services/leave-usage";
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

type LeaveSummaryCard = {
  key: string;
  label: string;
  value: string;
  icon: LucideIcon;
  tone: (typeof LEAVE_BALANCE_CARD_TONES)[(typeof LEAVE_BALANCE_DISPLAY_CODES)[number]];
};

function buildLeaveSummaryCards(balances: LeaveEmployeeBalanceSnapshot[]): LeaveSummaryCard[] {
  const remainingByCode = new Map(
    balances.map((row) => [row.leaveTypeCode, row] as const),
  );

  return LEAVE_BALANCE_DISPLAY_CODES.map((code) => {
    const row = remainingByCode.get(code);
    const used = row?.monthUsedDays ?? 0;
    const total = row?.monthTotalDays ?? 0;
    return {
      key: code,
      label: row?.leaveTypeName || LEAVE_BALANCE_DISPLAY_LABELS[code],
      value: `${formatLeaveDayCount(used)} / ${formatLeaveDayCount(total)}`,
      icon: CalendarDays,
      tone: LEAVE_BALANCE_CARD_TONES[code],
    };
  });
}

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

  const remainingCards = buildLeaveSummaryCards(balances);

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

      {remainingCards.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {format(new Date(calendarYear, calendarMonth - 1, 1), "MMMM yyyy")} · used this month / total
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {remainingCards.map((card) => (
              <EmployeeStatCard
                key={card.key}
                label={card.label}
                value={card.value}
                icon={card.icon}
                accent={card.tone.accent}
                iconBg={card.tone.iconBg}
              />
            ))}
          </div>
        </div>
      ) : null}

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
          balances={balances}
        />
      ) : null}
    </div>
  );
}
