"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
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
        <NumberField label="Basic salary" {...form.register("basicSalary")} />
        <NumberField label="HRA" {...form.register("hraAmount")} />
        <NumberField label="Travel allowance" {...form.register("transportAllowance")} />
        <NumberField
          label="Special allowance"
          {...form.register("components.specialAllowance")}
        />
        <NumberField label="Medical" {...form.register("components.medical")} />
        <NumberField label="Other allowances" {...form.register("otherAllowances")} />
        <NumberField label="PF" {...form.register("components.pf")} />
        <NumberField label="ESI" {...form.register("components.esi")} />
        <NumberField
          label="Professional tax"
          {...form.register("components.professionalTax")}
        />
        <NumberField label="Income tax" {...form.register("components.incomeTax")} />
        <NumberField
          label="Other deductions"
          {...form.register("components.other")}
        />
      </div>
      <Button type="submit" disabled={isPending}>
        Save salary structure
      </Button>
    </form>
  );
}

function NumberField({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="number" min={0} step="0.01" {...props} />
    </div>
  );
}
