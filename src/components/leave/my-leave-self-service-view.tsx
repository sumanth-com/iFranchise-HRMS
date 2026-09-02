"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CalendarPlus, Eye, FileText, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/common/button";
import {
  DataTable,
  DATA_TABLE_LEAVE_REQUESTS_MAX_HEIGHT,
  type DataTableColumn,
} from "@/components/common/data-table";
import { EmployeeLeaveCalendar } from "@/components/employee/leave/employee-leave-calendar";
import { ApplyLeaveDialog } from "@/components/leave/apply-leave-dialog";
import { LeaveBalanceSummaryCards } from "@/components/leave/leave-balance-summary-cards";
import { OptionalHolidaysDialog } from "@/components/leave/optional-holidays-dialog";
import { LeaveStatusBadge } from "@/components/leave/leave-status-badge";
import { MyLeaveDetailPopup } from "@/components/leave/my-leave-detail-popup";
import {
  getEmployeeLeaveAnnualBalancesAction,
  getEmployeeLeaveSelfServiceMonthAction,
} from "@/lib/employee/actions/employee-leave-actions";
import {
  clearStaleServerActionReloadFlag,
  runServerActionSafely,
} from "@/lib/errors/stale-server-action";
import { LEAVE_BALANCE_DISPLAY_LABELS } from "@/lib/leave/constants";
import { isOptionalHolidayCode } from "@/lib/leave/optional-holiday";
import {
  DEFAULT_LEAVE_CALENDAR,
  type LeaveCalendarContext,
} from "@/lib/leave/services/leave-calendar-engine";
import { formatLeaveBalanceUsedTotal } from "@/lib/leave/leave-balance-display";
import {
  formatLeaveDayCount,
  resolveLeaveDurationBreakdown,
  roundLeaveDays,
} from "@/lib/leave/services/leave-usage";
import {
  formatLeaveDate,
  formatLeaveMonthYear,
  getMonthDateRange,
} from "@/lib/leave/services/leave-utils";
import { cn } from "@/lib/utils";
import type {
  LeaveCalendarEntry,
  LeaveEmployeeBalanceSnapshot,
  LeaveHolidayEntry,
  LeaveListItem,
  LeaveLookups,
} from "@/types/leave";

type HistoryRow = LeaveListItem & {
  rowKey: string;
  sourceRequestId: string;
  dayLabel?: string | null;
};

function requestMatchesLeaveType(
  row: LeaveListItem,
  selectedCode: string,
  selectedLabel: string | null,
) {
  const rowCode = (row.leaveTypeCode || "").toUpperCase();
  if (rowCode && rowCode === selectedCode) return true;
  if (selectedLabel && row.leaveTypeName.trim() === selectedLabel) return true;
  return false;
}

function normalizeBalanceSnapshots(
  value: LeaveEmployeeBalanceSnapshot[] | null | undefined,
): LeaveEmployeeBalanceSnapshot[] {
  return Array.isArray(value) ? value : [];
}

function normalizeCalendarContext(
  value: LeaveCalendarContext | null | undefined,
): LeaveCalendarContext {
  if (!value || typeof value !== "object") return DEFAULT_LEAVE_CALENDAR;
  return {
    ...DEFAULT_LEAVE_CALENDAR,
    ...value,
    holidays: Array.isArray(value.holidays) ? value.holidays : DEFAULT_LEAVE_CALENDAR.holidays,
    weekendRules: value.weekendRules ?? DEFAULT_LEAVE_CALENDAR.weekendRules,
    sandwich: value.sandwich ?? DEFAULT_LEAVE_CALENDAR.sandwich,
  };
}

type MonthPayload = {
  leaves: LeaveCalendarEntry[];
  holidays: LeaveHolidayEntry[];
  calendar: LeaveCalendarContext;
  requests: LeaveListItem[];
};

function normalizeMonthPayload(
  data: Partial<MonthPayload> | null | undefined,
): MonthPayload {
  return {
    leaves: Array.isArray(data?.leaves) ? data.leaves : [],
    holidays: Array.isArray(data?.holidays) ? data.holidays : [],
    calendar: normalizeCalendarContext(data?.calendar),
    requests: Array.isArray(data?.requests) ? data.requests : [],
  };
}

function requestsForMonth(
  items: LeaveListItem[] | null | undefined,
  month: number,
  year: number,
) {
  const range = getMonthDateRange(month, year);
  return (items ?? []).filter((row) => {
    const start = row.startDate.slice(0, 10);
    const end = row.endDate.slice(0, 10);
    return start <= range.end && end >= range.start;
  });
}

