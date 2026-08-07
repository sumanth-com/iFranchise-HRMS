"use client";

import { Loader2, Plus, X } from "lucide-react";
import { useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { updateRecruitmentSettingsAction } from "@/lib/recruitment/actions";
import { DEFAULT_CANDIDATE_SOURCES } from "@/lib/recruitment/constants";
import {
  recruitmentSettingsSchema,
  type RecruitmentSettingsFormInput,
  type RecruitmentSettingsFormValues,
} from "@/lib/validations/recruitment";
import type { RecruitmentSettings } from "@/types/recruitment";
import { cn } from "@/lib/utils";

type Props = {
  settings: RecruitmentSettings;
  canEdit: boolean;
};

const BUILTIN_SOURCE_IDS = new Set<string>(DEFAULT_CANDIDATE_SOURCES.map((source) => source.id));

export function RecruitmentSettingsForm({ settings, canEdit }: Props) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<RecruitmentSettingsFormInput, unknown, RecruitmentSettingsFormValues>({
    resolver: zodResolver(recruitmentSettingsSchema),
    defaultValues: settings,
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "candidateSources",
  });

  const noticePeriods = form.watch("noticePeriodOptions") ?? [];

  function onSubmit(values: RecruitmentSettingsFormValues) {
    startTransition(async () => {
      const result = await updateRecruitmentSettingsAction(values);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      form.reset(result.data);
      toast.success("Recruitment settings saved");
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Recruitment Settings</h1>
          <p className="text-xs text-muted-foreground">
            Offer email defaults, candidate sources, and notice period options.
          </p>
        </div>
        {canEdit ? (
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!form.formState.isDirty || isPending}
              onClick={() => form.reset(settings)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!form.formState.isDirty || isPending}>
              {isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Save
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <SettingsCard
          title="Offer email defaults"
          description="Used on the Offers page when sending uploaded offer letters. Placeholders: {{candidateName}}, {{position}}, {{hrEmail}}, {{hrPhone}}."
        >
          <div className="space-y-3">
            <Field label="Default email subject">
              <Input
                className="h-9"
                disabled={!canEdit || isPending}
                {...form.register("offerEmailDefaults.subjectTemplate")}
              />
            </Field>
            <Field label="Default email message">
              <textarea
                className="min-h-[140px] w-full rounded-md border bg-background px-3 py-2 text-sm leading-relaxed"
                disabled={!canEdit || isPending}
                {...form.register("offerEmailDefaults.messageTemplate")}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="HR contact email">
                <Input
                  className="h-9"
                  type="email"
                  disabled={!canEdit || isPending}
                  {...form.register("offerEmailDefaults.hrEmail")}
                />
              </Field>
              <Field label="HR contact phone">
                <Input
                  className="h-9"
                  disabled={!canEdit || isPending}
                  {...form.register("offerEmailDefaults.hrPhone")}
                />
              </Field>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Notice period options"
          description="Shown on candidate profiles when capturing availability."
        >
          <div className="flex flex-wrap gap-2">
            {noticePeriods.map((option, index) => (
              <div
                key={`${option}-${index}`}
                className="inline-flex items-center gap-1 rounded-full border bg-muted/20 px-2 py-1"
              >
                <Input
                  className="h-6 w-[5.5rem] min-w-0 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
                  disabled={!canEdit || isPending}
                  value={option}
                  onChange={(event) => {
                    const next = [...noticePeriods];
                    next[index] = event.target.value;
                    form.setValue("noticePeriodOptions", next, { shouldDirty: true });
                  }}
                />
                {canEdit ? (
                  <button
                    type="button"
                    className="rounded-full p-0.5 text-muted-foreground hover:text-destructive"
                    disabled={isPending || noticePeriods.length <= 1}
                    onClick={() => {
                      form.setValue(
                        "noticePeriodOptions",
                        noticePeriods.filter((_, itemIndex) => itemIndex !== index),
                        { shouldDirty: true },
                      );
                    }}
                    aria-label="Remove notice period"
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {canEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 h-8"
              disabled={isPending}
              onClick={() =>
                form.setValue("noticePeriodOptions", [...noticePeriods, "New option"], {
                  shouldDirty: true,
                })
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add option
            </Button>
          ) : null}
        </SettingsCard>

        <SettingsCard
          title="Candidate sources"
          description="Enabled sources appear when adding candidates."
          className="lg:col-span-2"
        >
          <div className="flex flex-wrap gap-2">
            {fields.map((field, index) => {
              const label = form.watch(`candidateSources.${index}.label`) || field.label;
              const enabled = form.watch(`candidateSources.${index}.enabled`);
              const isBuiltin = BUILTIN_SOURCE_IDS.has(field.id);

              return (
                <div
                  key={field.id}
                  className={cn(
                    "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-1 text-xs",
                    enabled ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30",
                  )}
                >
                  {isBuiltin ? (
                    <button
                      type="button"
                      disabled={!canEdit || isPending}
                      className={cn(
                        "truncate font-medium",
                        !enabled && "text-muted-foreground",
                        canEdit && !isPending && "hover:text-foreground",
                      )}
                      onClick={() =>
                        update(index, {
                          ...form.getValues(`candidateSources.${index}`),
                          enabled: !enabled,
                        })
                      }
                    >
                      {label}
                    </button>
                  ) : (
                    <>
                      <Input
                        className="h-6 w-[7.5rem] min-w-0 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
                        disabled={!canEdit || isPending}
                        {...form.register(`candidateSources.${index}.label`)}
                      />
                      <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <input
                          type="checkbox"
                          className="size-3 rounded border-input"
                          disabled={!canEdit || isPending}
                          checked={enabled}
                          onChange={(event) =>
                            update(index, {
                              ...form.getValues(`candidateSources.${index}`),
                              enabled: event.target.checked,
                            })
                          }
                        />
                        On
                      </label>
                    </>
                  )}
                  {canEdit && !isBuiltin ? (
                    <button
                      type="button"
                      className="rounded-full p-0.5 text-muted-foreground hover:text-destructive"
                      disabled={isPending}
                      onClick={() => remove(index)}
                      aria-label="Remove source"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
          {canEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 h-8"
              disabled={isPending}
              onClick={() =>
                append({
                  id: `src_${crypto.randomUUID().slice(0, 8)}`,
                  label: "New source",
                  enabled: true,
                })
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add source
            </Button>
          ) : null}
        </SettingsCard>
      </div>
    </form>
  );
}

function SettingsCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-card p-3.5 shadow-sm", className)}>
      <div className="mb-2.5">
        <h2 className="text-sm font-medium">{title}</h2>
        {description ? <p className="text-[11px] text-muted-foreground">{description}</p> : null}
      </div>
      {children}
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
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
