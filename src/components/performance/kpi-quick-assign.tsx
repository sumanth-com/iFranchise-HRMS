"use client";

import { Loader2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import type { KpiTemplateItem } from "@/types/performance";
import type { LookupOption } from "@/types/employee";

const periodItems = toSelectItems(KPI_PERIOD_LABELS);

type TemplateSource =
  | { kind: "preset"; preset: KpiPreset }
  | { kind: "saved"; template: KpiTemplateItem };

type Props = {
  employees: LookupOption[];
  templates: KpiTemplateItem[];
  canAssign: boolean;
};

export function KpiQuickAssign({ employees, templates, canAssign }: Props) {
  const router = useRouter();
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
    () => [
      ...BUILTIN_KPI_PRESETS.map((preset) => ({
        value: `preset:${preset.id}`,
        label: preset.name,
      })),
      ...templates.map((template) => ({
        value: `saved:${template.id}`,
        label: `${template.name} (saved)`,
      })),
    ],
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
      toast.error("Please select an employee.");
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
      router.refresh();
    });
  }

  if (!canAssign) return null;

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-semibold">Assign KPI</h2>
        <p className="text-xs text-muted-foreground">
          Choose a template, set the target, and assign to an employee.
        </p>
      </div>

      <div className="space-y-4">
        <Field label="Template">
          <LabeledSelect
            items={[{ value: "", label: "Select a KPI template" }, ...templateOptions]}
            value={templateKey}
            onValueChange={applyTemplateKey}
            disabled={isPending}
          />
        </Field>

        {source ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Employee">
              <EmployeeSelect
                employees={employees}
                value={assignForm.watch("employeeId")}
                onValueChange={(value) =>
                  assignForm.setValue("employeeId", value, { shouldValidate: true })
                }
                disabled={isPending}
              />
            </Field>
            <Field label="KPI name">
              <Input disabled={isPending} {...templateForm.register("name")} />
            </Field>
            <Field label="Target">
              <Input
                type="number"
                min={0}
                step="0.01"
                disabled={isPending}
                {...templateForm.register("targetValue")}
              />
            </Field>
            <Field label="Review period">
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
            </Field>
            <Field label="Start date">
              <Input type="date" disabled={isPending} {...assignForm.register("startDate")} />
            </Field>
            <Field label="End date">
              <Input type="date" disabled={isPending} {...assignForm.register("endDate")} />
            </Field>
            <div className="md:col-span-2">
              <Button type="button" disabled={isPending} onClick={handleAssign}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Assign KPI
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