/** One history row per counted leave day so card totals (e.g. 4/12) match the list. */
function expandRequestsToDayRows(
  items: LeaveListItem[],
  month: number,
  year: number,
  calendar?: LeaveCalendarContext,
): HistoryRow[] {
  const range = getMonthDateRange(month, year);
  const cal = calendar ?? DEFAULT_LEAVE_CALENDAR;
  const rows: HistoryRow[] = [];

  for (const request of items) {
    const start = request.startDate.slice(0, 10);
    const end = request.endDate.slice(0, 10);
    const breakdown = resolveLeaveDurationBreakdown(
      {
        startDate: start,
        endDate: end,
        isHalfDay: request.isHalfDay,
        durationBreakdown: request.durationBreakdown,
      },
      cal,
    );

    const monthDays = (breakdown.days ?? []).filter(
      (day) => day.date >= range.start && day.date <= range.end && day.counted > 0,
    );

    if (monthDays.length === 0) {
      if (start <= range.end && end >= range.start) {
        rows.push({
          ...request,
          rowKey: request.id,
          sourceRequestId: request.id,
          startDate: start,
          endDate: end,
        });
      }
      continue;
    }

    for (const day of monthDays) {
      rows.push({
        ...request,
        rowKey: `${request.id}:${day.date}`,
        sourceRequestId: request.id,
        startDate: day.date,
        endDate: day.date,
        totalDays: day.counted,
        dayLabel:
          day.kind === "half_day"
            ? "Half"
            : day.kind === "sandwich"
              ? "Sandwich"
              : null,
      });
    }
  }

  return rows.sort((a, b) => {
    if (a.startDate !== b.startDate) return a.startDate < b.startDate ? -1 : 1;
    return a.rowKey < b.rowKey ? -1 : 1;
  });
}

