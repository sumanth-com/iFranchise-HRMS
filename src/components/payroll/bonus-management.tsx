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
import { CheckCircle2, Loader2, Paperclip, Plus } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { BonusDialog } from "@/components/payroll/bonus-dialog";
import { BonusMonthPicker } from "@/components/payroll/bonus-month-picker";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import { useTeamPayrollHeaderActions } from "@/components/payroll/team-payroll-header-actions";
import { toEmployeeSelectItems, toSelectItems } from "@/components/payroll/select-utils";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  approveBonusAction,
  createBonusAction,
  uploadBonusAttachmentAction,
} from "@/lib/payroll/actions";
import {
  BONUS_APPROVAL_LEVEL_LABELS,
  BONUS_STATUS_LABELS,
  BONUS_TYPE_LABELS,
} from "@/lib/payroll/constants";
import { formatCurrency, formatPayrollMonthLabel } from "@/lib/payroll/services/payroll-utils";
import { getHrmsYearSelectItems } from "@/lib/date/hrms-year";
import { bonusFormSchema } from "@/lib/validations/payroll";
import type { BonusItem, BonusStatus } from "@/types/payroll";
import type { LookupOption } from "@/types/employee";

const bonusTypeItems = toSelectItems(BONUS_TYPE_LABELS);

const now = new Date();

const EMPTY_BONUS_VALUES: z.input<typeof bonusFormSchema> = {
  bonusType: "festival",
  amount: 0,
  employeeId: "",
  reason: "",
  remarks: "",
  bonusMonth: now.getMonth() + 1,
  bonusYear: now.getFullYear(),
};

