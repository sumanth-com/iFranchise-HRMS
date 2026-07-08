"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { StickyPageActions } from "@/components/common/sticky-layout";
import { Label } from "@/components/ui/label";
import { saveExitSettingsAction } from "@/lib/exit/actions";
import {
  exitSettingsSchema,
  type ExitSettingsFormInput,
  type ExitSettingsFormValues,
} from "@/lib/validations/exit";
import type { ExitSettings } from "@/types/exit";

type Props = {
  settings: ExitSettings;
  canEdit: boolean;
};

export function ExitSettingsForm({ settings, canEdit }: Props) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<ExitSettingsFormInput, unknown, ExitSettingsFormValues>({
    resolver: zodResolver(exitSettingsSchema),
    defaultValues: settings,
  });

  const departments = form.watch("clearanceDepartments") ?? [];

  function onSubmit(values: ExitSettingsFormValues) {
    startTransition(async () => {
      const result = await saveExitSettingsAction(values);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      form.reset(result.data);
      toast.success("Exit settings saved");
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex min-h-full flex-col gap-6"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Exit Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Notice periods, clearance departments, interviews, and retention.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Default notice period (days)</Label>
            <Input
              type="number"
              min={0}
              max={365}
              disabled={!canEdit || isPending}
              {...form.register("defaultNoticePeriodDays")}
            />
          </div>
          <div className="space-y-2">
            <Label>Document retention (days)</Label>
            <Input
              type="number"
              min={30}
              disabled={!canEdit || isPending}
              {...form.register("retentionPeriodDays")}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-medium">Clearance Departments</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Departments that must clear no-dues for every exit.
        </p>
        <div className="space-y-2">
          {departments.map((dept, index) => (
            <div key={`dept-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                placeholder="Key (e.g. it)"
                disabled={!canEdit || isPending}
                value={dept.key}
                onChange={(e) => {
                  const next = [...departments];
                  next[index] = { ...next[index], key: e.target.value };
                  form.setValue("clearanceDepartments", next, { shouldDirty: true });
                }}
              />
              <Input
                placeholder="Label (e.g. IT)"
                disabled={!canEdit || isPending}
                value={dept.label}
                onChange={(e) => {
                  const next = [...departments];
                  next[index] = { ...next[index], label: e.target.value };
                  form.setValue("clearanceDepartments", next, { shouldDirty: true });
                }}
              />
              {canEdit ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={isPending || departments.length <= 1}
                  onClick={() => {
                    form.setValue(
                      "clearanceDepartments",
                      departments.filter((_, i) => i !== index),
                      { shouldDirty: true },
                    );
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ))}
          {canEdit ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                form.setValue(
                  "clearanceDepartments",
                  [...departments, { key: "new_dept", label: "New Department" }],
                  { shouldDirty: true },
                )
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Department
            </Button>
          ) : null}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-medium">Automation</h2>
        {(
          [
            {
              key: "enableExitInterview" as const,
              title: "Enable exit interview",
              description: "Require or allow exit interviews in the pipeline",
            },
            {
              key: "autoGenerateDocuments" as const,
              title: "Auto-generate documents",
              description: "Generate relief letters when settlement completes",
            },
            {
              key: "autoArchiveEmployee" as const,
              title: "Auto-archive employee",
              description: "Archive employee record when exit is completed",
            },
          ] as const
        ).map((item) => (
          <label
            key={item.key}
            className="flex items-start gap-3 rounded-lg border px-4 py-3 text-sm"
          >
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-input"
              checked={Boolean(form.watch(item.key))}
              disabled={!canEdit || isPending}
              onChange={(e) =>
                form.setValue(item.key, e.target.checked, { shouldDirty: true })
              }
            />
            <span>
              <span className="font-medium">{item.title}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {item.description}
              </span>
            </span>
          </label>
        ))}
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
