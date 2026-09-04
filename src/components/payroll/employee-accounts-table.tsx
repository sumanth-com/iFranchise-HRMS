"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Loader2, Pencil, Plus } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { EmployeeAccountDialog } from "@/components/payroll/employee-account-dialog";
import { useTeamPayrollHeaderActions } from "@/components/payroll/team-payroll-header-actions";
import { directoryDepartmentLabel } from "@/lib/employee/directory-listing";
import { fetchEmployeeAccountsAction } from "@/lib/payroll/actions";
import { maskAccountNumber } from "@/lib/payroll/services/payroll-utils";
import {
  PAYROLL_TABLE_SCROLL_CLASS,
  TABLE_HEADER_ROW_CLASS,
  TABLE_HEADER_STICKY_CLASS,
  payrollStickyActionsBodyClass,
  payrollStickyActionsHeaderClass,
  payrollStickyEmployeeBodyClass,
  payrollStickyEmployeeHeaderClass,
  payrollStickyHeaderCellClass,
} from "@/components/common/table-header-classes";
import { cn } from "@/lib/utils";
import type { LookupOption } from "@/types/employee";
import type { EmployeeAccountListItem } from "@/types/employee-accounts";

function formatDob(value: string | null): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd-MM-yyyy");
  } catch {
    return value;
  }
}

function formatAadhaar(value: string | null): string {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 12) return value;
  return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
}

type EmployeeAccountsTableProps = {
  records: EmployeeAccountListItem[];
  total: number;
  page: number;
  pageSize: number;
  search?: string;
  department?: string;
  employees: LookupOption[];
  departments: LookupOption[];
  canEdit?: boolean;
};

