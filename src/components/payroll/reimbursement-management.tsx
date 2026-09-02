"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { CheckCircle2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { ReimbursementDialog } from "@/components/payroll/reimbursement-dialog";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import { toEmployeeSelectItems, toSelectItems } from "@/components/payroll/select-utils";
import { useTeamPayrollHeaderActions } from "@/components/payroll/team-payroll-header-actions";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  approveReimbursementAction,
  createReimbursementAction,
} from "@/lib/payroll/actions";
import {
  REIMBURSEMENT_CATEGORY_LABELS,
  REIMBURSEMENT_STATUS_LABELS,
} from "@/lib/payroll/constants";
import { formatCurrency } from "@/lib/payroll/services/payroll-utils";
import { getHrmsYearSelectItems } from "@/lib/date/hrms-year";
import { reimbursementFormSchema } from "@/lib/validations/payroll";
import type { ReimbursementItem, ReimbursementStatus } from "@/types/payroll";
import type { LookupOption } from "@/types/employee";

const categoryItems = toSelectItems(REIMBURSEMENT_CATEGORY_LABELS);

const EMPTY_REIMBURSEMENT_VALUES: z.input<typeof reimbursementFormSchema> = {
  category: "travel",
  amount: 0,
  employeeId: "",
  expenseDate: "",
  description: "",
};

