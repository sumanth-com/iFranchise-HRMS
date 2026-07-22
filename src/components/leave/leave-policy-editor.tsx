"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import {
  LeavePolicyContactBar,
  LeavePolicyHolidayTables,
  LeavePolicyPageHeader,
  LeavePolicySections,
} from "@/components/leave/leave-policy-content";
import { SettingsFormActions } from "@/components/company-settings/settings-form-actions";
import { saveLeavePolicyDocumentAction } from "@/lib/leave/actions/leave-policy-actions";
import { ORGANIZATION_ROUTES } from "@/lib/organization/constants";
import { cn } from "@/lib/utils";
import type { LeavePolicyDocument, LeavePolicyHolidayRow } from "@/types/leave-policy";

const textareaClassName = cn(
  "flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors",
  "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
  "disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
);

type FormValues = Omit<LeavePolicyDocument, "updatedAt">;

export function LeavePolicyEditor({
  backHref,
  employeeName,
  initialDocument,
  mandatoryHolidays,
  optionalHolidays,
  holidayYear,
}: {
  backHref: string;
  employeeName: string;
  initialDocument: LeavePolicyDocument;
  mandatoryHolidays: LeavePolicyHolidayRow[];
  optionalHolidays: LeavePolicyHolidayRow[];
  holidayYear: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [previewDocument, setPreviewDocument] = useState(initialDocument);
  const defaultValues = useMemo(
    () => ({
      intro: initialDocument.intro,
      sections: initialDocument.sections,
      contact: initialDocument.contact,
    }),
    [initialDocument],
  );

  const form = useForm<FormValues>({ defaultValues });
  const { register, handleSubmit, reset, watch, formState } = form;
  const watched = watch();

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await saveLeavePolicyDocumentAction(values);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      const nextDocument: LeavePolicyDocument = {
        ...values,
        updatedAt: new Date().toISOString(),
      };
      setPreviewDocument(nextDocument);
      reset(values);
      toast.success("Leave policy updated.");
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href={backHref} />}>
          <ArrowLeft className="size-4" />
          Back to Leave
        </Button>
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href={ORGANIZATION_ROUTES.holidays} />}>
          <ExternalLink className="size-4" />
          Manage holidays
        </Button>
      </div>

      <LeavePolicyPageHeader
        title="Edit Leave Policy"
        description="Update the employee-facing leave policy. Changes apply immediately after you click Update policy."
      />

      <section className="space-y-4 rounded-xl border bg-card p-6 shadow-sm md:p-8">
        <div className="space-y-2">
          <label className="text-sm font-medium">Introduction</label>
          <textarea rows={4} className={textareaClassName} {...register("intro")} />
        </div>

        {watched.sections.map((section, index) => (
          <div key={section.id} className="space-y-3 rounded-lg border p-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Section title</label>
              <Input {...register(`sections.${index}.title`)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Section content</label>
              <textarea rows={8} className={textareaClassName} {...register(`sections.${index}.content`)} />
              <p className="text-xs text-muted-foreground">
                Use blank lines between paragraphs. Start list items with &quot;- &quot;.
              </p>
            </div>
            <input type="hidden" {...register(`sections.${index}.id`)} />
          </div>
        ))}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Contact phone</label>
            <Input {...register("contact.phone")} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Contact email</label>
            <Input type="email" {...register("contact.email")} />
          </div>
          <div className="space-y-2 md:col-span-1">
            <label className="text-sm font-medium">Contact address</label>
            <Input {...register("contact.address")} />
          </div>
        </div>

        <SettingsFormActions
          canEdit
          isDirty={formState.isDirty}
          isPending={isPending}
          onReset={() => reset(defaultValues)}
          saveLabel="Update policy"
        />
      </section>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Preview</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This is how employees will see the policy after saving.
        </p>
      </div>

      <LeavePolicySections
        intro={formState.isDirty ? watched.intro : previewDocument.intro}
        sections={formState.isDirty ? watched.sections : previewDocument.sections}
        employeeName={employeeName}
      />

      <LeavePolicyHolidayTables
        mandatoryHolidays={mandatoryHolidays}
        optionalHolidays={optionalHolidays}
        holidayYear={holidayYear}
      />

      <LeavePolicyContactBar
        contact={formState.isDirty ? watched.contact : previewDocument.contact}
      />
    </form>
  );
}
