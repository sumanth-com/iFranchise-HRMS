"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { toUserFriendlyError } from "@/lib/errors/user-messages";
import type { z } from "zod";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { EmployeeSelect, LabeledSelect, FORM_SELECT_TRIGGER } from "@/components/payroll/payroll-select";
import { toLookupSelectItems } from "@/components/payroll/select-utils";
import {
  createSalaryStructureAction,
  updateSalaryStructureAction,
} from "@/lib/payroll/actions";
import {
  payrollHubUrl,
  TEAM_PAYROLL_SECTIONS,
} from "@/lib/payroll/constants";
import {
  DEFAULT_PROFESSIONAL_TAX,
  isEsiApplicable,
  parseSalaryAmount,
  SALARY_BREAKDOWN_RATES,
  splitMonthlyGross,
  statutoryEsi,
  statutoryPf,
  totalStatutoryDeductions,
} from "@/lib/payroll/salary-structure-breakdown";
import {
  monthDateBounds,
  monthlyGrossPerDay,
} from "@/lib/payroll/salary-structure-period";
import { formatCurrency } from "@/lib/payroll/services/payroll-utils";
import { salaryStructureFormSchema } from "@/lib/validations/payroll";
import type { LookupOption } from "@/types/employee";
import type { SalaryStructureItem } from "@/types/payroll";

type FormValues = z.input<typeof salaryStructureFormSchema>;

type DeductionKey = "pf" | "esi" | "tds" | "professionalTax" | "other";

