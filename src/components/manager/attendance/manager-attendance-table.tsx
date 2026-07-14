"use client";

import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  Home,
  LogIn,
  LogOut,
  MoreHorizontal,
  XCircle,
} from "lucide-react";
import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";
import { Button } from "@/components/common/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAttendanceTime } from "@/lib/attendance/services/attendance-utils";
import type { CorrectionStatus, TeamAttendanceListItem } from "@/types/manager-attendance";
import { cn } from "@/lib/utils";

function formatHours(hours: number) {
  if (hours <= 0) return "—";
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (minutes <= 0) return `${wholeHours}h`;
  return `${wholeHours}h ${minutes}m`;
}

function CorrectionStatusBadge({ status }: { status: CorrectionStatus | null }) {
  if (!status) return null;

  const styles: Record<CorrectionStatus, string> = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    rejected: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
    cancelled: "bg-muted text-muted-foreground",
  };

  const labels: Record<CorrectionStatus, string> = {
    pending: "Regularization pending",
    approved: "Regularization approved",
    rejected: "Regularization rejected",
    cancelled: "Regularization cancelled",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  );
}

function AttentionFlags({ record }: { record: TeamAttendanceListItem }) {
  const flags = [
    record.monitoring.isLate
      ? record.lateMinutes > 0
        ? `Late by ${record.lateMinutes} min`
        : "Late arrival"
      : null,
    record.monitoring.isEarlyExit ? "Early exit" : null,
    record.monitoring.missingCheckIn ? "Missing check-in" : null,
    record.monitoring.missingCheckOut ? "Missing check-out" : null,
    record.isWorkFromHome ? "Work from home" : null,
  ].filter(Boolean);

  if (!flags.length && !record.correctionStatus) {
    return <span className="text-sm text-muted-foreground">All clear</span>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {record.correctionStatus ? (
        <CorrectionStatusBadge status={record.correctionStatus} />
      ) : null}
      {flags.length ? (
        <div className="flex flex-wrap gap-1">
          {flags.map((flag) => (
            <span
              key={flag}
              className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300"
            >
              <AlertTriangle className="size-2.5" />
              {flag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PunchRecord({ record }: { record: TeamAttendanceListItem }) {
  const hasCheckIn = Boolean(record.checkInAt);
  const hasCheckOut = Boolean(record.checkOutAt);

  if (!hasCheckIn && !hasCheckOut) {
    return <span className="text-sm text-muted-foreground">No punch recorded</span>;
  }

  return (
    <div className="space-y-1 text-sm">
      <div className="flex items-center gap-1.5 tabular-nums">
        <LogIn className="size-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>{formatAttendanceTime(record.checkInAt)}</span>
      </div>
      <div className="flex items-center gap-1.5 tabular-nums">
        <LogOut className="size-3.5 text-sky-600 dark:text-sky-400" />
        <span>{formatAttendanceTime(record.checkOutAt)}</span>
      </div>
    </div>
  );
}

type ManagerAttendanceTableProps = {
  records: TeamAttendanceListItem[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onViewDetails: (attendanceId: string) => void;
  onApproveRegularization: (correctionId: string) => void;
  onRejectRegularization: (correctionId: string) => void;
};

export function ManagerAttendanceTable({
  records,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onViewDetails,
  onApproveRegularization,
  onRejectRegularization,
}: ManagerAttendanceTableProps) {
  const columns = useMemo<ColumnDef<TeamAttendanceListItem>[]>(
    () => [
      {
        accessorKey: "employeeName",
        header: "Team member",
        cell: ({ row }) => (
          <div className="min-w-[12rem]">
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => onViewDetails(row.original.id)}
            >
              {row.original.employeeName}
            </button>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {row.original.employeeCode}
              {row.original.departmentName ? ` · ${row.original.departmentName}` : ""}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "attendanceStatus",
        header: "Status",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <AttendanceStatusBadge status={row.original.attendanceStatus} />
            {row.original.isWorkFromHome ? (
              <span className="inline-flex w-fit items-center gap-1 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                <Home className="size-2.5" />
                WFH
              </span>
            ) : null}
          </div>
        ),
      },
      {
        id: "punch",
        header: "Punch record",
        cell: ({ row }) => <PunchRecord record={row.original} />,
      },
      {
        id: "duration",
        header: "Hours",
        cell: ({ row }) => (
          <div className="text-sm">
            <p className="font-medium tabular-nums">{formatHours(row.original.workHours)}</p>
            {row.original.overtimeHours > 0 ? (
              <p className="text-xs text-muted-foreground tabular-nums">
                +{formatHours(row.original.overtimeHours)} OT
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "attention",
        header: "Needs attention",
        cell: ({ row }) => <AttentionFlags record={row.original} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const pending = row.original.correctionStatus === "pending";
          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" aria-label="Open actions">
                    <MoreHorizontal className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewDetails(row.original.id)}>
                  <Eye className="mr-2 size-4" />
                  View details
                </DropdownMenuItem>
                {pending && row.original.correctionId ? (
                  <>
                    <DropdownMenuItem
                      onClick={() =>
                        onApproveRegularization(row.original.correctionId!)
                      }
                    >
                      <CheckCircle2 className="mr-2 size-4" />
                      Approve regularization
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        onRejectRegularization(row.original.correctionId!)
                      }
                    >
                      <XCircle className="mr-2 size-4" />
                      Reject regularization
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [onApproveRegularization, onRejectRegularization, onViewDetails],
  );

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => {
                const hasAlert =
                  row.original.monitoring.isLate ||
                  row.original.monitoring.isEarlyExit ||
                  row.original.monitoring.missingCheckIn ||
                  row.original.monitoring.missingCheckOut ||
                  row.original.correctionStatus === "pending";

                return (
                  <TableRow
                    key={row.id}
                    className={cn(hasAlert && "bg-amber-50/60 dark:bg-amber-950/20")}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="align-top whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {isLoading ? "Loading attendance..." : "No attendance records found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
        <p className="text-muted-foreground">
          Showing {records.length} of {total} record(s)
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span className="tabular-nums text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isLoading}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}

export function AttendanceTimeline({
  checkInAt,
  checkOutAt,
  attendanceDate,
}: {
  checkInAt: string | null;
  checkOutAt: string | null;
  attendanceDate: string;
}) {
  return (
    <div className="relative rounded-lg border bg-muted/30 p-4">
      <div className="absolute top-1/2 right-8 left-8 h-px -translate-y-1/2 bg-border" />
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex flex-col items-center gap-1">
          <span className="flex size-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <LogIn className="size-4" />
          </span>
          <p className="text-xs font-medium">Check In</p>
          <p className="text-sm tabular-nums">{formatAttendanceTime(checkInAt)}</p>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Clock3 className="size-4" />
          </span>
          <p className="text-xs font-medium">{format(parseISO(attendanceDate), "d MMM yyyy")}</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="flex size-8 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
            <LogOut className="size-4" />
          </span>
          <p className="text-xs font-medium">Check Out</p>
          <p className="text-sm tabular-nums">{formatAttendanceTime(checkOutAt)}</p>
        </div>
      </div>
    </div>
  );
}
