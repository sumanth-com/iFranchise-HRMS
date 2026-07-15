"use client";

import { Eye } from "lucide-react";
import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { formatCeoPercent } from "@/components/ceo/ceo-module-primitives";
import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";
import { Button } from "@/components/common/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAttendanceTime } from "@/lib/attendance/services/attendance-utils";
import type { AttendanceStatus } from "@/types/attendance";
import type { CeoAttendanceEmployeeRow } from "@/types/ceo-attendance";

type CeoAttendanceEmployeesTableProps = {
  employees: CeoAttendanceEmployeeRow[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onView: (employeeId: string) => void;
};

export function CeoAttendanceEmployeesTable({
  employees,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onView,
}: CeoAttendanceEmployeesTableProps) {
  const columns = useMemo<ColumnDef<CeoAttendanceEmployeeRow>[]>(
    () => [
      { accessorKey: "employeeCode", header: "Employee ID" },
      {
        accessorKey: "fullName",
        header: "Employee",
        cell: ({ row }) => (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => onView(row.original.employeeId)}
          >
            {row.original.fullName}
          </button>
        ),
      },
      {
        accessorKey: "departmentName",
        header: "Department",
        cell: ({ row }) => row.original.departmentName ?? "—",
      },
      {
        accessorKey: "managerName",
        header: "Manager",
        cell: ({ row }) => row.original.managerName ?? "—",
      },
      {
        accessorKey: "todayStatus",
        header: "Today's Status",
        cell: ({ row }) =>
          row.original.todayStatus === "no_record" ? (
            <span className="text-muted-foreground">No record</span>
          ) : (
            <AttendanceStatusBadge
              status={row.original.todayStatus as AttendanceStatus}
            />
          ),
      },
      {
        accessorKey: "checkInAt",
        header: "Check In",
        cell: ({ row }) => formatAttendanceTime(row.original.checkInAt),
      },
      {
        accessorKey: "checkOutAt",
        header: "Check Out",
        cell: ({ row }) => formatAttendanceTime(row.original.checkOutAt),
      },
      {
        accessorKey: "workingHours",
        header: "Working Hours",
        cell: ({ row }) =>
          row.original.workingHours > 0
            ? `${row.original.workingHours.toFixed(1)} hrs`
            : "—",
      },
      {
        accessorKey: "lateMinutes",
        header: "Late Minutes",
        cell: ({ row }) =>
          row.original.lateMinutes > 0 ? (
            <span className="tabular-nums text-amber-600 dark:text-amber-400">
              {row.original.lateMinutes}
            </span>
          ) : (
            "—"
          ),
      },
      {
        accessorKey: "attendancePercent",
        header: "Attendance %",
        cell: ({ row }) => formatCeoPercent(row.original.attendancePercent),
      },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => onView(row.original.employeeId)}
          >
            <Eye className="size-3.5" />
            View
          </Button>
        ),
      },
    ],
    [onView],
  );

  const table = useReactTable({
    data: employees,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Employee Attendance</h2>
        <p className="text-xs text-muted-foreground">
          Company-wide attendance for today · read only
        </p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Loading employees…
                </TableCell>
              </TableRow>
            ) : employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No employees match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Showing {employees.length} of {total} employees
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
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
