"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Eye } from "lucide-react";

import { Button, buttonVariants } from "@/components/common/button";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PAYROLL_ROUTES } from "@/lib/payroll/constants";
import {
  formatCurrency,
  formatPayrollMonthLabel,
} from "@/lib/payroll/services/payroll-utils";
import type { PayslipListItem } from "@/types/payroll";

type PayslipTableProps = {
  records: PayslipListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export function PayslipTable({
  records,
  total,
  page,
  pageSize,
}: PayslipTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updatePage = useCallback(
    (nextPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(nextPage));
      startTransition(() => router.push(`?${params.toString()}`));
    },
    [router, searchParams, startTransition],
  );

  const columns = useMemo<ColumnDef<PayslipListItem>[]>(
    () => [
      { accessorKey: "payslipNumber", header: "Payslip #" },
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
        accessorKey: "payrollMonth",
        header: "Pay period",
        cell: ({ row }) => formatPayrollMonthLabel(row.original.payrollMonth),
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
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Link
            href={PAYROLL_ROUTES.payslipDetail(row.original.id)}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
            onClick={(event) => event.stopPropagation()}
          >
            <Eye className="mr-1 h-4 w-4" />
            View
          </Link>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
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
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() =>
                    router.push(PAYROLL_ROUTES.payslipDetail(row.original.id))
                  }
                >
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
                  No payslips found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </table>
      </div>
      {totalPages > 1 ? (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => updatePage(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => updatePage(page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
