"use client";

import { format } from "date-fns";
import { Eye } from "lucide-react";
import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { formatCeoCurrency } from "@/components/ceo/ceo-module-primitives";
import { Button } from "@/components/common/button";
import { PayrollStatusBadge } from "@/components/payroll/payroll-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CeoPayrollHistoryRow } from "@/types/ceo-payroll";

type CeoPayrollHistoryTableProps = {
  history: CeoPayrollHistoryRow[];
  isLoading?: boolean;
  onView: (row: CeoPayrollHistoryRow) => void;
};

export function CeoPayrollHistoryTable({
  history,
  isLoading,
  onView,
}: CeoPayrollHistoryTableProps) {
  const columns = useMemo<ColumnDef<CeoPayrollHistoryRow>[]>(
    () => [
      { accessorKey: "monthLabel", header: "Month" },
      {
        accessorKey: "payrollCost",
        header: "Payroll Cost",
        cell: ({ row }) => formatCeoCurrency(row.original.payrollCost),
      },
      {
        accessorKey: "employeesPaid",
        header: "Employees Paid",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.employeesPaid}</span>
        ),
      },
      {
        accessorKey: "completedDate",
        header: "Completed Date",
        cell: ({ row }) =>
          row.original.completedDate
            ? format(new Date(row.original.completedDate), "d MMM yyyy")
            : "—",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <PayrollStatusBadge status={row.original.status} />,
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
            onClick={() => onView(row.original)}
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
    data: history,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Payroll History</h2>
        <p className="text-xs text-muted-foreground">
          Previous payroll cycles · view opens that month in the module
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
                  Loading history…
                </TableCell>
              </TableRow>
            ) : history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No payroll history found.
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
