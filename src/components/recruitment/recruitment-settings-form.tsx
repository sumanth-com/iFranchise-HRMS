"use client";

import {
  BriefcaseBusiness,
  Building2,
  DoorOpen,
  Globe2,
  GraduationCap,
  HandHelping,
  Link2,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { StickyPageActions } from "@/components/common/sticky-layout";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import { updateRecruitmentSettingsAction } from "@/lib/recruitment/actions";
import {
  ARCHIVE_DAYS_OPTIONS,
  INTERVIEW_DURATION_OPTIONS,
} from "@/lib/recruitment/constants";
import { previewNumberFormat } from "@/lib/recruitment/services/recruitment-settings";
import {
  recruitmentSettingsSchema,
  type RecruitmentSettingsFormInput,
  type RecruitmentSettingsFormValues,
} from "@/lib/validations/recruitment";
import type { RecruitmentSettings } from "@/types/recruitment";
import { cn } from "@/lib/utils";

type Props = {
  settings: RecruitmentSettings;
  managers: { id: string; label: string }[];
  canEdit: boolean;
};

function getSourceIcon(label: string, id?: string): LucideIcon {
  const key = `${id ?? ""} ${label}`.toLowerCase();
  if (key.includes("linkedin")) return Link2;
  if (key.includes("naukri")) return BriefcaseBusiness;
  if (key.includes("indeed")) return Search;
  if (key.includes("career") || key.includes("company")) return Globe2;
  if (key.includes("referral") || key.includes("employee")) return Users;
  if (key.includes("walk")) return DoorOpen;
  if (key.includes("agency") || key.includes("recruitment")) return Building2;
  if (key.includes("campus") || key.includes("college") || key.includes("placement")) {
    return GraduationCap;
  }
  if (key.includes("other") || key.includes("new source")) return MoreHorizontal;
  return HandHelping;
}

function getSourceIconStyle(label: string, id?: string) {
  const key = `${id ?? ""} ${label}`.toLowerCase();
  if (key.includes("linkedin")) return "bg-[#0A66C2]/10 text-[#0A66C2]";
  if (key.includes("naukri")) return "bg-orange-500/10 text-orange-600";
  if (key.includes("indeed")) return "bg-indigo-500/10 text-indigo-600";
  if (key.includes("career") || key.includes("company")) return "bg-sky-500/10 text-sky-600";
  if (key.includes("referral") || key.includes("employee")) {
    return "bg-emerald-500/10 text-emerald-600";
  }
  if (key.includes("walk")) return "bg-amber-500/10 text-amber-600";
  if (key.includes("agency") || key.includes("recruitment")) {
    return "bg-violet-500/10 text-violet-600";
  }
  if (key.includes("campus") || key.includes("college") || key.includes("placement")) {
    return "bg-rose-500/10 text-rose-600";
  }
  return "bg-muted text-muted-foreground";
}

export function RecruitmentSettingsForm({ settings, managers, canEdit }: Props) {
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
  const numberFormats = form.watch("numberFormats");

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
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex min-h-full flex-col gap-6"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recruitment Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure sources, defaults, automation, notifications, and ID formats.
        </p>
      </div>

      <SettingsSection
        title="Candidate Sources"
        description="Manage where candidates come from. Enabled sources appear in candidate creation."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {fields.map((field, index) => {
            const label = form.watch(`candidateSources.${index}.label`) || field.label;
            const Icon = getSourceIcon(label, field.id);
            return (
              <div
                key={field.id}
                className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2"
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-md",
                    getSourceIconStyle(label, field.id),
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <Input
                  className="h-9 min-w-0 flex-1"
                  disabled={!canEdit || isPending}
                  {...form.register(`candidateSources.${index}.label`)}
                />
                <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    className="size-3.5 rounded border-input"
                    disabled={!canEdit || isPending}
                    checked={form.watch(`candidateSources.${index}.enabled`)}
                    onChange={(e) =>
                      update(index, {
                        ...form.getValues(`candidateSources.${index}`),
                        enabled: e.target.checked,
                      })
                    }
                  />
                  On
                </label>
                {canEdit ? (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={isPending || fields.length <= 1}
                    onClick={() => remove(index)}
                    aria-label="Remove source"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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
            className="mt-3"
            disabled={isPending}
            onClick={() =>
              append({
                id: `src_${crypto.randomUUID().slice(0, 8)}`,
                label: "New Source",
                enabled: true,
              })
            }
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Source
          </Button>
        ) : null}
      </SettingsSection>

      <SettingsSection
        title="Hiring Defaults"
        description="Defaults applied automatically when creating jobs and interviews."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Default Hiring Manager">
            <EmployeeSelect
              employees={managers}
              value={form.watch("defaultHiringManagerId") ?? ""}
              onValueChange={(value) =>
                form.setValue("defaultHiringManagerId", value || null, { shouldDirty: true })
              }
              placeholder="Select manager"
              disabled={!canEdit || isPending}
            />
          </Field>
          <Field label="Default Interview Duration">
            <LabeledSelect
              items={INTERVIEW_DURATION_OPTIONS.map((o) => ({
                value: String(o.value),
                label: o.label,
              }))}
              value={String(form.watch("defaultInterviewDurationMinutes"))}
              onValueChange={(value) =>
                form.setValue(
                  "defaultInterviewDurationMinutes",
                  Number(value) as RecruitmentSettingsFormValues["defaultInterviewDurationMinutes"],
                  { shouldDirty: true },
                )
              }
              disabled={!canEdit || isPending}
            />
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Notice Period Options"
        description="Dropdown values used on candidate profiles."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {noticePeriods.map((option, index) => (
            <div
              key={`${option}-${index}`}
              className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2"
            >
              <Input
                className="h-9 min-w-0 flex-1"
                disabled={!canEdit || isPending}
                value={option}
                onChange={(e) => {
                  const next = [...noticePeriods];
                  next[index] = e.target.value;
                  form.setValue("noticePeriodOptions", next, { shouldDirty: true });
                }}
              />
              {canEdit ? (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={isPending || noticePeriods.length <= 1}
                  onClick={() => {
                    const next = noticePeriods.filter((_, i) => i !== index);
                    form.setValue("noticePeriodOptions", next, { shouldDirty: true });
                  }}
                  aria-label="Remove notice period option"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
        {canEdit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={isPending}
            onClick={() =>
              form.setValue("noticePeriodOptions", [...noticePeriods, "New Option"], {
                shouldDirty: true,
              })
            }
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Option
          </Button>
        ) : null}
      </SettingsSection>

      <SettingsSection
        title="Automation"
        description="Controls automatic employee creation and rejected candidate archival."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Toggle
            label="Auto Employee Creation on Offer Accepted"
            description="Creates employee, assigns org structure, and prepares login invitation."
            disabled={!canEdit || isPending}
            checked={form.watch("autoEmployeeCreation")}
            onChange={(checked) =>
              form.setValue("autoEmployeeCreation", checked, { shouldDirty: true })
            }
          />
          <Field label="Auto Candidate Archive (Rejected)">
            <LabeledSelect
              items={ARCHIVE_DAYS_OPTIONS.map((o) => ({
                value: String(o.value),
                label: o.label,
              }))}
              value={String(form.watch("autoArchiveRejectedDays"))}
              onValueChange={(value) =>
                form.setValue(
                  "autoArchiveRejectedDays",
                  Number(value) as RecruitmentSettingsFormValues["autoArchiveRejectedDays"],
                  { shouldDirty: true },
                )
              }
              disabled={!canEdit || isPending}
            />
            <p className="text-xs text-muted-foreground">
              Rejected candidates older than this period are archived automatically.
            </p>
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Email Notifications"
        description="Control which recruitment events create in-app notifications."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["interviewScheduled", "Interview Scheduled"],
              ["interviewCancelled", "Interview Cancelled"],
              ["offerSent", "Offer Sent"],
              ["offerAccepted", "Offer Accepted"],
              ["offerRejected", "Offer Rejected"],
              ["joiningReminder", "Joining Reminder"],
            ] as const
          ).map(([key, label]) => (
            <Toggle
              key={key}
              label={label}
              disabled={!canEdit || isPending}
              checked={form.watch(`emailNotifications.${key}`)}
              onChange={(checked) =>
                form.setValue(`emailNotifications.${key}`, checked, { shouldDirty: true })
              }
            />
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Recruitment Number Format"
        description="Prefixes used when generating Job, Candidate, and Offer IDs."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Candidate ID Prefix">
            <Input
              disabled={!canEdit || isPending}
              {...form.register("numberFormats.candidatePrefix")}
            />
            <p className="text-xs text-muted-foreground">
              Preview: {previewNumberFormat(numberFormats?.candidatePrefix || "CAN")}
            </p>
          </Field>
          <Field label="Job Opening Prefix">
            <Input disabled={!canEdit || isPending} {...form.register("numberFormats.jobPrefix")} />
            <p className="text-xs text-muted-foreground">
              Preview: {previewNumberFormat(numberFormats?.jobPrefix || "JOB")}
            </p>
          </Field>
          <Field label="Offer Prefix">
            <Input
              disabled={!canEdit || isPending}
              {...form.register("numberFormats.offerPrefix")}
            />
            <p className="text-xs text-muted-foreground">
              Preview: {previewNumberFormat(numberFormats?.offerPrefix || "OFF")}
            </p>
          </Field>
        </div>
      </SettingsSection>

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

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
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
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border px-4 py-3 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 size-4 rounded border-input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="font-medium">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
