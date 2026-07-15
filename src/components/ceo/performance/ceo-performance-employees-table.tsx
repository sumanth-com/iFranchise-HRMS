"use client";

import { Eye } from "lucide-react";
import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { Button } from "@/components/common/button";
import { formatCeoPercent } from "@/components/ceo/ceo-module-primitives";
import {
  PromotionStatusBadge,
  ReviewStatusBadge,
} from "@/components/performance/performance-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CeoPerformanceEmployeeRow } from "@/types/ceo-performance";

type CeoPerformanceEmployeesTableProps = {
  employees: CeoPerformanceEmployeeRow[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onView: (employeeId: string) => void;
};

export function CeoPerformanceEmployeesTable({
  employees,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onView,
}: CeoPerformanceEmployeesTableProps) {
  const columns = useMemo<ColumnDef<CeoPerformanceEmployeeRow>[]>(
    () => [
      { accessorKey: "employeeCode", header: "Employee ID" },
      {
        accessorKey: "fullName",
        header: "Employee Name",
        cell: ({ row }) => (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => onView(row.original.id)}
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
        header: "Reporting Manager",
        cell: ({ row }) => row.original.managerName ?? "—",
      },
      {
        accessorKey: "currentRating",
        header: "Current Rating",
        cell: ({ row }) =>
          row.original.currentRating != null
            ? row.original.currentRating.toFixed(1)
            : "—",
      },
      {
        accessorKey: "previousRating",
        header: "Previous Rating",
        cell: ({ row }) =>
          row.original.previousRating != null
            ? row.original.previousRating.toFixed(1)
            : "—",
      },
      {
        accessorKey: "goalCompletionPercent",
        header: "Goal Completion",
        cell: ({ row }) => formatCeoPercent(row.original.goalCompletionPercent),
      },
      {
        accessorKey: "reviewStatus",
        header: "Review Status",
        cell: ({ row }) =>
          row.original.reviewStatus ? (
            <ReviewStatusBadge status={row.original.reviewStatus} />
          ) : (
            "—"
          ),
      },
      {
        accessorKey: "promotionStatus",
        header: "Promotion Status",
        cell: ({ row }) =>
          row.original.promotionStatus ? (
            <PromotionStatusBadge status={row.original.promotionStatus} />
          ) : (
            "—"
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
    data: employees,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Employee Performance</h2>
        <p className="text-xs text-muted-foreground">
          Company-wide ratings and review status · CEO cannot edit
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
