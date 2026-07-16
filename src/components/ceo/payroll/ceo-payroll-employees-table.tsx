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
import type { CeoPayrollEmployeeRow } from "@/types/ceo-payroll";

type CeoPayrollEmployeesTableProps = {
  employees: CeoPayrollEmployeeRow[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onView: (row: CeoPayrollEmployeeRow) => void;
};

export function CeoPayrollEmployeesTable({
  employees,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onView,
}: CeoPayrollEmployeesTableProps) {
  const columns = useMemo<ColumnDef<CeoPayrollEmployeeRow>[]>(
    () => [
      { accessorKey: "employeeCode", header: "Employee ID" },
      {
        accessorKey: "fullName",
        header: "Employee Name",
        cell: ({ row }) => (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => onView(row.original)}
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
        accessorKey: "designationTitle",
        header: "Designation",
        cell: ({ row }) => row.original.designationTitle ?? "—",
      },
      {
        accessorKey: "basicSalary",
        header: "Basic Salary",
        cell: ({ row }) => formatCeoCurrency(row.original.basicSalary),
      },
      {
        accessorKey: "allowances",
        header: "Allowances",
        cell: ({ row }) => formatCeoCurrency(row.original.allowances),
      },
      {
        accessorKey: "bonuses",
        header: "Bonuses",
        cell: ({ row }) => formatCeoCurrency(row.original.bonuses),
      },
      {
        accessorKey: "deductions",
        header: "Deductions",
        cell: ({ row }) => formatCeoCurrency(row.original.deductions),
      },
      {
        accessorKey: "netSalary",
        header: "Net Salary",
        cell: ({ row }) => formatCeoCurrency(row.original.netSalary),
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
      {
        accessorKey: "paymentDate",
        header: "Payment Date",
        cell: ({ row }) =>
          row.original.paymentDate
            ? format(new Date(row.original.paymentDate), "d MMM yyyy")
            : "—",
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
    data: employees,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (!isLoading && employees.length === 0 && total === 0) {
    return null;
  }

  return (
    <section className="w-full overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Payroll Table</h2>
        <p className="text-xs text-muted-foreground">
          Employee payroll for the selected period · CEO cannot edit
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
                  Loading payroll…
                </TableCell>
              </TableRow>
            ) : employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No payroll records for the current filters.
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