type ReimbursementFormProps = {
  employees: LookupOption[];
  variant?: "page" | "dialog";
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function ReimbursementForm({
  employees,
  variant = "page",
  onSuccess,
  onCancel,
}: ReimbursementFormProps) {
  const isDialog = variant === "dialog";
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.input<typeof reimbursementFormSchema>>({
    resolver: zodResolver(reimbursementFormSchema),
    defaultValues: EMPTY_REIMBURSEMENT_VALUES,
  });

  const gridClass = isDialog ? "grid gap-3 md:grid-cols-2" : "grid gap-4 md:grid-cols-2";

  function handleSubmit(values: z.input<typeof reimbursementFormSchema>) {
    startTransition(async () => {
      const result = await createReimbursementAction(values);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Expense claim submitted");
      form.reset(EMPTY_REIMBURSEMENT_VALUES);
      onSuccess?.();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      {!isDialog ? (
        <div>
          <h2 className="text-sm font-medium">Submit expense claim</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Approved claims are paid through the monthly payroll run.
          </p>
        </div>
      ) : null}

      <div className={gridClass}>
        <Field label="Employee">
          <EmployeeSelect
            employees={employees}
            value={form.watch("employeeId")}
            onValueChange={(value) =>
              form.setValue("employeeId", value, { shouldValidate: true })
            }
            disabled={isPending}
          />
        </Field>
        <Field label="Category">
          <LabeledSelect
            items={categoryItems}
            value={form.watch("category")}
            onValueChange={(value) =>
              form.setValue(
                "category",
                value as z.input<typeof reimbursementFormSchema>["category"],
                { shouldValidate: true },
              )
            }
            disabled={isPending}
          />
        </Field>
        <Field label="Amount">
          <Input
            type="number"
            min={0}
            step="0.01"
            disabled={isPending}
            {...form.register("amount")}
          />
        </Field>
        <Field label="Expense date">
          <Input type="date" disabled={isPending} {...form.register("expenseDate")} />
        </Field>
        <Field label="Description" className="md:col-span-2">
          <Input
            disabled={isPending}
            placeholder="Brief description of the expense"
            {...form.register("description")}
          />
        </Field>
      </div>

      {isDialog ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" disabled={isPending} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} className="gap-1.5">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Submit claim
          </Button>
        </div>
      ) : (
        <Button type="submit" disabled={isPending} className="gap-1.5">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Submit claim
        </Button>
      )}
    </form>
  );
}

type ReimbursementTableProps = {
  records: ReimbursementItem[];
  total: number;
  page: number;
  pageSize: number;
  employees: LookupOption[];
  canApprove: boolean;
  canCreate?: boolean;
};

export function ReimbursementTable({
  records,
  total,
  page,
  pageSize,
  employees,
  canApprove,
  canCreate = false,
}: ReimbursementTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setHeaderActions } = useTeamPayrollHeaderActions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const now = new Date();
  const [monthFilter, setMonthFilter] = useState(String(now.getMonth() + 1));
  const [yearFilter, setYearFilter] = useState(String(now.getFullYear()));
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const employeeItems = useMemo(
    () => [{ value: "all", label: "All employees" }, ...toEmployeeSelectItems(employees)],
    [employees],
  );
  const statusItems = useMemo(
    () => [
      { value: "all", label: "All statuses" },
      ...Object.entries(REIMBURSEMENT_STATUS_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    ],
    [],
  );

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const d = new Date(r.expenseDate);
      if (monthFilter && monthFilter !== "all" && d.getMonth() + 1 !== Number(monthFilter)) return false;
      if (yearFilter && yearFilter !== "all" && d.getFullYear() !== Number(yearFilter)) return false;
      if (employeeFilter !== "all" && r.employeeId !== employeeFilter) return false;
      if (statusFilter !== "all" && r.reimbursementStatus !== statusFilter) return false;
      return true;
    });
  }, [records, monthFilter, yearFilter, employeeFilter, statusFilter]);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value || value === "all") params.delete(key);
        else params.set(key, value);
      }
      if (!updates.page) params.set("page", "1");
      startTransition(() => router.push(`?${params.toString()}`));
    },
    [router, searchParams, startTransition],
  );

  const openCreateDialog = useCallback(() => {
    setDialogOpen(true);
  }, []);

  useEffect(() => {
    if (!canCreate) {
      setHeaderActions(null);
      return;
    }

    setHeaderActions(
      <Button type="button" size="sm" className="gap-1.5" onClick={openCreateDialog}>
        <Plus className="size-4" />
        Submit claim
      </Button>,
    );

    return () => setHeaderActions(null);
  }, [canCreate, openCreateDialog, setHeaderActions]);

  const columns = useMemo<ColumnDef<ReimbursementItem>[]>(
    () => [
      {
        accessorKey: "employeeName",
        header: "Employee",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.employeeName}</div>
            <div className="text-xs text-muted-foreground">{row.original.employeeCode}</div>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => REIMBURSEMENT_CATEGORY_LABELS[row.original.category],
      },
      {
        accessorKey: "expenseDate",
        header: "Expense date",
        cell: ({ row }) => format(new Date(row.original.expenseDate), "MMM d, yyyy"),
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">{formatCurrency(row.original.amount)}</span>
        ),
      },
      {
        accessorKey: "reimbursementStatus",
        header: "Status",
        cell: ({ row }) => (
          <ReimbursementStatusBadge status={row.original.reimbursementStatus} />
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <span className="max-w-[14rem] truncate text-muted-foreground">
            {row.original.description ?? "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            {canApprove && row.original.reimbursementStatus === "pending" ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await approveReimbursementAction(row.original.id);
                    if (!result.success) toast.error(result.message);
                    else {
                      toast.success("Expense claim approved");
                      router.refresh();
                    }
                  })
                }
              >
                <CheckCircle2 className="size-3.5" />
                Approve
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canApprove, isPending, router, startTransition],
  );

  const table = useReactTable({ data: filteredRecords, columns, getCoreRowModel: getCoreRowModel() });
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));

  const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(2000, i, 1).toLocaleString("en-IN", { month: "long" }),
  }));
  const YEAR_OPTIONS = getHrmsYearSelectItems();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <LabeledSelect
          items={[{ value: "all", label: "All months" }, ...MONTH_OPTIONS]}
          value={monthFilter}
          onValueChange={setMonthFilter}
          triggerClassName="w-[140px]"
        />
        <LabeledSelect
          items={[{ value: "all", label: "All years" }, ...YEAR_OPTIONS]}
          value={yearFilter}
          onValueChange={setYearFilter}
          triggerClassName="w-[100px]"
        />
        <LabeledSelect
          items={employeeItems}
          value={employeeFilter}
          onValueChange={(value) => setEmployeeFilter(value || "all")}
          placeholder="Employee"
          triggerClassName="w-[220px]"
        />
        <LabeledSelect
          items={statusItems}
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value || "all")}
          placeholder="Status"
          triggerClassName="w-[150px]"
        />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {filteredRecords.length === 0 ? (
          <EmptyState
            title="No expense claims yet"
            description={
              canCreate
                ? "Submit an expense claim for an employee. Approved claims are paid in the monthly payroll run."
                : "Expense claims will appear here once they are submitted."
            }
            className="border-0 py-14"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={`h-11 whitespace-nowrap px-4 ${header.id === "actions" ? "text-right" : ""}`}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/30">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={`px-4 py-3 ${cell.column.id === "actions" ? "text-right" : ""}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      {canCreate ? (
        <ReimbursementDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          employees={employees}
          onSaved={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}

function ReimbursementStatusBadge({ status }: { status: ReimbursementStatus }) {
  const styles: Record<ReimbursementStatus, string> = {
    pending: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
    approved: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
    rejected: "bg-red-500/15 text-red-800 dark:text-red-200",
    paid: "bg-primary/10 text-primary",
    cancelled: "border text-muted-foreground",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {REIMBURSEMENT_STATUS_LABELS[status]}
    </span>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
