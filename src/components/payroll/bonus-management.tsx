"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { approveBonusAction, createBonusAction } from "@/lib/payroll/actions";
import { BONUS_TYPE_LABELS, BONUS_STATUS_LABELS } from "@/lib/payroll/constants";
import type { z } from "zod";
import { bonusFormSchema } from "@/lib/validations/payroll";
import { formatCurrency, formatPayrollMonthLabel } from "@/lib/payroll/services/payroll-utils";
import type { BonusItem } from "@/types/payroll";
import type { LookupOption } from "@/types/employee";

import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";

const bonusTypeItems = toSelectItems(BONUS_TYPE_LABELS);

export function BonusForm({ employees }: { employees: LookupOption[] }) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof bonusFormSchema>>({
    resolver: zodResolver(bonusFormSchema),
    defaultValues: { bonusType: "festival", amount: 0, employeeId: "" },
  });

  const selectedEmployeeId = form.watch("employeeId");
  const selectedBonusType = form.watch("bonusType");

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        startTransition(async () => {
          const result = await createBonusAction({
            ...values,
            bonusMonth: `${values.bonusMonth.slice(0, 7)}-01`,
          });
          if (!result.success) toast.error(result.message);
          else {
            toast.success("Bonus created");
            form.reset({ bonusType: "festival", amount: 0, employeeId: "" });
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
      <Field label="Bonus type">
        <LabeledSelect
          items={bonusTypeItems}
          value={selectedBonusType}
          onValueChange={(value) =>
            form.setValue("bonusType", value as z.input<typeof bonusFormSchema>["bonusType"], {
              shouldValidate: true,
            })
          }
          disabled={isPending}
        />
      </Field>
      <Field label="Amount"><Input type="number" {...form.register("amount")} /></Field>
      <Field label="Bonus month"><Input type="month" {...form.register("bonusMonth")} /></Field>
      <Field label="Reason" className="md:col-span-2">
        <Input {...form.register("reason")} />
      </Field>
      <Button type="submit" disabled={isPending}>Create bonus</Button>
    </form>
  );
}

export function BonusTable({
  records,
  canApprove,
}: {
  records: BonusItem[];
  canApprove: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-left text-muted-foreground">
            <th className="px-4 py-3">Employee</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Month</th>
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
              <td className="px-4 py-3">{BONUS_TYPE_LABELS[row.bonusType]}</td>
              <td className="px-4 py-3">{formatPayrollMonthLabel(row.bonusMonth)}</td>
              <td className="px-4 py-3">{formatCurrency(row.amount)}</td>
              <td className="px-4 py-3">{BONUS_STATUS_LABELS[row.bonusStatus]}</td>
              <td className="px-4 py-3 text-right">
                {canApprove && row.bonusStatus === "pending" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await approveBonusAction(row.id);
                        if (!result.success) toast.error(result.message);
                        else {
                          toast.success("Bonus approved");
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