function formatHistoryDayCount(value: number) {
  const rounded = roundLeaveDays(value);
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
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
  /** Pin Leave Policy / Apply Leave under the portal header while the rest of the page scrolls. */
  stickyHeader?: boolean;
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
  stickyHeader = false,
}: Props) {
  const router = useRouter();
  const [applyOpen, setApplyOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewPreview, setViewPreview] = useState<LeaveListItem | null>(null);
  const [viewMode, setViewMode] = useState<"view" | "edit" | "delete">("view");
  const [month, setMonth] = useState(calendarMonth);
  const [year, setYear] = useState(calendarYear);
  const [leaves, setLeaves] = useState(calendarLeaves ?? []);
  const [holidays, setHolidays] = useState(calendarHolidays ?? []);
  const [calendar, setCalendar] = useState(() => normalizeCalendarContext(calendarContext));
  const [monthRequests, setMonthRequests] = useState(requests ?? []);
  const [annualBalances, setAnnualBalances] = useState(() => normalizeBalanceSnapshots(balances));
  const [annualBalanceYear, setAnnualBalanceYear] = useState(calendarYear);
  const [selectedLeaveTypeCode, setSelectedLeaveTypeCode] = useState<string | null>(null);
  const [optionalHolidayOpen, setOptionalHolidayOpen] = useState(false);
  const [isMonthPending, startMonthTransition] = useTransition();
  const historyRef = useRef<HTMLElement>(null);
  const canOpenApplyDialog = canApply && employeeId && applyLeaveLookups;
  const monthLabel = formatLeaveMonthYear(month, year);

  const monthScopedRequests = useMemo(
    () => requestsForMonth(monthRequests, month, year),
    [month, monthRequests, year],
  );

  const historyRows = useMemo(() => {
    const selectedCode = selectedLeaveTypeCode?.toUpperCase() ?? null;
    const selectedLabel = selectedCode
      ? LEAVE_BALANCE_DISPLAY_LABELS[
          selectedCode as keyof typeof LEAVE_BALANCE_DISPLAY_LABELS
        ]
      : null;

    const filtered = selectedCode
      ? monthScopedRequests.filter((row) =>
          requestMatchesLeaveType(row, selectedCode, selectedLabel ?? null),
        )
      : monthScopedRequests;

    // Card filter: expand to counted days so 4/12 shows four history lines.
    if (selectedCode) {
      return expandRequestsToDayRows(filtered, month, year, calendar);
    }

    return filtered.map((row) => ({
      ...row,
      rowKey: row.id,
      sourceRequestId: row.id,
      startDate: row.startDate.slice(0, 10),
      endDate: row.endDate.slice(0, 10),
      dayLabel: null as string | null,
    }));
  }, [calendar, month, monthScopedRequests, selectedLeaveTypeCode, year]);

  const historyDaysTotal = useMemo(
    () => roundLeaveDays(historyRows.reduce((sum, row) => sum + Number(row.totalDays || 0), 0)),
    [historyRows],
  );

  const selectedBalance = selectedLeaveTypeCode
    ? annualBalances.find(
        (row) =>
          row.leaveTypeCode.toUpperCase() === selectedLeaveTypeCode.toUpperCase(),
      )
    : undefined;
  const selectedTypeLabel =
    selectedBalance?.leaveTypeName ||
    (selectedLeaveTypeCode &&
    selectedLeaveTypeCode.toUpperCase() in LEAVE_BALANCE_DISPLAY_LABELS
      ? LEAVE_BALANCE_DISPLAY_LABELS[
          selectedLeaveTypeCode.toUpperCase() as keyof typeof LEAVE_BALANCE_DISPLAY_LABELS
        ]
      : selectedLeaveTypeCode);

  useEffect(() => {
    clearStaleServerActionReloadFlag();
  }, []);

  useEffect(() => {
    if (month !== calendarMonth || year !== calendarYear) return;
    setLeaves(calendarLeaves ?? []);
    setHolidays(calendarHolidays ?? []);
    setCalendar(normalizeCalendarContext(calendarContext));
    setMonthRequests(requests ?? []);
    setAnnualBalances(normalizeBalanceSnapshots(balances));
    setAnnualBalanceYear(calendarYear);
  }, [
    balances,
    calendarContext,
    calendarHolidays,
    calendarLeaves,
    calendarMonth,
    calendarYear,
    month,
    requests,
    year,
  ]);

  function refreshAnnualBalances(forYear: number) {
    startMonthTransition(async () => {
      const nextBalancesRaw = await runServerActionSafely(() =>
        getEmployeeLeaveAnnualBalancesAction(forYear),
      );
      if (nextBalancesRaw === null) return;
      setAnnualBalances(normalizeBalanceSnapshots(nextBalancesRaw));
      setAnnualBalanceYear(forYear);
    });
  }

  function loadMonth(nextMonth: number, nextYear: number) {
    setMonth(nextMonth);
    setYear(nextYear);
    startMonthTransition(async () => {
      try {
        const payload = await runServerActionSafely(() =>
          getEmployeeLeaveSelfServiceMonthAction(nextMonth, nextYear),
        );
        if (payload === null) return;
        const data = normalizeMonthPayload(payload);
        setLeaves(data.leaves);
        setHolidays(data.holidays);
        setCalendar(data.calendar);
        setMonthRequests(data.requests);
        if (nextYear !== annualBalanceYear) {
          const nextBalancesRaw = await runServerActionSafely(() =>
            getEmployeeLeaveAnnualBalancesAction(nextYear),
          );
          if (nextBalancesRaw === null) return;
          setAnnualBalances(normalizeBalanceSnapshots(nextBalancesRaw));
          setAnnualBalanceYear(nextYear);
        }
      } catch {
        toast.error("Could not load leave for that month.");
      }
    });
  }

  function handleSelectLeaveType(code: string) {
    if (isOptionalHolidayCode(code)) {
      setOptionalHolidayOpen(true);
      return;
    }
    const next = code.toUpperCase();
    setSelectedLeaveTypeCode((current) =>
      current?.toUpperCase() === next ? null : next,
    );
    window.requestAnimationFrame(() => {
      historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openLeavePopup(row: LeaveListItem, mode: "view" | "edit" | "delete" = "view") {
    setViewPreview(row);
    setViewMode(mode);
    setViewOpen(true);
  }

  function openHistoryPopup(row: HistoryRow, mode: "view" | "edit" | "delete" = "view") {
    const source =
      monthRequests.find((item) => item.id === row.sourceRequestId) ?? row;
    openLeavePopup(source, mode);
  }

  function canEditRow(row: LeaveListItem) {
    return canEdit && row.leaveStatus === "pending" && Boolean(applyLeaveLookups);
  }

  function canDeleteRow(row: LeaveListItem) {
    return canDelete && row.leaveStatus === "pending";
  }

  const columns: DataTableColumn<HistoryRow>[] = [
    { key: "leaveTypeName", header: "Leave Type" },
    {
      key: "dates",
      header: "Date",
      render: (row) => (
        <span className="whitespace-nowrap text-sm">
          {row.startDate === row.endDate
            ? formatLeaveDate(row.startDate)
            : `${formatLeaveDate(row.startDate)} – ${formatLeaveDate(row.endDate)}`}
          {row.dayLabel ? (
            <span className="ml-1.5 text-xs text-muted-foreground">({row.dayLabel})</span>
          ) : null}
        </span>
      ),
    },
    {
      key: "totalDays",
      header: "Days",
      render: (row) => formatHistoryDayCount(Number(row.totalDays)),
    },
    {
      key: "leaveStatus",
      header: "Status",
      render: (row) => (
        <LeaveStatusBadge
          status={row.leaveStatus}
          durationBreakdown={row.durationBreakdown}
          hrReviewRequired={row.hrReviewRequired}
          hrDecision={row.hrDecision}
        />
      ),
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
      render: (row) => {
        const source =
          monthRequests.find((item) => item.id === row.sourceRequestId) ?? row;
        return (
          <div className="flex items-center justify-end gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="View leave"
              title="View"
              onClick={() => openHistoryPopup(row, "view")}
            >
              <Eye className="size-4" />
            </Button>
            {canEditRow(source) ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Edit leave request"
                title="Edit"
                onClick={() => openHistoryPopup(row, "edit")}
              >
                <Pencil className="size-4" />
              </Button>
            ) : null}
            {canDeleteRow(source) ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Delete leave request"
                title="Delete"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => openHistoryPopup(row, "delete")}
              >
                <Trash2 className="size-4" />
              </Button>
            ) : null}
          </div>
        );
      },
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
    <div
      className={cn(
        stickyHeader ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "flex flex-col gap-4",
      )}
    >
      {showPageHeading ? (
        <div className={cn(stickyHeader && "z-20 shrink-0 pb-4")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {headerActions}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      ) : null}

      <div
        className={cn(
          stickyHeader
            ? "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain pb-4"
            : "contents",
        )}
      >
      {annualBalances.length > 0 ? (
        <LeaveBalanceSummaryCards
          balances={annualBalances}
          month={month}
          year={year}
          selectedCode={selectedLeaveTypeCode}
          onSelectCode={handleSelectLeaveType}
        />
      ) : null}

      <OptionalHolidaysDialog
        open={optionalHolidayOpen}
        onOpenChange={setOptionalHolidayOpen}
        year={year}
        remaining={
          annualBalances.find((row) => isOptionalHolidayCode(row.leaveTypeCode))?.balanceDays ?? 0
        }
      />

      <EmployeeLeaveCalendar
        month={month}
        year={year}
        leaves={leaves}
        holidays={holidays}
        calendar={calendar}
        isPending={isMonthPending}
        onMonthChange={loadMonth}
      />

      <section
        ref={historyRef}
        className="card-surface-static w-full shrink-0 rounded-2xl border bg-card p-4 shadow-sm"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">My Request & History</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {selectedLeaveTypeCode && selectedTypeLabel
                ? `${selectedTypeLabel} in ${monthLabel} · ${formatLeaveDayCount(historyDaysTotal)} day${historyDaysTotal === 1 ? "" : "s"} this month${
                    selectedBalance
                      ? ` · ${formatLeaveBalanceUsedTotal(selectedBalance)} on card (year to date)`
                      : ""
                  }.`
                : `Requests in ${monthLabel}. Click a leave card for that type’s history in this month only.`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {selectedLeaveTypeCode ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setSelectedLeaveTypeCode(null)}
              >
                Show all
              </Button>
            ) : null}
            {isMonthPending ? (
              <span className="text-xs text-muted-foreground">Loading…</span>
            ) : null}
          </div>
        </div>
        <DataTable
          columns={columns}
          data={historyRows}
          emptyMessage={
            selectedTypeLabel
              ? `No ${selectedTypeLabel} history in ${monthLabel}.`
              : `No leave requests in ${monthLabel}.`
          }
          emptyClassName="min-h-0 py-6"
          scrollable={!stickyHeader && historyRows.length > 8}
          maxHeightClass={
            stickyHeader ? undefined : DATA_TABLE_LEAVE_REQUESTS_MAX_HEIGHT
          }
        />
      </section>
      </div>

      {viewOpen && viewPreview ? (
        <MyLeaveDetailPopup
          key={`${viewPreview.id}-${viewMode}`}
          leaveRequestId={viewPreview.id}
          preview={viewPreview}
          open={viewOpen}
          initialMode={viewMode}
          onOpenChange={(nextOpen) => {
            setViewOpen(nextOpen);
            if (!nextOpen) {
              setViewPreview(null);
              setViewMode("view");
            }
          }}
          lookups={applyLeaveLookups}
          canEdit={canEdit}
          canDelete={canDelete}
          onActionComplete={() => {
            router.refresh();
            loadMonth(month, year);
            refreshAnnualBalances(year);
          }}
        />
      ) : null}

      {showPageHeading && applyLeaveLookups && employeeId ? (
        <ApplyLeaveDialog
          open={applyOpen}
          onOpenChange={setApplyOpen}
          employeeId={employeeId}
          lookups={applyLeaveLookups}
          balances={annualBalances}
          onSubmitted={() => {
            router.refresh();
            loadMonth(month, year);
            refreshAnnualBalances(year);
          }}
        />
      ) : null}
    </div>
  );
}
