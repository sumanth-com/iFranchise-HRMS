"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { StickyPageActions } from "@/components/common/sticky-layout";
import { Label } from "@/components/ui/label";
import { savePerformanceSettingsAction } from "@/lib/performance/actions";
import {
  performanceSettingsSchema,
  type PerformanceSettingsFormInput,
  type PerformanceSettingsFormValues,
} from "@/lib/validations/performance";
import type { PerformanceSettingsRecord } from "@/types/performance";

type PerformanceSettingsFormProps = {
  record: PerformanceSettingsRecord;
  canEdit: boolean;
};

export function PerformanceSettingsForm({ record, canEdit }: PerformanceSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<PerformanceSettingsFormInput, unknown, PerformanceSettingsFormValues>({
    resolver: zodResolver(performanceSettingsSchema),
    defaultValues: record.settings,
  });

  const categories = form.watch("goalCategories");

  function onSubmit(values: PerformanceSettingsFormValues) {
    startTransition(async () => {
      const result = await savePerformanceSettingsAction(values);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      form.reset(result.data.settings);
      toast.success("Performance settings saved");
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-1 flex-col gap-6"
    >
      <SettingsSection title="Review cycles" description="Default review cycle configuration.">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Default duration (months)">
            <Input type="number" disabled={!canEdit || isPending} {...form.register("reviewCycles.defaultDurationMonths")} />
          </Field>
          <Field label="Self review days">
            <Input type="number" disabled={!canEdit || isPending} {...form.register("reviewCycles.selfReviewDays")} />
          </Field>
          <Field label="Manager review days">
            <Input type="number" disabled={!canEdit || isPending} {...form.register("reviewCycles.managerReviewDays")} />
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection title="Rating scale" description="Performance rating scale (1–5).">
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <Field key={rating} label={`Rating ${rating}`}>
              <Input
                disabled={!canEdit || isPending}
                value={form.watch(`ratingScale.labels.${rating}`) ?? ""}
                onChange={(e) =>
                  form.setValue(`ratingScale.labels.${String(rating)}`, e.target.value, {
                    shouldDirty: true,
                  })
                }
              />
            </Field>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Goal categories" description="Predefined goal categories for OKRs.">
        <div className="space-y-2">
          {categories.map((cat, index) => (
            <div key={index} className="flex gap-2">
              <Input
                disabled={!canEdit || isPending}
                value={cat}
                onChange={(e) => {
                  const next = [...categories];
                  next[index] = e.target.value;
                  form.setValue("goalCategories", next, { shouldDirty: true });
                }}
              />
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Promotion rules" description="Eligibility and approval requirements.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Minimum rating for promotion">
            <Input type="number" min={1} max={5} disabled={!canEdit || isPending} {...form.register("promotionRules.minRatingForPromotion")} />
          </Field>
          <Field label="Minimum tenure (months)">
            <Input type="number" min={0} disabled={!canEdit || isPending} {...form.register("promotionRules.minTenureMonths")} />
          </Field>
          <Toggle label="Require manager approval" disabled={!canEdit || isPending} {...form.register("promotionRules.requireManagerApproval")} />
          <Toggle label="Require HR approval" disabled={!canEdit || isPending} {...form.register("promotionRules.requireHrApproval")} />
        </div>
      </SettingsSection>

      <SettingsSection title="Notifications" description="Performance notification preferences.">
        <div className="grid gap-3 md:grid-cols-2">
          <Toggle label="Review reminder" disabled={!canEdit || isPending} {...form.register("notifications.reviewReminder")} />
          <Toggle label="Goal due reminder" disabled={!canEdit || isPending} {...form.register("notifications.goalDueReminder")} />
          <Toggle label="Feedback notification" disabled={!canEdit || isPending} {...form.register("notifications.feedbackNotification")} />
          <Toggle label="Promotion notification" disabled={!canEdit || isPending} {...form.register("notifications.promotionNotification")} />
          <Toggle label="1:1 meeting reminder" disabled={!canEdit || isPending} {...form.register("notifications.oneOnOneReminder")} />
        </div>
      </SettingsSection>

      <SettingsSection title="Audit" description="Configuration change history.">
        <dl className="grid gap-4 sm:grid-cols-2">
          <AuditItem label="Created date" value={format(new Date(record.audit.createdAt), "MMM d, yyyy h:mm a")} />
          <AuditItem label="Last updated" value={format(new Date(record.audit.updatedAt), "MMM d, yyyy h:mm a")} />
        </dl>
      </SettingsSection>

      {canEdit ? (
        <StickyPageActions>
          <Button
            type="button"
            variant="outline"
            disabled={!form.formState.isDirty || isPending}
            onClick={() => form.reset(record.settings)}
          >
            Cancel changes
          </Button>
          <Button type="submit" disabled={!form.formState.isDirty || isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </StickyPageActions>
      ) : null}
    </form>
  );
}

function SettingsSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Toggle({ label, disabled, ...props }: { label: string; disabled?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center gap-3 rounded-lg border px-4 py-3 text-sm">
      <input type="checkbox" className="size-4 rounded border-input" disabled={disabled} {...props} />
      <span>{label}</span>
    </label>
  );
}

function AuditItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}