export function EmployeeAccountsTable({
  records: initialRecords,
  total: initialTotal,
  page: initialPage,
  pageSize: initialPageSize,
  search: initialSearch = "",
  department: initialDepartment = "",
  employees,
  departments,
  canEdit = false,
}: EmployeeAccountsTableProps) {
  const router = useRouter();
  const { setHeaderActions } = useTeamPayrollHeaderActions();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EmployeeAccountListItem | null>(null);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [department, setDepartment] = useState(initialDepartment);
  const [tableState, setTableState] = useState({
    records: initialRecords,
    total: initialTotal,
    page: initialPage,
    pageSize: initialPageSize,
  });

  const departmentItems = useMemo(
    () => [
      { value: "", label: "All departments" },
      ...departments
        .filter((item) => Boolean(item.code))
        .map((item) => ({
          value: item.code as string,
          label: directoryDepartmentLabel(item.label) ?? item.label,
        })),
    ],
    [departments],
  );

  const refresh = useCallback(
    (updates: { search?: string; department?: string; page?: number }) => {
      startTransition(async () => {
        const result = await fetchEmployeeAccountsAction({
          page: updates.page ?? 1,
          pageSize: tableState.pageSize,
          search: (updates.search ?? searchInput.trim()) || undefined,
          department: (updates.department ?? department) || undefined,
        });
        setTableState({
          records: result.data,
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
        });
      });
    },
    [department, searchInput, tableState.pageSize],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchInput.trim() === (initialSearch ?? "").trim()) return;
      refresh({ search: searchInput.trim() });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput, initialSearch, refresh]);

  const openCreate = useCallback(() => {
    setEditingRecord(null);
    setDialogOpen(true);
  }, []);

  useEffect(() => {
    if (!canEdit) {
      setHeaderActions(null);
      return;
    }
    setHeaderActions(
      <Button type="button" size="sm" className="gap-1.5" onClick={openCreate}>
        <Plus className="size-4" />
        Add Employee Account
      </Button>,
    );
    return () => setHeaderActions(null);
  }, [canEdit, openCreate, setHeaderActions]);

  const columns = useMemo<ColumnDef<EmployeeAccountListItem>[]>(
    () => [
      {
        accessorKey: "employeeName",
        header: "Employee Name",
        cell: ({ row }) => (
          <div className="min-w-[10rem]">
            <p className="font-medium">{row.original.employeeName}</p>
            <p className="text-xs text-muted-foreground">{row.original.departmentName ?? "—"}</p>
          </div>
        ),
      },
      {
        accessorKey: "employeeCode",
        header: "Employee ID",
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{row.original.employeeCode}</span>
        ),
      },
      {
        accessorKey: "dateOfBirth",
        header: "DOB",
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">{formatDob(row.original.dateOfBirth)}</span>
        ),
      },
      {
        accessorKey: "aadhaarNumber",
        header: "Aadhaar",
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {formatAadhaar(row.original.aadhaarNumber)}
          </span>
        ),
      },
      {
        accessorKey: "panNumber",
        header: "PAN",
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{row.original.panNumber ?? "—"}</span>
        ),
      },
      {
        accessorKey: "bankName",
        header: "Bank Name",
        cell: ({ row }) => (
          <span className="whitespace-nowrap" title={row.original.bankName ?? undefined}>
            {row.original.bankName ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "accountNumber",
        header: "Account Number",
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {row.original.accountNumber
              ? maskAccountNumber(row.original.accountNumber, { reveal: true })
              : "—"}
          </span>
        ),
      },
      {
        accessorKey: "ifscCode",
        header: "IFSC",
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{row.original.ifscCode ?? "—"}</span>
        ),
      },
      {
        accessorKey: "branchName",
        header: "Bank Branch",
        cell: ({ row }) => (
          <span className="whitespace-nowrap" title={row.original.branchName ?? undefined}>
            {row.original.branchName ?? "—"}
          </span>
        ),
      },
      ...(canEdit
        ? [
            {
              id: "actions",
              header: "Actions",
              cell: ({ row }: { row: { original: EmployeeAccountListItem } }) => (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5"
                  onClick={() => {
                    setEditingRecord(row.original);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="size-3.5" />
                  {row.original.hasBankAccount ? "Edit" : "Add"}
                </Button>
              ),
            } satisfies ColumnDef<EmployeeAccountListItem>,
          ]
        : []),
    ],
    [canEdit],
  );

  const table = useReactTable({
    data: tableState.records,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/55 p-3 lg:flex-row lg:items-center">
        <Input
          placeholder="Search employee name or ID..."
          value={searchInput}
          className="h-10 min-w-[14rem] flex-1 border-border/80 bg-white font-semibold dark:bg-input"
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <Select
          items={departmentItems}
          value={department}
          onValueChange={(value) => {
            const next = value ?? "";
            setDepartment(next);
            refresh({ department: next, page: 1 });
          }}
        >
          <SelectTrigger className="h-10 w-[13.5rem] shrink-0 border-border/80 bg-white font-semibold dark:bg-input">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            {departmentItems.map((item) => (
              <SelectItem key={item.value || "all-departments"} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="inline-flex h-10 shrink-0 items-center rounded-md border border-border/80 bg-white px-3 text-sm font-semibold dark:bg-input">
          {tableState.total} employees
        </span>
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-xl border border-border/70 bg-white dark:bg-card",
          isPending && "pointer-events-none opacity-70",
        )}
      >
        <div className={PAYROLL_TABLE_SCROLL_CLASS}>
          <table className="w-full min-w-[72rem] bg-white text-sm dark:bg-input">
            <thead className={TABLE_HEADER_STICKY_CLASS}>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className={TABLE_HEADER_ROW_CLASS}>
                  {headerGroup.headers.map((header) => {
                    const columnId = header.column.id;
                    const isEmployee = columnId === "employeeName";
                    const isActions = columnId === "actions";
                    return (
                      <th
                        key={header.id}
                        className={
                          isEmployee
                            ? payrollStickyEmployeeHeaderClass("min-w-[14rem]")
                            : isActions
                              ? payrollStickyActionsHeaderClass()
                              : payrollStickyHeaderCellClass()
                        }
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white dark:bg-input">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="group border-b border-input/70 bg-white last:border-b-0 hover:bg-zinc-50 dark:bg-input dark:hover:bg-input/80"
                  >
                    {row.getVisibleCells().map((cell) => {
                      const columnId = cell.column.id;
                      const isEmployee = columnId === "employeeName";
                      const isActions = columnId === "actions";
                      return (
                        <td
                          key={cell.id}
                          className={
                            isEmployee
                              ? payrollStickyEmployeeBodyClass("min-w-[14rem]")
                              : isActions
                                ? payrollStickyActionsBodyClass()
                                : "whitespace-nowrap px-4 py-3 align-middle"
                          }
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="h-24 px-4 text-center text-muted-foreground"
                  >
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {isPending ? (
          <div className="flex items-center justify-center gap-2 border-t py-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Updating...
          </div>
        ) : null}
      </div>

      <EmployeeAccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employees={employees}
        record={editingRecord}
        onSaved={() => {
          router.refresh();
          refresh({});
        }}
      />
    </div>
  );
}