const EMPTY_FORM_VALUES: FormValues = {
  currencyCode: "INR",
  effectiveFrom: localIsoDate(),
  basicSalary: 0,
  hraAmount: 0,
  transportAllowance: 0,
  otherAllowances: 0,
  employeeId: "",
  employmentTypeId: "",
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
  employmentTypes?: LookupOption[];
  record?: SalaryStructureItem;
  mode?: "create" | "edit";
  variant?: "page" | "dialog";
  formId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

function localIsoDate(value?: string) {
  if (value) {
    const parsed = value.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(parsed)) return parsed;
  }
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function percentLabel(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

export function toSalaryStructureFormValues(record: SalaryStructureItem): FormValues {
  const split = splitMonthlyGross(record.grossSalary);

  return {
    employeeId: record.employeeId,
    employmentTypeId: record.employmentTypeId ?? "",
    effectiveFrom: localIsoDate(record.effectiveFrom),
    effectiveTo: record.effectiveTo ?? undefined,
    currencyCode: record.currencyCode || "INR",
    basicSalary: split.basic,
    hraAmount: split.hra,
    transportAllowance: split.lta,
    otherAllowances: 0,
    components: {
      specialAllowance: split.special,
      medical: 0,
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
  employmentTypes = [],
  record,
  mode = "create",
  variant = "page",
  formId = "salary-structure-form",
  onSuccess,
  onCancel,
}: SalaryStructureFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit" && record && !record.id.startsWith("not_set_");
  const employeeLocked = Boolean(record?.employeeId);
  const isDialog = variant === "dialog";
  const [isPending, startTransition] = useTransition();
  const form = useForm<FormValues>({
    resolver: zodResolver(salaryStructureFormSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: record
      ? {
          ...toSalaryStructureFormValues(record),
          employmentTypeId:
            record.employmentTypeId ||
            employees.find((employee) => employee.id === record.employeeId)?.employmentTypeId ||
            employmentTypes.find(
              (type) =>
                type.label.trim().toLowerCase() ===
                (record.employmentTypeName ?? "").trim().toLowerCase(),
            )?.id ||
            "",
        }
      : EMPTY_FORM_VALUES,
  });

  const [grossInput, setGrossInput] = useState(() =>
    record && record.grossSalary > 0 ? String(record.grossSalary) : "",
  );
  const [enabledDeductions, setEnabledDeductions] = useState<Record<DeductionKey, boolean>>(
    () => ({
      pf: (record?.components.pf ?? 0) > 0,
      esi: (record?.components.esi ?? 0) > 0,
      tds: (record?.components.incomeTax ?? 0) > 0,
      professionalTax: (record?.components.professionalTax ?? 0) > 0,
      other: (record?.components.other ?? 0) > 0,
    }),
  );
  const [manualDeductions, setManualDeductions] = useState<Record<DeductionKey, boolean>>({
    pf: false,
    esi: false,
    tds: true,
    professionalTax: false,
    other: true,
  });

  const selectedEmployeeId = form.watch("employeeId");
  const watchedEffectiveFrom = form.watch("effectiveFrom");
  const watchedEmploymentTypeId = form.watch("employmentTypeId");
  const employmentTypeId =
    typeof watchedEmploymentTypeId === "string" ? watchedEmploymentTypeId : "";
  const pfAmount = Number(form.watch("components.pf") ?? 0);
  const esiAmount = Number(form.watch("components.esi") ?? 0);
  const tdsAmount = Number(form.watch("components.incomeTax") ?? 0);
  const professionalTaxAmount = Number(form.watch("components.professionalTax") ?? 0);
  const otherAmount = Number(form.watch("components.other") ?? 0);

  const selectedEmployee =
    employees.find((employee) => employee.id === selectedEmployeeId) ?? null;

  const employeeName = record?.employeeName || selectedEmployee?.label || "";
  const designationTitle =
    record?.designationTitle || selectedEmployee?.designationTitle || null;
  const employmentTypeItems = toLookupSelectItems(employmentTypes, { showCode: false });

  const monthlyGross = parseSalaryAmount(grossInput);
  const breakdown = useMemo(
    () => splitMonthlyGross(Number.isFinite(monthlyGross) ? monthlyGross : 0),
    [monthlyGross],
  );
  const effectiveMonth = useMemo(() => {
    const iso = localIsoDate(
      typeof watchedEffectiveFrom === "string" ? watchedEffectiveFrom : undefined,
    );
    const [year, month] = iso.split("-").map(Number);
    return monthDateBounds(month, year);
  }, [watchedEffectiveFrom]);
  const perDayAmount = monthlyGrossPerDay(
    Number.isFinite(monthlyGross) ? monthlyGross : 0,
    effectiveMonth.calendarDays,
  );

  const liveDeductions = {
    pf: enabledDeductions.pf ? Math.max(0, pfAmount) : 0,
    esi: enabledDeductions.esi ? Math.max(0, esiAmount) : 0,
    tds: enabledDeductions.tds ? Math.max(0, tdsAmount) : 0,
    professionalTax: enabledDeductions.professionalTax
      ? Math.max(0, professionalTaxAmount)
      : 0,
    other: enabledDeductions.other ? Math.max(0, otherAmount) : 0,
  };
  const totalDeductions = totalStatutoryDeductions(liveDeductions);
  const netSalary =
    Number.isFinite(monthlyGross) && monthlyGross > 0
      ? monthlyGross - totalDeductions
      : 0;

  const listUrl = payrollHubUrl({
    tab: "team",
    section: TEAM_PAYROLL_SECTIONS["salary-structures"],
  });

  function syncAutoDeductions(nextGross: number) {
    const split = splitMonthlyGross(nextGross);
    if (enabledDeductions.pf && !manualDeductions.pf) {
      form.setValue("components.pf", statutoryPf(split.basic), { shouldDirty: true });
    }
    if (enabledDeductions.esi && !manualDeductions.esi) {
      form.setValue("components.esi", statutoryEsi(nextGross), { shouldDirty: true });
    }
    if (enabledDeductions.professionalTax && !manualDeductions.professionalTax) {
      form.setValue("components.professionalTax", DEFAULT_PROFESSIONAL_TAX, {
        shouldDirty: true,
      });
    }
  }

  function handleGrossChange(value: string) {
    setGrossInput(value);
    const parsed = parseSalaryAmount(value);
    if (!Number.isFinite(parsed) || parsed < 0) return;

    const split = splitMonthlyGross(parsed);
    form.setValue("basicSalary", split.basic, { shouldDirty: true, shouldValidate: true });
    form.setValue("hraAmount", split.hra, { shouldDirty: true });
    form.setValue("transportAllowance", split.lta, { shouldDirty: true });
    form.setValue("otherAllowances", 0, { shouldDirty: true });
    form.setValue("components.specialAllowance", split.special, { shouldDirty: true });
    form.setValue("components.medical", 0, { shouldDirty: true });
    syncAutoDeductions(parsed);
  }

  function setDeductionAmount(key: DeductionKey, raw: string) {
    const parsed = parseSalaryAmount(raw);
    const amount = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    const field =
      key === "tds"
        ? "components.incomeTax"
        : key === "professionalTax"
          ? "components.professionalTax"
          : key === "other"
            ? "components.other"
            : (`components.${key}` as const);

    form.setValue(field, amount, { shouldDirty: true, shouldValidate: true });
    setManualDeductions((current) => ({ ...current, [key]: true }));
  }

  function toggleDeduction(key: DeductionKey, enabled: boolean) {
    setEnabledDeductions((current) => ({ ...current, [key]: enabled }));
    const split = splitMonthlyGross(Number.isFinite(monthlyGross) ? monthlyGross : 0);

    if (!enabled) {
      const field =
        key === "tds"
          ? "components.incomeTax"
          : key === "professionalTax"
            ? "components.professionalTax"
            : key === "other"
              ? "components.other"
              : (`components.${key}` as const);
      form.setValue(field, 0, { shouldDirty: true });
      return;
    }

    if (key === "pf") {
      form.setValue("components.pf", statutoryPf(split.basic), { shouldDirty: true });
      setManualDeductions((current) => ({ ...current, pf: false }));
    } else if (key === "esi") {
      form.setValue("components.esi", statutoryEsi(Number.isFinite(monthlyGross) ? monthlyGross : 0), {
        shouldDirty: true,
      });
      setManualDeductions((current) => ({ ...current, esi: false }));
    } else if (key === "professionalTax") {
      form.setValue("components.professionalTax", DEFAULT_PROFESSIONAL_TAX, {
        shouldDirty: true,
      });
      setManualDeductions((current) => ({ ...current, professionalTax: false }));
    }
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push(listUrl);
  }

  function onSubmit(values: FormValues) {
    const gross = parseSalaryAmount(grossInput);
    if (!Number.isFinite(gross) || gross <= 0) {
      toast.error("Enter a valid monthly gross salary greater than zero.");
      return;
    }
    if (grossInput.includes("-") || gross < 0) {
      toast.error("Salary amounts cannot be negative.");
      return;
    }

    const split = splitMonthlyGross(gross);
    const payload: FormValues = {
      ...values,
      basicSalary: split.basic,
      hraAmount: split.hra,
      transportAllowance: split.lta,
      otherAllowances: 0,
      components: {
        specialAllowance: split.special,
        medical: 0,
        pf: liveDeductions.pf,
        esi: liveDeductions.esi,
        professionalTax: liveDeductions.professionalTax,
        incomeTax: liveDeductions.tds,
        other: liveDeductions.other,
      },
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateSalaryStructureAction(record!.id, payload)
        : await createSalaryStructureAction(payload);

      if (!result.success) {
        toast.error(toUserFriendlyError(result.message, "Failed to save salary structure"));
        return;
      }

      toast.success(isEdit ? "Salary structure updated" : "Salary structure saved");

      if (onSuccess) {
        onSuccess();
        return;
      }

      if (isEdit) {
        router.push(listUrl);
        router.refresh();
      } else {
        form.reset(EMPTY_FORM_VALUES);
        setGrossInput("");
      }
    });
  }

  const deductionRows: {
    key: DeductionKey;
    label: string;
    hint: string;
    amount: number;
  }[] = [
    {
      key: "pf",
      label: "Provident Fund (PF)",
      hint: "12% of basic, capped at ₹15,000",
      amount: pfAmount,
    },
    {
      key: "esi",
      label: "Employee State Insurance (ESI)",
      hint: isEsiApplicable(Number.isFinite(monthlyGross) ? monthlyGross : 0)
        ? "0.75% of monthly gross"
        : "Not applicable above ₹21,000",
      amount: esiAmount,
    },
    {
      key: "tds",
      label: "Tax Deducted at Source (TDS)",
      hint: "Enter the TDS amount if applicable",
      amount: tdsAmount,
    },
    {
      key: "professionalTax",
      label: "Professional Tax",
      hint: "Default ₹200 — override if needed",
      amount: professionalTaxAmount,
    },
    {
      key: "other",
      label: "Other Deductions",
      hint: "Optional manual deduction",
      amount: otherAmount,
    },
  ];

  return (
    <form id={formId} onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <section className="space-y-3">
        {employeeLocked ? (
          <div>
            <p className="text-[15px] font-semibold tracking-tight">
              {employeeName}
              {designationTitle ? (
                <span className="font-medium text-muted-foreground">
                  {" "}
                  — {designationTitle}
                </span>
              ) : null}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>Employee</Label>
            <EmployeeSelect
              employees={employees}
              value={selectedEmployeeId}
              onValueChange={(value) => {
                form.setValue("employeeId", value, { shouldValidate: true });
                const nextEmployee = employees.find((employee) => employee.id === value);
                form.setValue("employmentTypeId", nextEmployee?.employmentTypeId ?? "", {
                  shouldDirty: true,
                });
              }}
              disabled={isPending}
            />
            {selectedEmployeeId && employeeName ? (
              <p className="text-sm text-muted-foreground">
                {employeeName}
                {designationTitle ? ` — ${designationTitle}` : ""}
              </p>
            ) : null}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-effective-from`}>Effective From</Label>
            <Input
              id={`${formId}-effective-from`}
              type="date"
              disabled={isPending}
              {...form.register("effectiveFrom")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Employment Type</Label>
            <LabeledSelect
              items={employmentTypeItems}
              value={employmentTypeId}
              onValueChange={(value) =>
                form.setValue("employmentTypeId", value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              placeholder="Select employment type"
              disabled={isPending}
              triggerClassName={FORM_SELECT_TRIGGER}
            />
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${formId}-gross`}>Monthly Gross Salary</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                ₹
              </span>
              <Input
                id={`${formId}-gross`}
                inputMode="decimal"
                placeholder="50,000"
                className="h-10 pl-7 text-base font-semibold"
                disabled={isPending}
                value={grossInput}
                onChange={(event) => handleGrossChange(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-per-day`}>Per Day Amount</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                ₹
              </span>
              <Input
                id={`${formId}-per-day`}
                readOnly
                tabIndex={-1}
                className="h-10 bg-muted/50 pl-7 text-base font-semibold tabular-nums"
                value={
                  perDayAmount > 0
                    ? perDayAmount.toLocaleString("en-IN", {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 0,
                      })
                    : ""
                }
                placeholder="—"
              />
            </div>
          </div>
        </div>
        {form.formState.isSubmitted && form.formState.errors.basicSalary?.message ? (
          <p className="text-xs text-destructive">{form.formState.errors.basicSalary.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Per-day amount is monthly gross ÷ {effectiveMonth.calendarDays} calendar days in the
            effective month. Components update instantly. Nothing is saved until you click Save
            Structure.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Salary Breakdown</h3>
          <p className="text-xs text-muted-foreground">
            Fixed split of monthly gross. Totals always equal 100%.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <BreakdownCard
            label="Basic Salary"
            percent={percentLabel(SALARY_BREAKDOWN_RATES.basic)}
            amount={breakdown.basic}
          />
          <BreakdownCard
            label="House Rent Allowance (HRA)"
            percent={percentLabel(SALARY_BREAKDOWN_RATES.hra)}
            amount={breakdown.hra}
          />
          <BreakdownCard
            label="Special Allowance"
            percent={percentLabel(SALARY_BREAKDOWN_RATES.special)}
            amount={breakdown.special}
          />
          <BreakdownCard
            label="Leave Travel Allowance (LTA)"
            percent={percentLabel(SALARY_BREAKDOWN_RATES.lta)}
            amount={breakdown.lta}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Statutory Deductions</h3>
          <p className="text-xs text-muted-foreground">
            Enable a deduction to auto-calculate. Amounts can be overridden by HR.
          </p>
        </div>
        <div className="divide-y rounded-xl border">
          {deductionRows.map((row) => (
            <div
              key={row.key}
              className="flex flex-wrap items-center gap-3 px-3 py-2.5"
            >
              <label className="flex min-w-[12rem] flex-1 items-start gap-2.5">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 rounded border-input"
                  checked={enabledDeductions[row.key]}
                  disabled={isPending}
                  onChange={(event) => toggleDeduction(row.key, event.target.checked)}
                />
                <span>
                  <span className="block text-sm font-medium">{row.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{row.hint}</span>
                </span>
              </label>
              <div className="relative w-[8.5rem]">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  ₹
                </span>
                <Input
                  inputMode="decimal"
                  className="h-8 pl-6"
                  disabled={isPending || !enabledDeductions[row.key]}
                  value={enabledDeductions[row.key] ? String(row.amount || "") : ""}
                  onChange={(event) => setDeductionAmount(row.key, event.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-muted/40 px-4 py-3">
        <h3 className="text-sm font-semibold">Salary Summary</h3>
        <dl className="mt-2 space-y-1.5 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Monthly Gross Salary</dt>
            <dd className="font-medium">
              {formatCurrency(Number.isFinite(monthlyGross) ? Math.max(0, monthlyGross) : 0)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Per Day Amount</dt>
            <dd className="font-medium">{formatCurrency(perDayAmount)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Total Deductions</dt>
            <dd className="font-medium">{formatCurrency(totalDeductions)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t pt-2">
            <dt className="font-semibold">Net Salary</dt>
            <dd className="text-base font-semibold">{formatCurrency(Math.max(0, netSalary))}</dd>
          </div>
        </dl>
      </section>

      <div
        className={
          isDialog
            ? "flex flex-wrap items-center justify-end gap-2 border-t pt-4"
            : "flex flex-wrap items-center gap-2"
        }
      >
        <Button type="button" variant="outline" disabled={isPending} onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {isEdit ? "Save changes" : "Save Structure"}
        </Button>
      </div>
    </form>
  );
}

function BreakdownCard({
  label,
  percent,
  amount,
}: {
  label: string;
  percent: string;
  amount: number;
}) {
  return (
    <div className="rounded-xl border bg-card px-3.5 py-3">
      <p className="text-xs font-medium text-muted-foreground">
        {label} ({percent})
      </p>
      <p className="mt-1 text-lg font-semibold tracking-tight">{formatCurrency(amount)}</p>
    </div>
  );
}
