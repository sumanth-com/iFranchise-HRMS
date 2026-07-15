"use client";

import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { formatCeoCurrency } from "@/components/ceo/ceo-module-primitives";
import { PayrollStatusBadge } from "@/components/payroll/payroll-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CeoPayrollDepartmentRow } from "@/types/ceo-payroll";

type CeoPayrollDepartmentsTableProps = {
  departments: CeoPayrollDepartmentRow[];
  isLoading?: boolean;
};

export function CeoPayrollDepartmentsTable({
  departments,
  isLoading,
}: CeoPayrollDepartmentsTableProps) {
  const columns = useMemo<ColumnDef<CeoPayrollDepartmentRow>[]>(
    () => [
      { accessorKey: "name", header: "Department" },
      {
        accessorKey: "employeeCount",
        header: "Employees",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.employeeCount}</span>
        ),
      },
      {
        accessorKey: "monthlyCost",
        header: "Monthly Cost",
        cell: ({ row }) => formatCeoCurrency(row.original.monthlyCost),
      },
      {
        accessorKey: "averageSalary",
        header: "Average Salary",
        cell: ({ row }) => formatCeoCurrency(row.original.averageSalary),
      },
      {
        accessorKey: "benefitsCost",
        header: "Benefits Cost",
        cell: ({ row }) => formatCeoCurrency(row.original.benefitsCost),
      },
      {
        accessorKey: "bonusCost",
        header: "Bonus Cost",
        cell: ({ row }) => formatCeoCurrency(row.original.bonusCost),
      },
      {
        accessorKey: "payrollStatus",
        header: "Payroll Status",
        cell: ({ row }) =>
          row.original.payrollStatus ? (
            <PayrollStatusBadge status={row.original.payrollStatus} />
          ) : (
            "—"
          ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: departments,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Department Payroll</h2>
        <p className="text-xs text-muted-foreground">
          Department cost, average salary, benefits, and bonuses
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
                  No department payroll data for the current filters.
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
