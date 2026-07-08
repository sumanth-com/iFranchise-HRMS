"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { CheckCircle2, Loader2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BonusMonthPicker } from "@/components/payroll/bonus-month-picker";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";
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
import { bonusFormSchema } from "@/lib/validations/payroll";
import type { BonusItem, BonusStatus } from "@/types/payroll";
import type { LookupOption } from "@/types/employee";

const bonusTypeItems = toSelectItems(BONUS_TYPE_LABELS);

type BonusFormProps = {
  employees: LookupOption[];
};

export function BonusForm({ employees }: BonusFormProps) {
  const now = new Date();
  const [isPending, startTransition] = useTransition();
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [bonusMonth, setBonusMonth] = useState(now.getMonth() + 1);
  const [bonusYear, setBonusYear] = useState(now.getFullYear());

  const form = useForm<z.input<typeof bonusFormSchema>>({
    resolver: zodResolver(bonusFormSchema),
    defaultValues: {
      bonusType: "festival",
      amount: 0,
      employeeId: "",
      reason: "",
      remarks: "",
    },
  });

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-sm font-medium">Create bonus</h2>
        <p className="text-xs text-muted-foreground">
          Bonuses follow HR → Finance → Super Admin approval before payroll inclusion.
        </p>
      </div>

      <form
        onSubmit={form.handleSubmit((values) => {
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
            form.reset({ bonusType: "festival", amount: 0, employeeId: "", reason: "", remarks: "" });
            setAttachmentFile(null);
            window.location.reload();
          });
        })}
        className="grid gap-4 md:grid-cols-2"
      >
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
          <Input type="number" min={0} step="0.01" disabled={isPending} {...form.register("amount")} />
        </Field>
        <Field label="Approval status">
          <div className="flex h-8 items-center rounded-lg border bg-muted/40 px-3 text-sm">
            Pending
          </div>
        </Field>
        <Field label="Reason">
          <Input disabled={isPending} placeholder="Reason for bonus" {...form.register("reason")} />
        </Field>
        <Field label="Remarks">
          <Input disabled={isPending} placeholder="Internal remarks" {...form.register("remarks")} />
        </Field>
        <Field label="Attachment (optional)" className="md:col-span-2">
          <Input
            type="file"
            disabled={isPending}
            onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)}
          />
        </Field>
        <div className="md:col-span-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create bonus
          </Button>
        </div>
      </form>
    </section>
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
};

export function BonusTable({
  records,
  total,
  page,
  pageSize,
  employees,
  departments,
  search = "",
  month,
  year,
  bonusStatus,
  bonusType,
  employeeId,
  departmentId,
  canApprove,
}: BonusTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

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
      { accessorKey: "employeeCode", header: "Employee ID" },
      { accessorKey: "departmentName", header: "Department", cell: ({ row }) => row.original.departmentName ?? "—" },
      {
        accessorKey: "bonusType",
        header: "Bonus Type",
        cell: ({ row }) => BONUS_TYPE_LABELS[row.original.bonusType],
      },
      {
        accessorKey: "bonusMonth",
        header: "Bonus Month",
        cell: ({ row }) => formatPayrollMonthLabel(row.original.bonusMonth),
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => formatCurrency(row.original.amount),
      },
      {
        accessorKey: "bonusStatus",
        header: "Status",
        cell: ({ row }) => (
          <div>
            <div>{BONUS_STATUS_LABELS[row.original.bonusStatus]}</div>
            {row.original.approvalLevel ? (
              <div className="text-xs text-muted-foreground">
                {BONUS_APPROVAL_LEVEL_LABELS[row.original.approvalLevel]}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "approverName",
        header: "Approved By",
        cell: ({ row }) => row.original.approverName ?? "—",
      },
      {
        accessorKey: "createdAt",
        header: "Created Date",
        cell: ({ row }) => format(new Date(row.original.createdAt), "MMM d, yyyy"),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            {row.original.attachmentPath ? (
              <Paperclip className="h-4 w-4 text-muted-foreground" aria-label="Attachment available" />
            ) : null}
            {canApprove && row.original.bonusStatus === "pending" ? (
              <Button
                size="sm"
                variant="outline"
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
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Approve
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canApprove, isPending, router, startTransition],
  );

  const table = useReactTable({ data: records, columns, getCoreRowModel: getCoreRowModel() });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="space-y-4">
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {records.length === 0 ? (
          <EmptyState
            title="No bonuses found"
            description="Create a bonus to see records here."
            className="border-0"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="h-11 whitespace-nowrap px-4">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-3">
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
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => updateParams({ page: String(page - 1) })}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => updateParams({ page: String(page + 1) })}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </section>
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
