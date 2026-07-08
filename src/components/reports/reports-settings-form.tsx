"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { StickyPageActions } from "@/components/common/sticky-layout";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { saveReportsSettingsAction } from "@/lib/reports/actions";
import {
  reportsSettingsSchema,
  type ReportsSettingsFormInput,
  type ReportsSettingsFormValues,
} from "@/lib/validations/reports";
import type { ReportModuleKey, ReportsSettings } from "@/types/reports";

type Props = {
  settings: ReportsSettings;
  canEdit: boolean;
};

const MODULE_OPTIONS: { key: ReportModuleKey; label: string }[] = [
  { key: "hr", label: "HR" },
  { key: "attendance", label: "Attendance" },
  { key: "leave", label: "Leave" },
  { key: "payroll", label: "Payroll" },
  { key: "performance", label: "Performance" },
  { key: "recruitment", label: "Recruitment" },
  { key: "assets", label: "Assets" },
  { key: "exit", label: "Exit" },
];

const FORMAT_ITEMS = [
  { value: "csv", label: "CSV" },
  { value: "excel", label: "Excel" },
  { value: "pdf", label: "PDF" },
];

export function ReportsSettingsForm({ settings, canEdit }: Props) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<ReportsSettingsFormInput, unknown, ReportsSettingsFormValues>({
    resolver: zodResolver(reportsSettingsSchema),
    defaultValues: settings,
  });

  const enabledModules = form.watch("enabledModules") ?? [];

  function toggleModule(key: ReportModuleKey, checked: boolean) {
    const next = checked
      ? Array.from(new Set([...enabledModules, key]))
      : enabledModules.filter((m) => m !== key);
    form.setValue("enabledModules", next, { shouldDirty: true });
  }

  function onSubmit(values: ReportsSettingsFormValues) {
    startTransition(async () => {
      const result = await saveReportsSettingsAction(values);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      form.reset(result.data);
      toast.success("Reports settings saved");
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex min-h-full flex-col gap-6"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Defaults for exports, date ranges, modules, and scheduled deliveries.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Default export format</Label>
            <LabeledSelect
              items={FORMAT_ITEMS}
              value={form.watch("defaultExportFormat")}
              disabled={!canEdit || isPending}
              onValueChange={(value) =>
                form.setValue(
                  "defaultExportFormat",
                  value as ReportsSettings["defaultExportFormat"],
                  { shouldDirty: true },
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Default date range (days)</Label>
            <Input
              type="number"
              min={7}
              max={365}
              disabled={!canEdit || isPending}
              {...form.register("defaultDateRangeDays")}
            />
          </div>
          <div className="space-y-2">
            <Label>Retain schedule runs (days)</Label>
            <Input
              type="number"
              min={7}
              max={3650}
              disabled={!canEdit || isPending}
              {...form.register("scheduleRetainRuns")}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-medium">Enabled modules</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Control which module report sections are available.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {MODULE_OPTIONS.map((item) => (
            <label
              key={item.key}
              className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm"
            >
              <input
                type="checkbox"
                className="size-4 rounded border-input"
                checked={enabledModules.includes(item.key)}
                disabled={!canEdit || isPending}
                onChange={(e) => toggleModule(item.key, e.target.checked)}
              />
              <span className="font-medium">{item.label}</span>
            </label>
          ))}
        </div>
        {form.formState.errors.enabledModules ? (
          <p className="mt-2 text-sm text-destructive">
            {form.formState.errors.enabledModules.message ??
              "Select at least one module"}
          </p>
        ) : null}
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-medium">Scheduling</h2>
        <label className="flex items-start gap-3 rounded-lg border px-4 py-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-input"
            checked={Boolean(form.watch("scheduleEmailEnabled"))}
            disabled={!canEdit || isPending}
            onChange={(e) =>
              form.setValue("scheduleEmailEnabled", e.target.checked, {
                shouldDirty: true,
              })
            }
          />
          <span>
            <span className="font-medium">Enable schedule emails</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              When off, due schedules still run but recipient email is skipped.
            </span>
          </span>
        </label>
      </section>

      {canEdit ? (
        <StickyPageActions>
          <Button
            type="button"
            variant="outline"
            disabled={!form.formState.isDirty || isPending}
            onClick={() => form.reset(settings)}
          >
            Cancel changes
          </Button>
          <Button type="submit" disabled={!form.formState.isDirty || isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Settings
          </Button>
        </StickyPageActions>
      ) : null}
    </form>
  );
}
