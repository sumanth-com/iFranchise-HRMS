"use client";

import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { format } from "date-fns";

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PAYROLL_ROUTES } from "@/lib/payroll/constants";
import { formatCurrency } from "@/lib/payroll/services/payroll-utils";
import type { SalaryStructureItem } from "@/types/payroll";

export function SalaryStructureTable({
  records,
}: {
  records: SalaryStructureItem[];
}) {
  const columns: ColumnDef<SalaryStructureItem>[] = [
    {
      accessorKey: "employeeName",
      header: "Employee",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.employeeName}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.employeeCode}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "effectiveFrom",
      header: "Effective from",
      cell: ({ row }) => format(new Date(row.original.effectiveFrom), "MMM d, yyyy"),
    },
    {
      accessorKey: "grossSalary",
      header: "Gross",
      cell: ({ row }) => formatCurrency(row.original.grossSalary),
    },
    {
      accessorKey: "netSalary",
      header: "Net",
      cell: ({ row }) => formatCurrency(row.original.netSalary),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) =>
        row.original.isCurrent ? (
          <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            Current
          </span>
        ) : (
          <span className="inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Historical
          </span>
        ),
    },
  ];

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href={PAYROLL_ROUTES.newSalaryStructure}
          className="text-sm font-medium text-primary hover:underline"
        >
          Add salary structure
        </Link>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="px-4 py-3">
                    {flexRender(header.column.columnDef.header, header.getContext())}
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
                    <TableCell key={cell.id} className="px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No salary structures found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </table>
      </div>
    </div>
  );
}
