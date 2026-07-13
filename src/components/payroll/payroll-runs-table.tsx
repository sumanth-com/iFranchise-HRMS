"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Eye, Lock, Search } from "lucide-react";

import { PayrollStatusBadge } from "@/components/payroll/payroll-status-badge";
import { Button, buttonVariants } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import {
  getMonthSelectItems,
  getYearSelectItems,
  toSelectItems,
} from "@/components/payroll/select-utils";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PAYROLL_ROUTES, PAYROLL_STATUS_LABELS } from "@/lib/payroll/constants";
import { fetchPayrollRunsAction } from "@/lib/payroll/actions";
import {
  formatCurrency,
  formatPayrollMonthLabel,
} from "@/lib/payroll/services/payroll-utils";
import type { PayrollListItem, PayrollListParams, PayrollStatus } from "@/types/payroll";

const monthFilterItems = [
  { value: "all", label: "All months" },
  ...getMonthSelectItems(),
];
const yearFilterItems = [
  { value: "all", label: "All years" },
  ...getYearSelectItems(),
];
const statusFilterItems = [
  { value: "all", label: "All statuses" },
  ...toSelectItems(PAYROLL_STATUS_LABELS),
];

type PayrollRunsTableProps = {
  records: PayrollListItem[];
  total: number;
  page: number;
  pageSize: number;
  search?: string;
  month?: number;
  year?: number;
  payrollStatus?: PayrollStatus;
  showFilters?: boolean;
  compact?: boolean;
};

export function PayrollRunsTable({
  records: initialRecords,
  total: initialTotal,
  page: initialPage,
  pageSize: initialPageSize,
  search: initialSearch = "",
  month: initialMonth,
  year: initialYear,
  payrollStatus: initialPayrollStatus,
  showFilters = true,
  compact = false,
}: PayrollRunsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tableState, setTableState] = useState({
    records: initialRecords,
    total: initialTotal,
    page: initialPage,
    pageSize: initialPageSize,
  });
  const [filters, setFilters] = useState<PayrollListParams>({
    page: initialPage,
    pageSize: initialPageSize,
    search: initialSearch,
    month: initialMonth,
    year: initialYear,
    payrollStatus: initialPayrollStatus,
  });

  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const nextFilters: PayrollListParams = {
        ...filters,
        page: updates.page ? Number(updates.page) : 1,
        month:
          updates.month === undefined
            ? filters.month
            : updates.month
              ? Number(updates.month)
              : undefined,
        year:
          updates.year === undefined
            ? filters.year
            : updates.year
              ? Number(updates.year)
              : undefined,
      };

      Object.entries(updates).forEach(([key, value]) => {
        if (["page", "month", "year"].includes(key)) return;
        (nextFilters as Record<string, unknown>)[key] = value || undefined;
      });

      setFilters(nextFilters);

      startTransition(async () => {
        const result = await fetchPayrollRunsAction(nextFilters);
        setTableState({
          records: result.data,
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
        });
      });
    },
    [filters],
  );

  const { records, total, page, pageSize } = tableState;

  const columns = useMemo<ColumnDef<PayrollListItem>[]>(
    () => [
      {
        accessorKey: "payrollMonth",
        header: "Pay period",
        cell: ({ row }) => formatPayrollMonthLabel(row.original.payrollMonth),
      },
      {
        accessorKey: "payrollStatus",
        header: "Status",
        cell: ({ row }) => (
          <PayrollStatusBadge status={row.original.payrollStatus} />
        ),
      },
      {
        accessorKey: "employeeCount",
        header: "Employees",
      },
      {
        accessorKey: "totalGross",
        header: "Gross",
        cell: ({ row }) => formatCurrency(row.original.totalGross),
      },
      {
        accessorKey: "totalDeductions",
        header: "Deductions",
        cell: ({ row }) => formatCurrency(row.original.totalDeductions),
      },
      {
        accessorKey: "totalNet",
        header: "Net",
        cell: ({ row }) => formatCurrency(row.original.totalNet),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            {row.original.isLocked ? (
              <Lock className="h-4 w-4 text-muted-foreground" />
            ) : null}
            <Link
              href={PAYROLL_ROUTES.detail(row.original.id)}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
              onClick={(event) => event.stopPropagation()}
            >
              <Eye className="mr-1 h-4 w-4" />
              View
            </Link>
          </div>
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
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {showFilters ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative sm:w-[20rem]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search payroll runs..."
              defaultValue={filters.search ?? ""}
              className="pl-9"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  updateParams({
                    search: (event.target as HTMLInputElement).value || undefined,
                  });
                }
              }}
            />
          </div>
          <div className="sm:w-[9rem]">
            <LabeledSelect
              items={monthFilterItems}
              value={filters.month ? String(filters.month) : "all"}
              onValueChange={(value) =>
                updateParams({ month: value !== "all" ? value : undefined })
              }
              placeholder="Month"
            />
          </div>
          <div className="sm:w-[8rem]">
            <LabeledSelect
              items={yearFilterItems}
              value={filters.year ? String(filters.year) : "all"}
              onValueChange={(value) =>
                updateParams({ year: value !== "all" ? value : undefined })
              }
              placeholder="Year"
            />
          </div>
          <div className="sm:w-[11rem]">
            <LabeledSelect
              items={statusFilterItems}
              value={filters.payrollStatus ?? "all"}
              onValueChange={(value) =>
                updateParams({
                  payrollStatus:
                    value !== "all" ? (value as PayrollStatus) : undefined,
                })
              }
              placeholder="Status"
            />
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className={compact ? "h-10 whitespace-nowrap px-3" : "h-11 whitespace-nowrap px-4"}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
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
                      router.push(PAYROLL_ROUTES.detail(row.original.id))
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={compact ? "px-3 py-2.5" : "px-4 py-3"}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className={compact ? "h-20 text-center text-muted-foreground" : "h-24 text-center text-muted-foreground"}
                  >
                    No payroll runs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>
      </div>

      {!compact && totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of{" "}
            {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isPending}
              onClick={() => updateParams({ page: String(page - 1) })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isPending}
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
