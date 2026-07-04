"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import {
  approveReimbursementAction,
  createReimbursementAction,
} from "@/lib/payroll/actions";
import {
  REIMBURSEMENT_CATEGORY_LABELS,
  REIMBURSEMENT_STATUS_LABELS,
} from "@/lib/payroll/constants";
import type { z } from "zod";
import { reimbursementFormSchema } from "@/lib/validations/payroll";
import { formatCurrency } from "@/lib/payroll/services/payroll-utils";
import type { ReimbursementItem } from "@/types/payroll";
import type { LookupOption } from "@/types/employee";

import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";

const categoryItems = toSelectItems(REIMBURSEMENT_CATEGORY_LABELS);

export function ReimbursementForm({ employees }: { employees: LookupOption[] }) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof reimbursementFormSchema>>({
    resolver: zodResolver(reimbursementFormSchema),
    defaultValues: { category: "travel", amount: 0, employeeId: "" },
  });

  const selectedEmployeeId = form.watch("employeeId");
  const selectedCategory = form.watch("category");

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        startTransition(async () => {
          const result = await createReimbursementAction(values);
          if (!result.success) toast.error(result.message);
          else {
            toast.success("Reimbursement submitted");
            form.reset({ category: "travel", amount: 0, employeeId: "" });
          }
        });
      })}
      className="grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-2"
    >
      <Field label="Employee">
        <EmployeeSelect
          employees={employees}
          value={selectedEmployeeId}
          onValueChange={(value) =>
            form.setValue("employeeId", value, { shouldValidate: true })
          }
          disabled={isPending}
        />
      </Field>
      <Field label="Category">
        <LabeledSelect
          items={categoryItems}
          value={selectedCategory}
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
      <Field label="Amount"><Input type="number" {...form.register("amount")} /></Field>
      <Field label="Expense date"><Input type="date" {...form.register("expenseDate")} /></Field>
      <Field label="Description" className="md:col-span-2">
        <Input {...form.register("description")} />
      </Field>
      <Button type="submit" disabled={isPending}>Submit reimbursement</Button>
    </form>
  );
}

export function ReimbursementTable({
  records,
  canApprove,
}: {
  records: ReimbursementItem[];
  canApprove: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-left text-muted-foreground">
            <th className="px-4 py-3">Employee</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {records.map((row) => (
            <tr key={row.id} className="border-b">
              <td className="px-4 py-3">
                <div className="font-medium">{row.employeeName}</div>
                <div className="text-xs text-muted-foreground">{row.employeeCode}</div>
              </td>
              <td className="px-4 py-3">
                {REIMBURSEMENT_CATEGORY_LABELS[row.category]}
              </td>
              <td className="px-4 py-3">
                {format(new Date(row.expenseDate), "MMM d, yyyy")}
              </td>
              <td className="px-4 py-3">{formatCurrency(row.amount)}</td>
              <td className="px-4 py-3">
                {REIMBURSEMENT_STATUS_LABELS[row.reimbursementStatus]}
              </td>
              <td className="px-4 py-3 text-right">
                {canApprove && row.reimbursementStatus === "pending" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await approveReimbursementAction(row.id);
                        if (!result.success) toast.error(result.message);
                        else {
                          toast.success("Reimbursement approved");
                          window.location.reload();
                        }
                      })
                    }
                  >
                    Approve
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