type BonusFormProps = {
  employees: LookupOption[];
  variant?: "page" | "dialog";
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function BonusForm({
  employees,
  variant = "page",
  onSuccess,
  onCancel,
}: BonusFormProps) {
  const now = new Date();
  const isDialog = variant === "dialog";
  const [isPending, startTransition] = useTransition();
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [bonusMonth, setBonusMonth] = useState(now.getMonth() + 1);
  const [bonusYear, setBonusYear] = useState(now.getFullYear());

  const form = useForm<z.input<typeof bonusFormSchema>>({
    resolver: zodResolver(bonusFormSchema),
    defaultValues: EMPTY_BONUS_VALUES,
  });

  const gridClass = isDialog ? "grid gap-3 md:grid-cols-2" : "grid gap-4 md:grid-cols-2";

  function handleSubmit(values: z.input<typeof bonusFormSchema>) {
    startTransition(async () => {
      let attachmentPath: string | undefined;
      if (attachmentFile) {
        const uploadData = new FormData();
        uploadData.append("file", attachmentFile);
        const upload = await uploadBonusAttachmentAction(uploadData);
        if (!upload.success) {
          toast.error(upload.message);
          return;
        }
        attachmentPath = upload.data;
      }

      const result = await createBonusAction({
        ...values,
        bonusMonth,
        bonusYear,
        attachmentPath,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Bonus submitted for approval");
      form.reset(EMPTY_BONUS_VALUES);
      setAttachmentFile(null);
      setBonusMonth(now.getMonth() + 1);
      setBonusYear(now.getFullYear());
      onSuccess?.();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      {!isDialog ? (
        <div>
          <h2 className="text-sm font-medium">Create bonus</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Bonuses follow HR → Finance → Super Admin approval before payroll inclusion.
          </p>
        </div>
      ) : null}

      <div className={gridClass}>
        <Field label="Employee">
          <EmployeeSelect
            employees={employees}
            value={form.watch("employeeId")}
            onValueChange={(value) => form.setValue("employeeId", value, { shouldValidate: true })}
            disabled={isPending}
          />
        </Field>
        <Field label="Bonus type">
          <LabeledSelect
            items={bonusTypeItems}
            value={form.watch("bonusType")}
            onValueChange={(value) =>
              form.setValue("bonusType", value as z.input<typeof bonusFormSchema>["bonusType"], {
                shouldValidate: true,
              })
            }
            disabled={isPending}
          />
        </Field>
        <div className="md:col-span-2">
          <BonusMonthPicker
            month={bonusMonth}
            year={bonusYear}
            onMonthChange={setBonusMonth}
            onYearChange={setBonusYear}
            disabled={isPending}
          />
        </div>
        <Field label="Amount">
          <Input
            type="number"
            min={0}
            step="0.01"
            disabled={isPending}
            {...form.register("amount")}
          />
        </Field>
        <Field label="Reason">
          <Input disabled={isPending} placeholder="Reason for bonus" {...form.register("reason")} />
        </Field>
        <Field label="Remarks" className="md:col-span-2">
          <Input disabled={isPending} placeholder="Internal remarks (optional)" {...form.register("remarks")} />
        </Field>
        <Field label="Attachment (optional)" className="md:col-span-2">
          <Input
            type="file"
            disabled={isPending}
            onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)}
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
            Add bonus
          </Button>
        </div>
      ) : (
        <Button type="submit" disabled={isPending} className="gap-1.5">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Create bonus
        </Button>
      )}
    </form>
  );
}

type BonusTableProps = {
  records: BonusItem[];
  total: number;
  page: number;
  pageSize: number;
  employees: LookupOption[];
  departments: LookupOption[];
  search?: string;
  month?: number;
  year?: number;
  bonusStatus?: BonusStatus;
  bonusType?: string;
  employeeId?: string;
  departmentId?: string;
  canApprove: boolean;
  canCreate?: boolean;
};

export function BonusTable({
  records,
  total,
  page,
  pageSize,
  employees,
  canApprove,
  canCreate = false,
}: BonusTableProps) {
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
      ...Object.entries(BONUS_STATUS_LABELS).map(([value, label]) => ({ value, label })),
    ],
    [],
  );

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const parts = r.bonusMonth?.match(/(\w+)\s+(\d{4})/);
      if (parts) {
        const monthNames = [
          "january",
          "february",
          "march",
          "april",
          "may",
          "june",
          "july",
          "august",
          "september",
          "october",
          "november",
          "december",
        ];
        const rMonth = monthNames.indexOf(parts[1].toLowerCase()) + 1;
        const rYear = Number(parts[2]);
        if (monthFilter && monthFilter !== "all" && rMonth !== Number(monthFilter)) return false;
        if (yearFilter && yearFilter !== "all" && rYear !== Number(yearFilter)) return false;
      }
      if (employeeFilter !== "all" && r.employeeId !== employeeFilter) return false;
      if (statusFilter !== "all" && r.bonusStatus !== statusFilter) return false;
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
        Add bonus
      </Button>,
    );

    return () => setHeaderActions(null);
  }, [canCreate, openCreateDialog, setHeaderActions]);

  const columns = useMemo<ColumnDef<BonusItem>[]>(
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
        accessorKey: "departmentName",
        header: "Department",
        cell: ({ row }) => row.original.departmentName ?? "—",
      },
      {
        accessorKey: "bonusType",
        header: "Type",
        cell: ({ row }) => BONUS_TYPE_LABELS[row.original.bonusType],
      },
      {
        accessorKey: "bonusMonth",
        header: "Period",
        cell: ({ row }) => formatPayrollMonthLabel(row.original.bonusMonth),
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">{formatCurrency(row.original.amount)}</span>
        ),
      },
      {
        accessorKey: "bonusStatus",
        header: "Status",
        cell: ({ row }) => (
          <div>
            <BonusStatusBadge status={row.original.bonusStatus} />
            {row.original.approvalLevel ? (
              <div className="mt-1 text-xs text-muted-foreground">
                {BONUS_APPROVAL_LEVEL_LABELS[row.original.approvalLevel]}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => format(new Date(row.original.createdAt), "MMM d, yyyy"),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            {row.original.attachmentPath ? (
              <Paperclip className="size-4 text-muted-foreground" aria-label="Attachment" />
            ) : null}
            {canApprove && row.original.bonusStatus === "pending" ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await approveBonusAction(row.original.id);
                    if (!result.success) toast.error(result.message);
                    else {
                      toast.success("Bonus approval step completed");
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
            title="No bonuses yet"
            description={
              canCreate
                ? "Add a bonus for an employee. Approved bonuses are included in the monthly payroll run."
                : "Bonus records will appear here once they are created."
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
        <BonusDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          employees={employees}
          onSaved={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}

function BonusStatusBadge({ status }: { status: BonusStatus }) {
  const styles: Record<BonusStatus, string> = {
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
      {BONUS_STATUS_LABELS[status]}
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
