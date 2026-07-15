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
import { Button } from "@/components/common/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CeoAttendanceDepartmentRow } from "@/types/ceo-attendance";

type CeoAttendanceDepartmentsTableProps = {
  departments: CeoAttendanceDepartmentRow[];
  isLoading?: boolean;
  onView: (departmentId: string) => void;
};

export function CeoAttendanceDepartmentsTable({
  departments,
  isLoading,
  onView,
}: CeoAttendanceDepartmentsTableProps) {
  const columns = useMemo<ColumnDef<CeoAttendanceDepartmentRow>[]>(
    () => [
      { accessorKey: "name", header: "Department" },
      {
        accessorKey: "headName",
        header: "Department Head",
        cell: ({ row }) => row.original.headName ?? "—",
      },
      {
        accessorKey: "employeeCount",
        header: "Employees",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.employeeCount}</span>
        ),
      },
      {
        accessorKey: "presentPercent",
        header: "Present %",
        cell: ({ row }) => formatCeoPercent(row.original.presentPercent),
      },
      {
        accessorKey: "latePercent",
        header: "Late %",
        cell: ({ row }) => formatCeoPercent(row.original.latePercent),
      },
      {
        accessorKey: "absentPercent",
        header: "Absent %",
        cell: ({ row }) => formatCeoPercent(row.original.absentPercent),
      },
      {
        accessorKey: "leavePercent",
        header: "Leave %",
        cell: ({ row }) => formatCeoPercent(row.original.leavePercent),
      },
      {
        accessorKey: "averageWorkingHours",
        header: "Average Working Hours",
        cell: ({ row }) => `${row.original.averageWorkingHours.toFixed(1)} hrs`,
      },
      {
        accessorKey: "attendanceScore",
        header: "Attendance Score",
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">
            {row.original.attendanceScore}
          </span>
        ),
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
            onClick={() => onView(row.original.id)}
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
    data: departments,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Department Attendance</h2>
        <p className="text-xs text-muted-foreground">
          Department presence, lateness, and attendance score · view only
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
                  Loading departments…
                </TableCell>
              </TableRow>
            ) : departments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No departments match the current filters.
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
    </section>
  );
}
