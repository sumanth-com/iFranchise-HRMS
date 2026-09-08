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
import { CheckCircle2, Eye, Loader2, Paperclip, Plus, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReimbursementDialog } from "@/components/payroll/reimbursement-dialog";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import { ReimbursementStatusBadge } from "@/components/payroll/reimbursement-status-badge";
import { toEmployeeSelectItems } from "@/components/payroll/select-utils";
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
  getReimbursementAttachmentUrlAction,
  rejectReimbursementAction,
} from "@/lib/payroll/actions";
import {
  EMPLOYEE_REIMBURSEMENT_CATEGORIES,
  REIMBURSEMENT_CATEGORY_LABELS,
  REIMBURSEMENT_STATUS_LABELS,
} from "@/lib/payroll/constants";
import { formatCurrency } from "@/lib/payroll/services/payroll-utils";
import { getHrmsYearSelectItems } from "@/lib/date/hrms-year";
import { reimbursementFormSchema } from "@/lib/validations/payroll";
import type { ReimbursementItem } from "@/types/payroll";
import type { LookupOption } from "@/types/employee";

type DecisionMode = "approve" | "reject" | "view";

function attachmentPathsFor(item: ReimbursementItem): string[] {
  if (item.receiptPaths?.length) return item.receiptPaths;
  if (item.receiptPath) return [item.receiptPath];
  return [];
}

function fileNameFromPath(path: string) {
  return path.split("/").pop() || path;
}

const categoryItems = EMPLOYEE_REIMBURSEMENT_CATEGORIES.map((value) => ({
  value,
  label: REIMBURSEMENT_CATEGORY_LABELS[value],
}));

