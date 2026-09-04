"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import {
  AlertCircle,
  Ban,
  CalendarDays,
  CheckCircle2,
  Eye,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { LeaveStatusBadge } from "@/components/leave/leave-status-badge";
import { HrLeaveDetailPopup } from "@/components/leave/hr-leave-detail-popup";
import {
  type LeaveSummaryFilterKey,
} from "@/components/leave/leave-summary-cards";
import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import {
  TABLE_HEADER_CELL_CLASS,
  TABLE_HEADER_ROW_CLASS,
  TABLE_HEADER_STICKY_CLASS,
} from "@/components/common/table-header-classes";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  approveLeaveRequestAction,
  cancelLeaveRequestAction,
  deleteLeaveRequestAction,
  fetchLeaveRequestsAction,
  rejectLeaveRequestAction,
} from "@/lib/leave/actions";
import {
  LEAVE_ROUTES,
  LEAVE_STATUS_LABELS,
} from "@/lib/leave/constants";
import { formatCleanEmployeeName } from "@/lib/employees/parse-employee-name";
import { FILTER_ANY_VALUE } from "@/lib/manager/filter-select";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import { formatLeaveDate } from "@/lib/leave/services/leave-utils";
import { getHrmsYearSelectItems } from "@/lib/date/hrms-year";
import type {
  LeaveActionResult,
  LeaveListItem,
  LeaveListParams,
  LeaveListResult,
} from "@/types/leave";
import type { LookupOption } from "@/types/employee";
import { cn } from "@/lib/utils";

