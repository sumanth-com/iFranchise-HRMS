"use client";

import { Loader2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";
import { assignKpiAction, createKpiTemplateAction } from "@/lib/performance/actions";
import { KPI_PERIOD_LABELS } from "@/lib/performance/constants";
import {
  BUILTIN_KPI_PRESETS,
  getDefaultKpiDates,
  type KpiPreset,
} from "@/lib/performance/kpi-presets";
import { kpiAssignFormSchema, kpiTemplateFormSchema } from "@/lib/validations/performance";
import { cn } from "@/lib/utils";
import type { KpiTemplateItem } from "@/types/performance";
import type { LookupOption } from "@/types/employee";

const periodItems = toSelectItems(KPI_PERIOD_LABELS);
const FIELD_CLASS = "h-9";
const EMPLOYEE_SELECT_TRIGGER = "h-9 w-full min-w-[14rem]";

type TemplateSource =
  | { kind: "preset"; preset: KpiPreset }
  | { kind: "saved"; template: KpiTemplateItem };

type Props = {
  employees: LookupOption[];
  templates: KpiTemplateItem[];
  canAssign: boolean;
  onAssigned?: () => void;
};

function assignFormErrorMessage(error: z.ZodError) {
  const field = error.issues[0]?.path[0];
  if (field === "employeeId") return "Please select an employee.";
  if (field === "startDate" || field === "endDate") return "Please set start and end dates.";
  return error.issues[0]?.message ?? "Please check the assign form.";
}

export function KpiQuickAssign({ employees, templates, canAssign, onAssigned }: Props) {
  const [isPending, startTransition] = useTransition();
  const [templateKey, setTemplateKey] = useState("");
  const [source, setSource] = useState<TemplateSource | null>(null);

  const templateForm = useForm<z.input<typeof kpiTemplateFormSchema>>({
    resolver: zodResolver(kpiTemplateFormSchema),
    defaultValues: {
      name: "",
      measurementType: "number",
      weightage: 20,
      kpiPeriod: "quarterly",
      isActive: true,
    },
  });

  const assignForm = useForm<z.input<typeof kpiAssignFormSchema>>({
    resolver: zodResolver(kpiAssignFormSchema),
    defaultValues: { employeeId: "", templateId: "", startDate: "", endDate: "" },
  });

  const templateOptions = useMemo(
    () => {
      const presetNames = new Set(BUILTIN_KPI_PRESETS.map((p) => p.name.toLowerCase()));
      return [
        ...BUILTIN_KPI_PRESETS.map((preset) => ({
          value: `preset:${preset.id}`,
          label: preset.name,
        })),
        ...templates
          .filter((t) => !presetNames.has(t.name.toLowerCase()))
          .map((template) => ({
            value: `saved:${template.id}`,
            label: template.name,
          })),
      ];
    },
    [templates],
  );

  function applyTemplateKey(key: string) {
    setTemplateKey(key);
    if (!key) {
      setSource(null);
      return;
    }

    if (key.startsWith("preset:")) {
      const preset = BUILTIN_KPI_PRESETS.find((item) => item.id === key.slice(7));
      if (!preset) return;
      const dates = getDefaultKpiDates(preset.kpiPeriod);
      setSource({ kind: "preset", preset });
      templateForm.reset({
        name: preset.name,
        description: preset.description,
        measurementType: preset.measurementType,
        targetValue: preset.targetValue,
        weightage: preset.weightage,
        kpiPeriod: preset.kpiPeriod,
        isActive: true,
      });
      assignForm.reset({
        employeeId: assignForm.getValues("employeeId"),
        templateId: "",
        startDate: dates.startDate,
        endDate: dates.endDate,
      });
      return;
    }

    const template = templates.find((item) => item.id === key.slice(6));
    if (!template) return;
    const dates = getDefaultKpiDates(template.kpiPeriod);
    setSource({ kind: "saved", template });
    templateForm.reset({
      name: template.name,
      description: template.description ?? "",
      measurementType: template.measurementType,
      targetValue: template.targetValue ?? undefined,
      weightage: template.weightage,
      kpiPeriod: template.kpiPeriod,
      isActive: template.isActive,
    });
    assignForm.reset({
      employeeId: assignForm.getValues("employeeId"),
      templateId: template.id,
      startDate: dates.startDate,
      endDate: dates.endDate,
    });
  }

  function handlePeriodChange(period: z.input<typeof kpiTemplateFormSchema>["kpiPeriod"]) {
    const resolved = period ?? "quarterly";
    templateForm.setValue("kpiPeriod", resolved);
    const dates = getDefaultKpiDates(resolved);
    assignForm.setValue("startDate", dates.startDate);
    assignForm.setValue("endDate", dates.endDate);
  }

  function templateMatchesSaved(values: z.input<typeof kpiTemplateFormSchema>) {
    if (source?.kind !== "saved") return false;
    const template = source.template;
    return (
      values.name === template.name &&
      values.measurementType === template.measurementType &&
      Number(values.targetValue ?? 0) === Number(template.targetValue ?? 0) &&
      Number(values.weightage) === template.weightage &&
      values.kpiPeriod === template.kpiPeriod
    );
  }

  function handleAssign() {
    if (!canAssign) return;

    const templateValues = templateForm.getValues();
    const assignValues = assignForm.getValues();
    const templateParsed = kpiTemplateFormSchema.safeParse(templateValues);
    const assignParsed = kpiAssignFormSchema.safeParse(assignValues);

    if (!templateParsed.success) {
      toast.error("Please fill in the KPI details.");
      return;
    }
    if (!assignParsed.success) {
      toast.error(assignFormErrorMessage(assignParsed.error));
      return;
    }

    startTransition(async () => {
      let templateId = assignParsed.data.templateId;

      if (!templateId || !templateMatchesSaved(templateParsed.data)) {
        const createResult = await createKpiTemplateAction(templateParsed.data);
        if (!createResult.success) {
          toast.error(createResult.message);
          return;
        }
        templateId = createResult.data;
      }

      const assignResult = await assignKpiAction({ ...assignParsed.data, templateId });
      if (!assignResult.success) {
        toast.error(assignResult.message);
        return;
      }

      toast.success("KPI assigned");
      setTemplateKey("");
      setSource(null);
      templateForm.reset({
        name: "",
        measurementType: "number",
        weightage: 20,
        kpiPeriod: "quarterly",
        isActive: true,
      });
      assignForm.reset({ employeeId: "", templateId: "", startDate: "", endDate: "" });
      onAssigned?.();
    });
  }

  if (!canAssign) return null;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Assign KPI</h2>
        <p className="text-xs text-muted-foreground">
          Pick a template, set the target, and assign to an employee.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <CompactField label="Template" className="min-w-0 flex-1">
          <LabeledSelect
            items={[{ value: "", label: "Select a KPI template" }, ...templateOptions]}
            value={templateKey}
            onValueChange={applyTemplateKey}
            disabled={isPending}
          />
        </CompactField>
        <Button
          type="button"
          className="h-9 shrink-0 sm:w-auto"
          disabled={
            isPending || !templateKey || !assignForm.watch("employeeId") || !source
          }
          onClick={handleAssign}
        >
          {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Assign KPI
        </Button>
      </div>

      {source ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <CompactField label="Employee" className="min-w-[14rem]">
            <EmployeeSelect
              employees={employees}
              value={assignForm.watch("employeeId")}
              onValueChange={(value) =>
                assignForm.setValue("employeeId", value, { shouldValidate: true })
              }
              disabled={isPending}
              triggerClassName={EMPLOYEE_SELECT_TRIGGER}
              contentClassName="min-w-[var(--radix-select-trigger-width)]"
            />
          </CompactField>
          <CompactField label="KPI name">
            <Input className={FIELD_CLASS} disabled={isPending} {...templateForm.register("name")} />
          </CompactField>
          <CompactField label="Target">
            <Input
              type="number"
              min={0}
              step="0.01"
              className={FIELD_CLASS}
              disabled={isPending}
              {...templateForm.register("targetValue")}
            />
          </CompactField>
          <CompactField label="Review period">
            <LabeledSelect
              items={periodItems}
              value={templateForm.watch("kpiPeriod")}
              onValueChange={(value) =>
                handlePeriodChange(
                  value as z.input<typeof kpiTemplateFormSchema>["kpiPeriod"],
                )
              }
              disabled={isPending}
            />
          </CompactField>
          <CompactField label="Start date">
            <Input
              type="date"
              className={FIELD_CLASS}
              disabled={isPending}
              {...assignForm.register("startDate")}
            />
          </CompactField>
          <CompactField label="End date">
            <Input
              type="date"
              className={FIELD_CLASS}
              disabled={isPending}
              {...assignForm.register("endDate")}
            />
          </CompactField>
        </div>
      ) : null}
    </div>
  );
}

function CompactField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