const EMPTY_REIMBURSEMENT_VALUES: z.input<typeof reimbursementFormSchema> = {
  category: "travel",
  amount: 0,
  employeeId: "",
  expenseDate: "",
  description: "",
  receiptPaths: [],
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
        toast.error(result.message || "Submit failed");
        return;
      }

      toast.success("Claim submitted");
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
  const [decisionRow, setDecisionRow] = useState<ReimbursementItem | null>(null);
  const [decisionMode, setDecisionMode] = useState<DecisionMode>("view");
  const [remarks, setRemarks] = useState("");
  const [openingPath, setOpeningPath] = useState<string | null>(null);

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

  const openDecision = useCallback((row: ReimbursementItem, mode: DecisionMode) => {
    setDecisionRow(row);
    setDecisionMode(mode);
    setRemarks("");
  }, []);

  const closeDecision = useCallback(() => {
    setDecisionRow(null);
    setDecisionMode("view");
    setRemarks("");
  }, []);

  async function openAttachment(path: string) {
    setOpeningPath(path);
    try {
      const result = await getReimbursementAttachmentUrlAction(path);
      if (!result.success) {
        toast.error(result.message || "Could not open file");
        return;
      }
      if (!result.data) {
        toast.error("Could not open file");
        return;
      }
      window.open(result.data, "_blank", "noopener,noreferrer");
    } finally {
      setOpeningPath(null);
    }
  }

  function confirmDecision() {
    if (!decisionRow || decisionMode === "view") return;
    const payload = {
      reimbursementId: decisionRow.id,
      remarks: remarks.trim() || null,
    };
    startTransition(async () => {
      const result =
        decisionMode === "approve"
          ? await approveReimbursementAction(payload)
          : await rejectReimbursementAction(payload);
      if (!result.success) {
        toast.error(result.message || "Action failed");
        return;
      }
      toast.success(
        decisionMode === "approve" ? "Claim approved" : "Claim rejected",
      );
      closeDecision();
      router.refresh();
    });
  }

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
        id: "department",
        header: "Department",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.departmentName?.trim() || "—"}
          </span>
        ),
      },
      {
        accessorKey: "category",
        header: "Type",
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
        id: "attachments",
        header: "Attachments",
        cell: ({ row }) => {
          const count = attachmentPathsFor(row.original).length;
          return (
            <span className="inline-flex items-center gap-1.5 tabular-nums text-muted-foreground">
              <Paperclip className="size-3.5" />
              {count}
            </span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Submitted",
        cell: ({ row }) => format(new Date(row.original.createdAt), "MMM d, yyyy"),
      },
      {
        accessorKey: "reimbursementStatus",
        header: "Status",
        cell: ({ row }) => (
          <ReimbursementStatusBadge status={row.original.reimbursementStatus} />
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const pending = row.original.reimbursementStatus === "pending";
          return (
            <div className="flex items-center justify-end gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 px-2"
                onClick={() => openDecision(row.original, "view")}
              >
                <Eye className="size-3.5" />
                View
              </Button>
              {canApprove && pending ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5"
                    disabled={isPending}
                    onClick={() => openDecision(row.original, "approve")}
                  >
                    <CheckCircle2 className="size-3.5" />
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-destructive hover:text-destructive"
                    disabled={isPending}
                    onClick={() => openDecision(row.original, "reject")}
                  >
                    <XCircle className="size-3.5" />
                    Reject
                  </Button>
                </>
              ) : null}
            </div>
          );
        },
      },
    ],
    [canApprove, isPending, openDecision],
  );

  const table = useReactTable({ data: filteredRecords, columns, getCoreRowModel: getCoreRowModel() });
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const decisionAttachments = decisionRow ? attachmentPathsFor(decisionRow) : [];

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

      <Dialog
        open={Boolean(decisionRow)}
        onOpenChange={(open) => {
          if (!open) closeDecision();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {decisionMode === "approve"
                ? "Approve expense claim"
                : decisionMode === "reject"
                  ? "Reject expense claim"
                  : "Expense claim details"}
            </DialogTitle>
          </DialogHeader>

          {decisionRow ? (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Employee</p>
                  <p className="font-medium">{decisionRow.employeeName}</p>
                  <p className="text-xs text-muted-foreground">{decisionRow.employeeCode}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Department</p>
                  <p>{decisionRow.departmentName?.trim() || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Type</p>
                  <p>{REIMBURSEMENT_CATEGORY_LABELS[decisionRow.category]}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Status</p>
                  <ReimbursementStatusBadge status={decisionRow.reimbursementStatus} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Expense date</p>
                  <p>{format(new Date(decisionRow.expenseDate), "MMM d, yyyy")}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Amount</p>
                  <p className="font-semibold tabular-nums">
                    {formatCurrency(decisionRow.amount)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Submitted</p>
                  <p>{format(new Date(decisionRow.createdAt), "MMM d, yyyy")}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Description</p>
                <p className="whitespace-pre-wrap">
                  {decisionRow.description?.trim() || "—"}
                </p>
              </div>

              {(decisionRow.reviewRemarks?.trim() ||
                decisionRow.rejectionReason?.trim()) &&
              decisionMode === "view" ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Remarks</p>
                  <p className="whitespace-pre-wrap">
                    {decisionRow.reviewRemarks?.trim() ||
                      decisionRow.rejectionReason?.trim()}
                  </p>
                </div>
              ) : null}

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Attachments</p>
                {decisionAttachments.length === 0 ? (
                  <p className="text-muted-foreground">No attachments</p>
                ) : (
                  <ul className="space-y-1.5">
                    {decisionAttachments.map((path) => (
                      <li key={path}>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 max-w-full gap-1.5"
                          disabled={openingPath === path}
                          onClick={() => openAttachment(path)}
                        >
                          {openingPath === path ? (
                            <Loader2 className="size-3.5 shrink-0 animate-spin" />
                          ) : (
                            <Paperclip className="size-3.5 shrink-0" />
                          )}
                          <span className="truncate">{fileNameFromPath(path)}</span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {decisionMode === "approve" || decisionMode === "reject" ? (
                <div className="space-y-2">
                  <Label htmlFor="reimbursement-decision-remarks">
                    Remarks (optional)
                  </Label>
                  <textarea
                    id="reimbursement-decision-remarks"
                    value={remarks}
                    onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setRemarks(event.target.value)
                    }
                    placeholder={
                      decisionMode === "approve"
                        ? "Optional approval notes"
                        : "Optional rejection reason"
                    }
                    rows={3}
                    disabled={isPending}
                    className="min-h-[80px] w-full rounded-lg border border-input bg-white px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            {decisionMode === "view" ? (
              <Button type="button" variant="secondary" onClick={closeDecision}>
                Close
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={closeDecision}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant={decisionMode === "reject" ? "destructive" : "default"}
                  disabled={isPending}
                  className="gap-1.5"
                  onClick={confirmDecision}
                >
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {decisionMode === "approve" ? "Confirm approve" : "Confirm reject"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