type LeaveTableProps = {
  records: LeaveListItem[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  month?: number;
  year?: number;
  leaveStatus?: string;
  leaveTypeId?: string;
  departmentId?: string;
  branchId?: string;
  reportingManagerId?: string;
  employeeId?: string;
  summaryFilter?: LeaveSummaryFilterKey;
  onSummaryFilterChange?: (key: LeaveSummaryFilterKey | undefined) => void;
  leaveTypes: LookupOption[];
  departments: LookupOption[];
  branches: LookupOption[];
  employees: LookupOption[];
  managers: LookupOption[];
  canCreate: boolean;
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
  canDelete?: boolean;
  embedded?: boolean;
  listBasePath?: string;
  fetchRecords?: (
    params: LeaveListParams,
  ) => Promise<LeaveActionResult<LeaveListResult>>;
  /** Called after approve/reject/cancel/delete so parents can refresh summary cards. */
  onMutated?: () => void;
};

const TABLE_DATA_CELL_CLASS = "whitespace-nowrap px-4 py-3";
const TABLE_ACTIONS_CELL_CLASS = "w-12 px-2 py-3 text-center";

const TABLE_CELL_CLASS = "relative align-middle";

const FILTER_CONTROL_CLASS =
  "h-10 w-max gap-2 rounded-lg bg-white whitespace-nowrap dark:bg-input [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:text-muted-foreground/70 *:data-[slot=select-value]:line-clamp-none *:data-[slot=select-value]:min-w-max *:data-[slot=select-value]:flex-none *:data-[slot=select-value]:overflow-visible *:data-[slot=select-value]:text-clip";

const MONTH_ITEMS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

function buildYearItems() {
  return getHrmsYearSelectItems();
}

function leaveStatusForSummaryFilter(
  key: LeaveSummaryFilterKey | undefined,
): LeaveListParams["leaveStatus"] | undefined {
  if (key === "pendingRequests" || key === "pendingHrReview") return "pending";
  if (key === "approvedThisMonth") return "approved";
  if (key === "rejectedThisMonth") return "rejected";
  if (key === "employeesOnLeaveToday") return "approved";
  return undefined;
}

/** Status-dropdown value used when the Upcoming Planned Leaves card is active. */
const UPCOMING_FILTER_VALUE = "upcoming_planned";

function statusSelectValue(
  summaryFilter: LeaveSummaryFilterKey | undefined,
  leaveStatus: LeaveListParams["leaveStatus"] | undefined,
) {
  if (summaryFilter === "upcomingPlannedLeaves") return UPCOMING_FILTER_VALUE;
  return leaveStatus ?? FILTER_ANY_VALUE;
}

export function LeaveTable({
  records: initialRecords,
  total: initialTotal,
  page: initialPage,
  pageSize: initialPageSize,
  search: initialSearch,
  month,
  year,
  leaveStatus,
  leaveTypeId,
  departmentId,
  branchId,
  reportingManagerId,
  employeeId,
  summaryFilter,
  onSummaryFilterChange,
  leaveTypes,
  departments,
  branches,
  employees,
  canApprove,
  canReject,
  canCancel,
  canDelete = false,
  embedded = false,
  listBasePath,
  fetchRecords = fetchLeaveRequestsAction,
  onMutated,
}: LeaveTableProps) {
  const [isPending, startTransition] = useTransition();
  const [approveTarget, setApproveTarget] = useState<LeaveListItem | null>(null);
  const [rejectTarget, setRejectTarget] = useState<LeaveListItem | null>(null);
  const [cancelTarget, setCancelTarget] = useState<LeaveListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeaveListItem | null>(null);
  const [viewLeaveId, setViewLeaveId] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [approveComments, setApproveComments] = useState("");
  const [approveError, setApproveError] = useState<string | null>(null);
  const [rejectComments, setRejectComments] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);

  function openLeavePopup(row: LeaveListItem) {
    setViewLeaveId(row.id);
    setViewOpen(true);
  }

  const resolvedListPath = listBasePath ?? LEAVE_ROUTES.list;

  useEffect(() => {
    if (!embedded && window.location.search) {
      window.history.replaceState(null, "", resolvedListPath);
    }
  }, [embedded, resolvedListPath]);

  const now = new Date();
  const defaultMonth = month ?? now.getMonth() + 1;
  const defaultYear = year ?? now.getFullYear();
  const [tableState, setTableState] = useState({
    records: initialRecords,
    total: initialTotal,
    page: initialPage,
    pageSize: initialPageSize,
  });
  const [filters, setFilters] = useState<LeaveListParams>({
    page: initialPage,
    pageSize: initialPageSize,
    search: initialSearch,
    month: defaultMonth,
    year: defaultYear,
    leaveStatus: leaveStatus as LeaveListParams["leaveStatus"],
    leaveTypeId,
    departmentId,
    branchId,
    reportingManagerId,
    employeeId,
    summaryFilter,
  });
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const currentMonth = filters.month ?? defaultMonth;
  const currentYear = filters.year ?? defaultYear;
  const today = getTodayDateString();

  const reloadTable = useCallback(
    async (nextFilters?: LeaveListParams) => {
      const result = await fetchRecords(nextFilters ?? filtersRef.current);
      if (!result.success) {
        toast.error(result.message);
        return false;
      }
      setTableState({
        records: result.data.data,
        total: result.data.total,
        page: result.data.page,
        pageSize: result.data.pageSize,
      });
      return true;
    },
    [fetchRecords],
  );

  const patchRecordStatus = useCallback(
    (leaveRequestId: string, nextStatus: LeaveListItem["leaveStatus"]) => {
      setTableState((prev) => ({
        ...prev,
        records: prev.records.map((row) =>
          row.id === leaveRequestId ? { ...row, leaveStatus: nextStatus } : row,
        ),
      }));
    },
    [],
  );

  const afterMutation = useCallback(
    async (leaveRequestId: string, nextStatus: LeaveListItem["leaveStatus"] | "deleted") => {
      if (nextStatus === "deleted") {
        setTableState((prev) => ({
          ...prev,
          records: prev.records.filter((row) => row.id !== leaveRequestId),
          total: Math.max(0, prev.total - 1),
        }));
      } else {
        patchRecordStatus(leaveRequestId, nextStatus);
      }
      await reloadTable();
      onMutated?.();
    },
    [onMutated, patchRecordStatus, reloadTable],
  );

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const previous = filtersRef.current;
      const nextFilters: LeaveListParams = {
        ...previous,
        page: updates.page ? Number(updates.page) : previous.page,
        month: updates.month ? Number(updates.month) : previous.month,
        year: updates.year ? Number(updates.year) : previous.year,
      };

      Object.entries(updates).forEach(([key, value]) => {
        if (["page", "month", "year"].includes(key)) return;
        (nextFilters as Record<string, unknown>)[key] =
          !value || value === FILTER_ANY_VALUE ? undefined : value;
      });

      const changed =
        nextFilters.page !== previous.page ||
        nextFilters.month !== previous.month ||
        nextFilters.year !== previous.year ||
        (nextFilters.search ?? undefined) !== (previous.search ?? undefined) ||
        (nextFilters.leaveStatus ?? undefined) !== (previous.leaveStatus ?? undefined) ||
        (nextFilters.leaveTypeId ?? undefined) !== (previous.leaveTypeId ?? undefined) ||
        (nextFilters.departmentId ?? undefined) !== (previous.departmentId ?? undefined) ||
        (nextFilters.branchId ?? undefined) !== (previous.branchId ?? undefined) ||
        (nextFilters.reportingManagerId ?? undefined) !==
          (previous.reportingManagerId ?? undefined) ||
        (nextFilters.employeeId ?? undefined) !== (previous.employeeId ?? undefined) ||
        (nextFilters.summaryFilter ?? undefined) !== (previous.summaryFilter ?? undefined);

      if (!changed) return;

      setFilters(nextFilters);
      filtersRef.current = nextFilters;

      startTransition(async () => {
        await reloadTable(nextFilters);
      });
    },
    [reloadTable],
  );

  useEffect(() => {
    const previous = filtersRef.current;
    if ((previous.summaryFilter ?? undefined) === (summaryFilter ?? undefined)) {
      return;
    }

    const nextFilters: LeaveListParams = {
      ...previous,
      summaryFilter,
      leaveStatus: summaryFilter
        ? leaveStatusForSummaryFilter(summaryFilter)
        : undefined,
      page: 1,
    };

    setFilters(nextFilters);
    filtersRef.current = nextFilters;
    startTransition(async () => {
      await reloadTable(nextFilters);
    });
  }, [reloadTable, summaryFilter]);

  const { records, total, page, pageSize } = tableState;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const yearItems = useMemo(() => buildYearItems(), []);

  const statusItems = useMemo(
    () => [
      { value: FILTER_ANY_VALUE, label: "All statuses" },
      { value: UPCOMING_FILTER_VALUE, label: "Upcoming planned" },
      { value: "pending_hr_review", label: "Pending HR Review" },
      ...Object.entries(LEAVE_STATUS_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    ],
    [],
  );

  const leaveTypeItems = useMemo(
    () => [
      { value: FILTER_ANY_VALUE, label: "All types" },
      ...leaveTypes.map((item) => ({ value: item.id, label: item.label })),
    ],
    [leaveTypes],
  );

  const employeeItems = useMemo(
    () => [
      { value: FILTER_ANY_VALUE, label: "All employees" },
      ...employees.map((employee) => ({
        value: employee.id,
        label: employee.code
          ? `${formatCleanEmployeeName(employee.label)} (${employee.code})`
          : formatCleanEmployeeName(employee.label),
      })),
    ],
    [employees],
  );

  const columns = useMemo<ColumnDef<LeaveListItem>[]>(
    () => [
      {
        id: "employee",
        header: "Employee",
        cell: ({ row }) => (
          <div className="min-w-[12rem]">
            <p className="font-medium tracking-normal not-italic">
              {formatCleanEmployeeName(row.original.employeeName)}
            </p>
            <p className="text-xs text-muted-foreground">{row.original.employeeCode}</p>
          </div>
        ),
      },
      {
        id: "designationName",
        header: "Designation",
        cell: ({ row }) => row.original.designationName ?? "—",
      },
      {
        id: "leaveTypeName",
        header: "Leave Type",
        cell: ({ row }) => row.original.leaveTypeName,
      },
      {
        id: "duration",
        header: "Duration",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.isHalfDay ? "0.5 day" : `${row.original.totalDays} day${row.original.totalDays === 1 ? "" : "s"}`}
          </span>
        ),
      },
      {
        id: "startDate",
        header: "Start Date",
        cell: ({ row }) => formatLeaveDate(row.original.startDate),
      },
      {
        id: "endDate",
        header: "End Date",
        cell: ({ row }) => formatLeaveDate(row.original.endDate),
      },
      {
        id: "appliedAt",
        header: "Applied On",
        cell: ({ row }) =>
          format(parseISO(row.original.appliedAt), "dd MMM yyyy"),
      },
      ...(embedded
        ? []
        : [
            {
              id: "approverName",
              header: "Approver",
              cell: ({ row }: { row: { original: LeaveListItem } }) =>
                row.original.approverName ?? "—",
            },
          ]),
      {
        id: "leaveStatus",
        header: "Status",
        cell: ({ row }) => (
          <LeaveStatusBadge
            status={row.original.leaveStatus}
            durationBreakdown={row.original.durationBreakdown}
            hrReviewRequired={row.original.hrReviewRequired}
            hrDecision={row.original.hrDecision}
          />
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const isPendingStatus = row.original.leaveStatus === "pending";
          const isHrReviewPending = Boolean(row.original.hrReviewRequired) && !row.original.hrDecision;
          const isCancellable = ["pending", "approved"].includes(
            row.original.leaveStatus,
          );

          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="View leave"
                title="View"
                onClick={() => openLeavePopup(row.original)}
              >
                <Eye className="size-4" />
              </Button>
              {!embedded && canApprove && isPendingStatus && !isHrReviewPending ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Approve"
                  title="Approve"
                  onClick={() => setApproveTarget(row.original)}
                >
                  <CheckCircle2 className="size-4 text-emerald-600" />
                </Button>
              ) : null}
              {!embedded && canReject && isPendingStatus && !isHrReviewPending ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Reject"
                  title="Reject"
                  onClick={() => setRejectTarget(row.original)}
                >
                  <XCircle className="size-4 text-red-500" />
                </Button>
              ) : null}
              {!embedded && canCancel && isCancellable ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Cancel leave"
                  title="Cancel"
                  onClick={() => setCancelTarget(row.original)}
                >
                  <Ban className="size-4 text-orange-500" />
                </Button>
              ) : null}
              {!embedded && canDelete ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete"
                  title="Delete"
                  onClick={() => setDeleteTarget(row.original)}
                >
                  <Trash2 className="size-4 text-red-500" />
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [canApprove, canCancel, canDelete, canReject, embedded],
  );

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
  });

  const handleApprove = () => {
    if (!approveTarget) return;
    const targetId = approveTarget.id;
    setApproveError(null);

    startTransition(async () => {
      const result = await approveLeaveRequestAction({
        leaveRequestId: targetId,
        comments: approveComments || "",
      });

      if (!result.success) {
        setApproveError(result.message);
        return;
      }

      toast.success("Leave request approved");
      setApproveTarget(null);
      setApproveComments("");
      setApproveError(null);
      await afterMutation(targetId, "approved");
    });
  };

  const handleReject = () => {
    if (!rejectTarget) return;

    if (rejectComments.trim().length < 3) {
      setRejectError("Rejection reason is required (minimum 3 characters)");
      return;
    }

    const targetId = rejectTarget.id;
    setRejectError(null);

    startTransition(async () => {
      const result = await rejectLeaveRequestAction({
        leaveRequestId: targetId,
        comments: rejectComments,
      });

      if (!result.success) {
        setRejectError(result.message);
        return;
      }

      toast.success("Leave request rejected");
      setRejectTarget(null);
      setRejectComments("");
      setRejectError(null);
      await afterMutation(targetId, "rejected");
    });
  };

  const handleCancel = () => {
    if (!cancelTarget) return;
    const targetId = cancelTarget.id;

    startTransition(async () => {
      const result = await cancelLeaveRequestAction(targetId);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Leave request cancelled");
      setCancelTarget(null);
      await afterMutation(targetId, "cancelled");
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;

    startTransition(async () => {
      const result = await deleteLeaveRequestAction(targetId);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Leave request deleted");
      setDeleteTarget(null);
      await afterMutation(targetId, "deleted");
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <div className="shrink-0">
          <Select
            items={employeeItems}
            value={filters.employeeId ?? FILTER_ANY_VALUE}
            onValueChange={(value) => {
              if (value == null) return;
              const next = value === FILTER_ANY_VALUE ? undefined : value;
              if ((filters.employeeId ?? undefined) === next) return;
              updateParams({
                employeeId: next,
                search: undefined,
                departmentId: undefined,
                branchId: undefined,
                reportingManagerId: undefined,
                page: "1",
              });
            }}
          >
            <SelectTrigger className={cn(FILTER_CONTROL_CLASS, "min-w-[10.75rem] max-w-[16rem]")}>
              <SelectValue
                placeholder="All employees"
                className="overflow-visible text-clip whitespace-nowrap"
              />
            </SelectTrigger>
            <SelectContent
              align="start"
              alignItemWithTrigger={false}
              className="min-w-[18rem] max-w-[24rem]"
            >
              {employeeItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="shrink-0">
          <Select
            items={MONTH_ITEMS}
            value={String(currentMonth)}
            onValueChange={(value) => {
              if (value == null) return;
              if (String(currentMonth) === value) return;
              updateParams({ month: value, page: "1" });
            }}
          >
            <SelectTrigger className={cn(FILTER_CONTROL_CLASS, "min-w-[9rem]")}>
              <SelectValue placeholder="Month" className="overflow-visible whitespace-nowrap" />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {MONTH_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="shrink-0">
          <Select
            items={yearItems}
            value={String(currentYear)}
            onValueChange={(value) => {
              if (value == null) return;
              if (String(currentYear) === value) return;
              updateParams({ year: value, page: "1" });
            }}
          >
            <SelectTrigger className={cn(FILTER_CONTROL_CLASS, "min-w-[6.25rem]")}>
              <SelectValue placeholder="Year" className="overflow-visible whitespace-nowrap" />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {yearItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="shrink-0">
          <Select
            items={statusItems}
            value={statusSelectValue(summaryFilter, filters.leaveStatus)}
            onValueChange={(value) => {
              if (value == null) return;

              const displayed = statusSelectValue(
                summaryFilter,
                filters.leaveStatus,
              );
              // Ignore remount echoes for the already-selected filter.
              if (value === displayed) return;

              if (value === UPCOMING_FILTER_VALUE) {
                onSummaryFilterChange?.("upcomingPlannedLeaves");
                return;
              }

              const next =
                value === FILTER_ANY_VALUE
                  ? undefined
                  : (value as LeaveListParams["leaveStatus"]);

              if (summaryFilter) {
                onSummaryFilterChange?.(undefined);
              }
              updateParams({
                leaveStatus: next,
                summaryFilter: undefined,
                page: "1",
              });
            }}
          >
            <SelectTrigger className={cn(FILTER_CONTROL_CLASS, "min-w-[11.25rem]")}>
              <SelectValue placeholder="All statuses" className="overflow-visible whitespace-nowrap" />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {statusItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="shrink-0">
          <Select
            items={leaveTypeItems}
            value={filters.leaveTypeId ?? FILTER_ANY_VALUE}
            onValueChange={(value) => {
              if (value == null) return;
              const next = value === FILTER_ANY_VALUE ? undefined : value;
              if ((filters.leaveTypeId ?? undefined) === next) return;
              updateParams({
                leaveTypeId: next,
                page: "1",
              });
            }}
          >
            <SelectTrigger className={cn(FILTER_CONTROL_CLASS, "min-w-[10rem]")}>
              <SelectValue
                placeholder="All types"
                className="overflow-visible text-clip whitespace-nowrap"
              />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {leaveTypeItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        </div>

        <span className="ml-auto inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap text-sm font-semibold text-foreground">
          <CalendarDays className="size-4 shrink-0" />
          Summary for {today}
        </span>
      </div>

      <div className="max-h-[min(70vh,calc(100dvh-16rem))] overflow-auto rounded-lg border border-input bg-white [scrollbar-gutter:stable] dark:bg-input">
        <table
          data-slot="table"
          className="w-max min-w-full caption-bottom bg-white text-sm dark:bg-input"
        >
          <TableHeader className={TABLE_HEADER_STICKY_CLASS}>
            <TableRow className={TABLE_HEADER_ROW_CLASS}>
              <TableHead className={cn(TABLE_HEADER_CELL_CLASS, "min-w-[14rem]")}>
                Employee
              </TableHead>
              <TableHead className={cn(TABLE_HEADER_CELL_CLASS, "min-w-[9.5rem]")}>
                Designation
              </TableHead>
              <TableHead className={cn(TABLE_HEADER_CELL_CLASS, "min-w-[10rem]")}>
                Leave Type
              </TableHead>
              <TableHead className={cn(TABLE_HEADER_CELL_CLASS, "min-w-[7rem] text-center")}>
                Duration
              </TableHead>
              <TableHead className={cn(TABLE_HEADER_CELL_CLASS, "min-w-[10.5rem]")}>
                Start Date
              </TableHead>
              <TableHead className={cn(TABLE_HEADER_CELL_CLASS, "min-w-[10.5rem]")}>
                End Date
              </TableHead>
              <TableHead className={cn(TABLE_HEADER_CELL_CLASS, "min-w-[10.5rem]")}>
                Applied On
              </TableHead>
              {!embedded ? (
                <TableHead className={cn(TABLE_HEADER_CELL_CLASS, "min-w-[10rem]")}>
                  Approver
                </TableHead>
              ) : null}
              <TableHead className={cn(TABLE_HEADER_CELL_CLASS, "min-w-[8.5rem] text-center")}>
                Status
              </TableHead>
              <TableHead className={cn(TABLE_HEADER_CELL_CLASS, TABLE_ACTIONS_CELL_CLASS)} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={embedded ? 9 : 10}
                  className="h-24 text-center text-muted-foreground"
                >
                  No leave requests found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/5"
                  onClick={() => openLeavePopup(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        TABLE_CELL_CLASS,
                        cell.column.id === "actions"
                          ? TABLE_ACTIONS_CELL_CLASS
                          : ["leaveStatus", "duration"].includes(cell.column.id)
                            ? "whitespace-nowrap px-4 py-3.5 text-center"
                            : TABLE_DATA_CELL_CLASS,
                      )}
                      onClick={
                        cell.column.id === "actions"
                          ? (event) => event.stopPropagation()
                          : undefined
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {records.length === 0 ? 0 : (page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isPending}
              onClick={() => updateParams({ page: String(page - 1) })}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isPending}
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Showing {total} leave request{total === 1 ? "" : "s"}
        </p>
      )}

      <HrLeaveDetailPopup
        leaveRequestId={viewLeaveId}
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) {
            setViewLeaveId(null);
          }
        }}
        canApprove={canApprove}
        canReject={canReject}
        canDelete={canDelete}
        onActionComplete={(result) => {
          if (result) {
            void afterMutation(result.leaveRequestId, result.status);
            return;
          }
          void reloadTable().then(() => onMutated?.());
        }}
      />

      <Modal
        open={Boolean(approveTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setApproveTarget(null);
            setApproveComments("");
            setApproveError(null);
          }
        }}
        showCancel={false}
        title="Approve leave request"
        description={
          approveTarget
            ? `Review and approve leave for ${formatCleanEmployeeName(approveTarget.employeeName)}.`
            : undefined
        }
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => {
                setApproveTarget(null);
                setApproveComments("");
                setApproveError(null);
              }}
            >
              Cancel
            </Button>
            <Button disabled={isPending} onClick={handleApprove}>
              {isPending ? "Approving…" : "Approve"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {approveTarget ? (
            <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1.5 dark:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Employee:</span>
                <span className="font-semibold text-foreground">
                  {formatCleanEmployeeName(approveTarget.employeeName)} ({approveTarget.employeeCode})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Leave Type:</span>
                <span className="font-medium text-foreground">
                  {approveTarget.leaveTypeName} (
                  {approveTarget.isHalfDay
                    ? "0.5 day"
                    : `${approveTarget.totalDays} day${approveTarget.totalDays === 1 ? "" : "s"}`}
                  )
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Dates:</span>
                <span className="font-medium text-foreground">
                  {formatLeaveDate(approveTarget.startDate)} — {formatLeaveDate(approveTarget.endDate)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-1.5 dark:border-white/10">
                <span className="text-muted-foreground font-medium">Assigned Approver:</span>
                <span className="font-semibold text-primary">
                  {approveTarget.approverName || "Assigned Manager / Approver"}
                </span>
              </div>
            </div>
          ) : null}

          {approveError ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              <AlertCircle className="size-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">{approveError}</p>
                {approveTarget?.approverName ? (
                  <p className="text-red-800 dark:text-red-300">
                    The designated approver for this request is <strong className="font-semibold">{approveTarget.approverName}</strong>.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="tableApproveComments">Comments (optional)</Label>
            <textarea
              id="tableApproveComments"
              rows={3}
              value={approveComments}
              disabled={isPending}
              placeholder="Add optional notes for this approval…"
              className="flex min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              onChange={(event) => setApproveComments(event.currentTarget.value)}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectComments("");
            setRejectError(null);
          }
        }}
        showCancel={false}
        title="Reject leave request"
        description={
          rejectTarget
            ? `Review and reject leave for ${formatCleanEmployeeName(rejectTarget.employeeName)}.`
            : undefined
        }
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => {
                setRejectTarget(null);
                setRejectComments("");
                setRejectError(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" disabled={isPending} onClick={handleReject}>
              {isPending ? "Rejecting…" : "Reject"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {rejectTarget ? (
            <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1.5 dark:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Employee:</span>
                <span className="font-semibold text-foreground">
                  {formatCleanEmployeeName(rejectTarget.employeeName)} ({rejectTarget.employeeCode})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Leave Type:</span>
                <span className="font-medium text-foreground">
                  {rejectTarget.leaveTypeName} (
                  {rejectTarget.isHalfDay
                    ? "0.5 day"
                    : `${rejectTarget.totalDays} day${rejectTarget.totalDays === 1 ? "" : "s"}`}
                  )
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Dates:</span>
                <span className="font-medium text-foreground">
                  {formatLeaveDate(rejectTarget.startDate)} — {formatLeaveDate(rejectTarget.endDate)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-1.5 dark:border-white/10">
                <span className="text-muted-foreground font-medium">Assigned Approver:</span>
                <span className="font-semibold text-primary">
                  {rejectTarget.approverName || "Assigned Manager / Approver"}
                </span>
              </div>
            </div>
          ) : null}

          {rejectError ? (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              <AlertCircle className="size-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">{rejectError}</p>
                {rejectTarget?.approverName ? (
                  <p className="text-red-800 dark:text-red-300">
                    The designated approver for this request is <strong className="font-semibold">{rejectTarget.approverName}</strong>.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="tableRejectComments">Rejection reason *</Label>
            <textarea
              id="tableRejectComments"
              rows={3}
              value={rejectComments}
              disabled={isPending}
              placeholder="State the reason for rejecting this leave request…"
              className="flex min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              onChange={(event) => setRejectComments(event.currentTarget.value)}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        showCancel={false}
        title="Cancel leave request"
        description={
          cancelTarget
            ? `Cancel leave for ${formatCleanEmployeeName(cancelTarget.employeeName)}?`
            : undefined
        }
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Keep request
            </Button>
            <Button variant="destructive" disabled={isPending} onClick={handleCancel}>
              Cancel leave
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          This will cancel the leave request and restore the employee&apos;s leave balance
          where applicable.
        </p>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        showCancel={false}
        title="Delete leave request"
        description={
          deleteTarget
            ? `Permanently remove leave for ${formatCleanEmployeeName(deleteTarget.employeeName)}?`
            : undefined
        }
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Keep request
            </Button>
            <Button variant="destructive" disabled={isPending} onClick={handleDelete}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          This removes the leave request from Team Leave and restores balance for pending or
          approved requests. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
