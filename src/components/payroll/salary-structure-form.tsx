"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/payroll/services/payroll-utils";
import {
  createSalaryStructureAction,
  updateSalaryStructureAction,
} from "@/lib/payroll/actions";
import {
  payrollHubUrl,
  TEAM_PAYROLL_SECTIONS,
} from "@/lib/payroll/constants";
import { salaryStructureFormSchema } from "@/lib/validations/payroll";
import type { LookupOption } from "@/types/employee";
import type { SalaryStructureItem } from "@/types/payroll";

import { EmployeeSelect } from "@/components/payroll/payroll-select";

const EMPTY_FORM_VALUES: FormValues = {
  currencyCode: "INR",
  effectiveFrom: "",
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
};

type SalaryStructureFormProps = {
  employees: LookupOption[];
  record?: SalaryStructureItem;
  mode?: "create" | "edit";
  variant?: "page" | "dialog";
  formId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

type FormValues = z.input<typeof salaryStructureFormSchema>;

export function toSalaryStructureFormValues(record: SalaryStructureItem): FormValues {
  const specialAllowance = record.components.specialAllowance ?? 0;
  const medical = record.components.medical ?? 0;
  const baseOtherAllowances = Math.max(
    0,
    record.otherAllowances - specialAllowance - medical,
  );

  return {
    employeeId: record.employeeId,
    effectiveFrom: record.effectiveFrom,
    effectiveTo: record.effectiveTo ?? undefined,
    currencyCode: record.currencyCode,
    basicSalary: record.basicSalary,
    hraAmount: record.hraAmount,
    transportAllowance: record.transportAllowance,
    otherAllowances: baseOtherAllowances,
    components: {
      specialAllowance,
      medical,
      pf: record.components.pf ?? 0,
      esi: record.components.esi ?? 0,
      professionalTax: record.components.professionalTax ?? 0,
      incomeTax: record.components.incomeTax ?? 0,
      other: record.components.other ?? 0,
    },
  };
}

export function SalaryStructureForm({
  employees,
  record,
  mode = "create",
  variant = "page",
  formId = "salary-structure-form",
  onSuccess,
  onCancel,
}: SalaryStructureFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit" && record && !record.id.startsWith("not_set_");
  const isDialog = variant === "dialog";
  const [isPending, startTransition] = useTransition();
  const form = useForm<FormValues>({
    resolver: zodResolver(salaryStructureFormSchema),
    defaultValues: record ? toSalaryStructureFormValues(record) : EMPTY_FORM_VALUES,
  });

  const selectedEmployeeId = form.watch("employeeId");
  const listUrl = payrollHubUrl({
    tab: "team",
    section: TEAM_PAYROLL_SECTIONS["salary-structures"],
  });

  function handleCancel() {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push(listUrl);
  }

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = isEdit
        ? await updateSalaryStructureAction(record!.id, values)
        : await createSalaryStructureAction(values);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(isEdit ? "Salary structure updated" : "Salary structure created");

      if (onSuccess) {
        onSuccess();
        return;
      }

      if (isEdit) {
        router.push(listUrl);
        router.refresh();
      } else {
        form.reset(EMPTY_FORM_VALUES);
      }
    });
  }

  const fieldsGridClass = isDialog
    ? "grid gap-3 md:grid-cols-2"
    : "grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-2";

  return (
    <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className={fieldsGridClass}>
        <div className="space-y-2">
          <Label>Employee</Label>
          <EmployeeSelect
            employees={employees}
            value={selectedEmployeeId}
            onValueChange={(value) =>
              form.setValue("employeeId", value, { shouldValidate: true })
            }
            disabled={isPending || Boolean(isEdit)}
          />
        </div>
        <div className="space-y-2">
          <Label>Effective from</Label>
          <Input type="date" disabled={isPending} {...form.register("effectiveFrom")} />
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

      {!isDialog ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={isPending}>
            {isEdit ? "Save changes" : "Save salary structure"}
          </Button>
          <Button type="button" variant="outline" disabled={isPending} onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" disabled={isPending} onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isEdit ? "Save changes" : "Add salary structure"}
          </Button>
        </div>
      )}
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
  name:
    | keyof FormValues
    | "components.specialAllowance"
    | "components.medical"
    | "components.pf"
    | "components.esi"
    | "components.professionalTax"
    | "components.incomeTax"
    | "components.other";
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
      <p className="text-xs text-muted-foreground">
        {formatCurrency(numericValue)}
      </p>
    </div>
  );
}
