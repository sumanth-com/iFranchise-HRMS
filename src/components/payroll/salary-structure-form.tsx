"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/payroll/services/payroll-utils";
import { createSalaryStructureAction } from "@/lib/payroll/actions";
import { salaryStructureFormSchema } from "@/lib/validations/payroll";
import type { LookupOption } from "@/types/employee";

import { EmployeeSelect } from "@/components/payroll/payroll-select";

type SalaryStructureFormProps = {
  employees: LookupOption[];
};

type FormValues = z.input<typeof salaryStructureFormSchema>;

export function SalaryStructureForm({ employees }: SalaryStructureFormProps) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<FormValues>({
    resolver: zodResolver(salaryStructureFormSchema),
    defaultValues: {
      currencyCode: "INR",
      basicSalary: 0,
      hraAmount: 0,
      transportAllowance: 0,
      otherAllowances: 0,
      employeeId: "",
      components: {
        specialAllowance: 0,
        medical: 0,
        pf: 0,
        esi: 0,
        professionalTax: 0,
        incomeTax: 0,
        other: 0,
      },
    },
  });

  const selectedEmployeeId = form.watch("employeeId");

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await createSalaryStructureAction(values);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Salary structure created");
      form.reset();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Employee</Label>
          <EmployeeSelect
            employees={employees}
            value={selectedEmployeeId}
            onValueChange={(value) =>
              form.setValue("employeeId", value, { shouldValidate: true })
            }
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label>Effective from</Label>
          <Input type="date" {...form.register("effectiveFrom")} />
        </div>
        <CurrencyField label="Basic salary" name="basicSalary" form={form} disabled={isPending} />
        <CurrencyField label="HRA" name="hraAmount" form={form} disabled={isPending} />
        <CurrencyField label="Travel allowance" name="transportAllowance" form={form} disabled={isPending} />
        <CurrencyField
          label="Special allowance"
          name="components.specialAllowance"
          form={form}
          disabled={isPending}
        />
        <CurrencyField label="Medical" name="components.medical" form={form} disabled={isPending} />
        <CurrencyField label="Other allowances" name="otherAllowances" form={form} disabled={isPending} />
        <CurrencyField label="PF" name="components.pf" form={form} disabled={isPending} />
        <CurrencyField label="ESI" name="components.esi" form={form} disabled={isPending} />
        <CurrencyField
          label="Professional tax"
          name="components.professionalTax"
          form={form}
          disabled={isPending}
        />
        <CurrencyField label="Income tax" name="components.incomeTax" form={form} disabled={isPending} />
        <CurrencyField
          label="Other deductions"
          name="components.other"
          form={form}
          disabled={isPending}
        />
      </div>
      <Button type="submit" disabled={isPending}>
        Save salary structure
      </Button>
    </form>
  );
}

function CurrencyField({
  label,
  name,
  form,
  disabled,
}: {
  label: string;
  name: keyof FormValues | "components.specialAllowance" | "components.medical" | "components.pf" | "components.esi" | "components.professionalTax" | "components.incomeTax" | "components.other";
  form: ReturnType<typeof useForm<FormValues>>;
  disabled?: boolean;
}) {
  const watched = form.watch(name as keyof FormValues);
  const numericValue = Number(watched ?? 0);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          ₹
        </span>
        <Input
          type="number"
          min={0}
          step="0.01"
          className="pl-7"
          disabled={disabled}
          {...form.register(name as keyof FormValues, { valueAsNumber: true })}
        />
      </div>
      <p className="text-xs text-muted-foreground">{formatCurrency(numericValue)}</p>
    </div>
  );
}
