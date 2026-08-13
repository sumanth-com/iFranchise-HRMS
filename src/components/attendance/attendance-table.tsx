"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import {
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";

import { AddAttendanceDialog } from "@/components/attendance/add-attendance-dialog";
import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteAttendanceAction } from "@/lib/attendance/actions";
import {
  ATTENDANCE_ROUTES,
  ATTENDANCE_STATUS_LABELS,
} from "@/lib/attendance/constants";
import { formatAttendanceTime } from "@/lib/attendance/services/attendance-utils";
import type { AttendanceListItem, AttendanceLookups } from "@/types/attendance";
import type { LookupOption } from "@/types/employee";
import { cn } from "@/lib/utils";

type AttendanceTableProps = {
  records: AttendanceListItem[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  dateFrom?: string;
  dateTo?: string;
  today: string;
  departmentId?: string;
  attendanceStatus?: string;
  employeeId?: string;
  departments: LookupOption[];
  employees: LookupOption[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  listBasePath?: string;
  fixedQuery?: Record<string, string>;
  attendanceLookups?: AttendanceLookups;
  onViewRecord?: (record: AttendanceListItem) => void;
};

function formatDateTime(value?: string | null) {
  return formatAttendanceTime(value);
}

function formatDateRangeLabel(
  dateFrom?: string,
  dateTo?: string,
  today?: string,
) {
  if (dateFrom && dateTo && dateFrom === dateTo) {
    if (today && dateFrom === today) {
      return " · Today";
    }
    return ` · ${format(parseISO(dateFrom), "dd MMM yyyy")}`;
  }
  if (dateFrom && dateTo) {
    return ` · ${format(parseISO(dateFrom), "dd MMM yyyy")} – ${format(parseISO(dateTo), "dd MMM yyyy")}`;
  }
  if (dateFrom) {
    return ` · From ${format(parseISO(dateFrom), "dd MMM yyyy")}`;
  }
  if (dateTo) {
    return ` · Until ${format(parseISO(dateTo), "dd MMM yyyy")}`;
  }
  return " · Today";
}

type AttendanceColumnMeta = {
  align?: "left" | "center";
};

const TABLE_HEAD_ROW_CLASS =
  "border-white/10 bg-black hover:bg-black";
const TABLE_HEAD_CELL_BASE =
  "h-11 whitespace-nowrap bg-black px-4 py-3 align-middle font-medium text-white";
const TABLE_DATA_CELL_BASE = "whitespace-nowrap px-4 py-3 align-middle";
const TABLE_ACTIONS_CELL_CLASS = "w-16 min-w-16 px-3 py-3 text-center align-middle";

const FILTER_CONTROL_CLASS =
  "h-10 w-full min-w-0 gap-2 rounded-lg [&>svg]:size-3.5 [&>svg]:shrink-0 [&>svg]:text-muted-foreground/70";
const STATUS_FILTER_CLASS = cn(FILTER_CONTROL_CLASS, "w-full");
const DATE_RANGE_CLASS =
  "flex h-10 min-w-[15rem] shrink-0 items-center gap-2 rounded-lg border border-input bg-background px-2.5";
const DATE_INPUT_CLASS =
  "h-7 min-w-0 w-full border-0 bg-transparent p-0 pr-5 text-sm shadow-none focus-visible:ring-0 data-[empty]:text-muted-foreground [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:top-1/2 [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:m-0 [&::-webkit-calendar-picker-indicator]:size-3.5 [&::-webkit-calendar-picker-indicator]:-translate-y-1/2 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0";

export function AttendanceTable({
  records,
  total,
  page,
  pageSize,
  search,
  dateFrom,
  dateTo,
  today,
  departmentId,
  attendanceStatus,
  employeeId,
  departments,
  employees,
  canCreate,
  canEdit,
  canDelete,
  listBasePath,
  fixedQuery,
  attendanceLookups,
  onViewRecord,
}: AttendanceTableProps) {
  const router = useRouter();
  const initialParams = useSearchParams();
  const filterParamsRef = useRef(initialParams.toString());
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<AttendanceListItem | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const resolvedListPath = listBasePath ?? ATTENDANCE_ROUTES.list;

  const buildListUrl = useCallback(
    (query: string) => {
      const params = new URLSearchParams(query);
      if (fixedQuery) {
        Object.entries(fixedQuery).forEach(([key, value]) => {
          params.set(key, value);
        });
      }
      const nextQuery = params.toString();
      return nextQuery ? `${resolvedListPath}?${nextQuery}` : resolvedListPath;
    },
    [fixedQuery, resolvedListPath],
  );

  useEffect(() => {
    if (!fixedQuery && window.location.search) {
      window.history.replaceState(null, "", resolvedListPath);
    }
  }, [fixedQuery, resolvedListPath]);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(filterParamsRef.current);

      Object.entries(updates).forEach(([key, value]) => {
        if (!value) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      filterParamsRef.current = params.toString();

      startTransition(() => {
        const url = buildListUrl(params.toString());
        router.push(url);
        if (!fixedQuery) {
          window.setTimeout(() => {
            window.history.replaceState(null, "", resolvedListPath);
          }, 0);
        }
      });
    },
    [buildListUrl, fixedQuery, resolvedListPath, router, startTransition],
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const departmentItems = useMemo(
    () => [
      { value: "", label: "All departments" },
      ...departments.map((department) => ({
        value: department.id,
        label: department.label,
      })),
    ],
    [departments],
  );

  const statusItems = useMemo(
    () => [
      { value: "", label: "All statuses" },
      ...Object.entries(ATTENDANCE_STATUS_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    ],
    [],
  );

  const employeeItems = useMemo(
    () => [
      { value: "", label: "All employees" },
      ...employees.map((employee) => ({
        value: employee.id,
        label: employee.code
          ? `${employee.label} (${employee.code})`
          : employee.label,
      })),
    ],
    [employees],
  );

  const selectedEmployeeLabel = useMemo(() => {
    if (!employeeId) return null;
    return employeeItems.find((item) => item.value === employeeId)?.label ?? null;
  }, [employeeId, employeeItems]);

  const isDefaultTodayView =
    dateFrom === today &&
    dateTo === today &&
    !departmentId &&
    !attendanceStatus &&
    !employeeId;

  const hasActiveFilters = !isDefaultTodayView;

  const isEmployeeHistoryView = Boolean(employeeId && dateFrom && dateTo);
  const showPagination = !isEmployeeHistoryView && totalPages > 1;

  const updateDateFrom = (value: string) => {
    const nextFrom = value || undefined;
    const updates: Record<string, string | undefined> = {
      dateFrom: nextFrom,
      page: "1",
    };

    if (nextFrom && dateTo && nextFrom > dateTo) {
      updates.dateTo = nextFrom;
    }

    updateParams(updates);
  };

  const updateDateTo = (value: string) => {
    const nextTo = value || undefined;
    const updates: Record<string, string | undefined> = {
      dateTo: nextTo,
      page: "1",
    };

    if (nextTo && dateFrom && dateFrom > nextTo) {
      updates.dateFrom = nextTo;
    }

    updateParams(updates);
  };

  const columns = useMemo<ColumnDef<AttendanceListItem, unknown>[]>(
    () => [
      {
        id: "employeeCode",
        accessorKey: "employeeCode",
        header: "Employee Code",
        meta: { align: "left" } satisfies AttendanceColumnMeta,
        cell: ({ row }) => row.original.employeeCode,
      },
      {
        id: "employeeName",
        accessorKey: "employeeName",
        header: "Employee Name",
        meta: { align: "left" } satisfies AttendanceColumnMeta,
        cell: ({ row }) => (
          <span className="font-medium">{row.original.employeeName}</span>
        ),
      },
      {
        id: "departmentName",
        header: "Department",
        meta: { align: "left" } satisfies AttendanceColumnMeta,
        cell: ({ row }) => row.original.departmentName ?? "—",
      },
      {
        id: "designationTitle",
        header: "Designation",
        meta: { align: "left" } satisfies AttendanceColumnMeta,
        cell: ({ row }) => row.original.designationTitle ?? "—",
      },
      {
        id: "attendanceDate",
        accessorKey: "attendanceDate",
        header: "Attendance Date",
        meta: { align: "center" } satisfies AttendanceColumnMeta,
        cell: ({ row }) =>
          format(parseISO(row.original.attendanceDate), "dd MMM yyyy"),
      },
      {
        id: "checkInAt",
        header: "Check In",
        meta: { align: "center" } satisfies AttendanceColumnMeta,
        cell: ({ row }) => formatDateTime(row.original.checkInAt),
      },
      {
        id: "checkOutAt",
        header: "Check Out",
        meta: { align: "center" } satisfies AttendanceColumnMeta,
        cell: ({ row }) => formatDateTime(row.original.checkOutAt),
      },
      {
        id: "workHours",
        header: "Working Hours",
        meta: { align: "center" } satisfies AttendanceColumnMeta,
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.workHours.toFixed(2)}h</span>
        ),
      },
      {
        id: "attendanceStatus",
        header: "Status",
        meta: { align: "center" } satisfies AttendanceColumnMeta,
        cell: ({ row }) => (
          <AttendanceStatusBadge status={row.original.attendanceStatus} />
        ),
      },
      {
        id: "actions",
        header: "Actions",
        meta: { align: "center" } satisfies AttendanceColumnMeta,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="min-w-[11.5rem]">
              <DropdownMenuItem
                className="whitespace-nowrap"
                onClick={() => {
                  if (onViewRecord) {
                    onViewRecord(row.original);
                    return;
                  }
                  router.push(ATTENDANCE_ROUTES.detail(row.original.id));
                }}
              >
                <Eye className="size-4 shrink-0" />
                View Attendance
              </DropdownMenuItem>
              {canEdit ? (
                <DropdownMenuItem
                  className="whitespace-nowrap"
                  onClick={() =>
                    router.push(ATTENDANCE_ROUTES.edit(row.original.id))
                  }
                >
                  <Pencil className="size-4 shrink-0" />
                  Edit Attendance
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <DropdownMenuItem
                  variant="destructive"
                  className="whitespace-nowrap"
                  onClick={() => setDeleteTarget(row.original)}
                >
                  <Trash2 className="size-4 shrink-0" />
                  Delete Attendance
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [canDelete, canEdit, onViewRecord, router],
  );

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
  });

  const handleDelete = () => {
    if (!deleteTarget) return;

    startTransition(async () => {
      const result = await deleteAttendanceAction(deleteTarget.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Attendance deleted");
      setDeleteTarget(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
            <div className="w-full min-w-[11rem] sm:w-[14rem]">
              <Select
                items={employeeItems}
                value={employeeId ?? ""}
                onValueChange={(value) =>
                  updateParams({
                    employeeId: value || undefined,
                    search: undefined,
                    departmentId: undefined,
                    branchId: undefined,
                    page: "1",
                  })
                }
              >
                <SelectTrigger className={FILTER_CONTROL_CLASS}>
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent
                  align="start"
                  alignItemWithTrigger={false}
                  className="min-w-[18rem] max-w-[24rem]"
                >
                  {employeeItems.map((item) => (
                    <SelectItem key={item.value || "all-employees"} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full min-w-[9rem] sm:w-36">
              <Select
                items={statusItems}
                value={attendanceStatus ?? ""}
                onValueChange={(value) =>
                  updateParams({
                    attendanceStatus: value || undefined,
                    page: "1",
                  })
                }
              >
                <SelectTrigger className={STATUS_FILTER_CLASS}>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent
                  align="start"
                  alignItemWithTrigger={false}
                  className="min-w-[8.25rem]"
                >
                  {statusItems.map((item) => (
                    <SelectItem key={item.value || "all-statuses"} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={DATE_RANGE_CLASS}>
              <div className="relative min-w-[6.75rem] flex-1">
                <Input
                  type="date"
                  value={dateFrom ?? ""}
                  max={today}
                  data-empty={!dateFrom}
                  className={DATE_INPUT_CLASS}
                  title="From date"
                  onChange={(event) => updateDateFrom(event.currentTarget.value)}
                />
                <CalendarDays className="pointer-events-none absolute top-1/2 right-0 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
              </div>
              <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                to
              </span>
              <div className="relative min-w-[6.75rem] flex-1">
                <Input
                  type="date"
                  value={dateTo ?? ""}
                  max={today}
                  data-empty={!dateTo}
                  className={DATE_INPUT_CLASS}
                  title="To date"
                  onChange={(event) => updateDateTo(event.currentTarget.value)}
                />
                <CalendarDays className="pointer-events-none absolute top-1/2 right-0 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
              </div>
            </div>

            <div className="w-full min-w-[11rem] sm:w-[14rem]">
              <Select
                items={departmentItems}
                value={departmentId ?? ""}
                onValueChange={(value) =>
                  updateParams({
                    departmentId: value || undefined,
                    employeeId: undefined,
                    page: "1",
                  })
                }
              >
                <SelectTrigger className={FILTER_CONTROL_CLASS}>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent
                  align="start"
                  alignItemWithTrigger={false}
                  className="min-w-40"
                >
                  {departmentItems.map((item) => (
                    <SelectItem
                      key={item.value || "all-departments"}
                      value={item.value}
                    >
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2">
            {hasActiveFilters ? (
              <Button
                variant="outline"
                size="sm"
                className="h-10 min-w-[8.5rem] whitespace-nowrap"
                disabled={isPending}
                onClick={() =>
                  updateParams({
                    dateFrom: today,
                    dateTo: today,
                    branchId: undefined,
                    departmentId: undefined,
                    attendanceStatus: undefined,
                    employeeId: undefined,
                    search: undefined,
                    page: "1",
                  })
                }
              >
                Clear filters
              </Button>
            ) : null}

            {canCreate ? (
              <Button
                className="h-10 min-w-[10.5rem] whitespace-nowrap px-4"
                disabled={!attendanceLookups}
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="size-4" />
                Add Attendance
              </Button>
            ) : null}
          </div>
        </div>

        {selectedEmployeeLabel ? (
          <p className="text-sm text-muted-foreground">
            Showing attendance history for{" "}
            <span className="font-medium text-foreground">
              {selectedEmployeeLabel}
            </span>
            {attendanceStatus
              ? ` · ${ATTENDANCE_STATUS_LABELS[attendanceStatus as keyof typeof ATTENDANCE_STATUS_LABELS]}`
              : " · All statuses"}
            {formatDateRangeLabel(dateFrom, dateTo, today)}
          </p>
        ) : null}
      </div>

      <div className="overflow-auto rounded-lg border max-h-[min(70vh,calc(100dvh-16rem))] [scrollbar-gutter:stable]">
        <table
          data-slot="table"
          className="w-full min-w-[72rem] caption-bottom text-sm"
        >
          <TableHeader className="sticky top-0 z-30 bg-black shadow-[0_1px_0_rgba(255,255,255,0.08)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className={TABLE_HEAD_ROW_CLASS}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as AttendanceColumnMeta | undefined;
                  const isActions = header.column.id === "actions";
                  const isCenter = meta?.align === "center";

                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        TABLE_HEAD_CELL_BASE,
                        isActions && TABLE_ACTIONS_CELL_CLASS,
                        isCenter && "text-center",
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 px-4 text-center text-muted-foreground"
                >
                  {employeeId
                    ? "No attendance records found for this employee with the selected filters."
                    : "No attendance records found."}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() =>
                    router.push(ATTENDANCE_ROUTES.detail(row.original.id))
                  }
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as AttendanceColumnMeta | undefined;
                    const isActions = cell.column.id === "actions";
                    const isCenter = meta?.align === "center";

                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          isActions ? TABLE_ACTIONS_CELL_CLASS : TABLE_DATA_CELL_BASE,
                          isCenter && "text-center",
                        )}
                        onClick={
                          isActions ? (event) => event.stopPropagation() : undefined
                        }
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </table>
      </div>

      {showPagination ? (
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
          Showing {total} attendance record{total === 1 ? "" : "s"}
          {isEmployeeHistoryView ? " for selected employee and date range" : ""}
        </p>
      )}

      {attendanceLookups ? (
        <AddAttendanceDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          lookups={attendanceLookups}
        />
      ) : null}

      <Modal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete attendance"
        description={
          deleteTarget
            ? `Soft delete attendance for ${deleteTarget.employeeName} on ${format(parseISO(deleteTarget.attendanceDate), "dd MMM yyyy")}?`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={isPending} onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <span />
      </Modal>
    </div>
  );
}
