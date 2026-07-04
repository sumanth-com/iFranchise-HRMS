"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { createSalaryRevisionAction } from "@/lib/payroll/actions";
import { SALARY_REVISION_STATUS_LABELS } from "@/lib/payroll/constants";
import { salaryRevisionFormSchema } from "@/lib/validations/payroll";
import { formatCurrency } from "@/lib/payroll/services/payroll-utils";
import type { SalaryRevisionItem } from "@/types/payroll";
import type { LookupOption } from "@/types/employee";

import { EmployeeSelect } from "@/components/payroll/payroll-select";

type FormValues = z.input<typeof salaryRevisionFormSchema>;

export function SalaryRevisionForm({ employees }: { employees: LookupOption[] }) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<FormValues>({
    resolver: zodResolver(salaryRevisionFormSchema),
    defaultValues: {
      currencyCode: "INR",
      basicSalary: 0,
      hraAmount: 0,
      transportAllowance: 0,
      otherAllowances: 0,
      components: {},
      employeeId: "",
    },
  });

  const selectedEmployeeId = form.watch("employeeId");

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        startTransition(async () => {
          const result = await createSalaryRevisionAction(values);
          if (!result.success) toast.error(result.message);
          else {
            toast.success("Salary revision recorded");
            form.reset();
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
      <Field label="Effective from">
        <Input type="date" {...form.register("effectiveFrom")} />
      </Field>
      <Field label="Reason" className="md:col-span-2">
        <Input {...form.register("reason")} />
      </Field>
      <Field label="New basic salary">
        <Input type="number" {...form.register("basicSalary")} />
      </Field>
      <Field label="New HRA">
        <Input type="number" {...form.register("hraAmount")} />
      </Field>
      <Field label="Travel allowance">
        <Input type="number" {...form.register("transportAllowance")} />
      </Field>
      <Field label="Special allowance">
        <Input type="number" {...form.register("components.specialAllowance")} />
      </Field>
      <Button type="submit" disabled={isPending} className="md:col-span-2">
        Record salary revision
      </Button>
    </form>
  );
}

export function SalaryRevisionTable({ records }: { records: SalaryRevisionItem[] }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-left text-muted-foreground">
            <th className="px-4 py-3">Employee</th>
            <th className="px-4 py-3">Old gross</th>
            <th className="px-4 py-3">New gross</th>
            <th className="px-4 py-3">Effective</th>
            <th className="px-4 py-3">Approved by</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {records.map((row) => (
            <tr key={row.id} className="border-b">
              <td className="px-4 py-3">
                <div className="font-medium">{row.employeeName}</div>
                <div className="text-xs text-muted-foreground">{row.reason}</div>
              </td>
              <td className="px-4 py-3">{formatCurrency(row.oldGrossSalary)}</td>
              <td className="px-4 py-3">{formatCurrency(row.newGrossSalary)}</td>
              <td className="px-4 py-3">
                {format(new Date(row.effectiveFrom), "MMM d, yyyy")}
              </td>
              <td className="px-4 py-3">{row.approverName ?? "—"}</td>
              <td className="px-4 py-3">
                {SALARY_REVISION_STATUS_LABELS[row.revisionStatus]}
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
