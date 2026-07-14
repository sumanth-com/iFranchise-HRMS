"use client";

import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TeamMonthlyAttendanceRow } from "@/types/manager-attendance";

function formatHours(hours: number) {
  if (hours <= 0) return "—";
  return `${hours.toFixed(1)}h`;
}

type ManagerAttendanceMonthlyTableProps = {
  rows: TeamMonthlyAttendanceRow[];
};

export function ManagerAttendanceMonthlyTable({ rows }: ManagerAttendanceMonthlyTableProps) {
  const columns = useMemo<ColumnDef<TeamMonthlyAttendanceRow>[]>(
    () => [
      {
        accessorKey: "employeeName",
        header: "Employee",
      },
      {
        accessorKey: "employeeCode",
        header: "Employee ID",
      },
      {
        accessorKey: "departmentName",
        header: "Department",
        cell: ({ row }) => row.original.departmentName ?? "—",
      },
      {
        accessorKey: "presentDays",
        header: "Present Days",
      },
      {
        accessorKey: "leaveDays",
        header: "Leave Days",
      },
      {
        accessorKey: "absentDays",
        header: "Absent Days",
      },
      {
        accessorKey: "wfhDays",
        header: "WFH Days",
      },
      {
        accessorKey: "lateDays",
        header: "Late Days",
      },
      {
        accessorKey: "averageWorkingHours",
        header: "Avg Working Hours",
        cell: ({ row }) => formatHours(row.original.averageWorkingHours),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

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
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No monthly attendance data for your team.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
