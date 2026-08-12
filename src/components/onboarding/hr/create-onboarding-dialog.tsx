"use client";

import Link from "next/link";
import { Loader2, Send } from "lucide-react";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { OnboardingPhoneField } from "@/components/onboarding/candidate/onboarding-phone-field";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import type { SelectItemOption } from "@/components/payroll/select-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ORGANIZATION_ROUTES } from "@/lib/organization/constants";
import {
  createAndInviteOnboardingAction,
  fetchOnboardingLookupsAction,
} from "@/lib/onboarding/actions/hr-onboarding-actions";
import {
  createOnboardingCaseFormSchema,
  type CreateOnboardingCaseFormInput,
} from "@/lib/validations/onboarding";
import type { OnboardingLookups } from "@/types/onboarding";

type CreateOnboardingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookups: OnboardingLookups;
  onSuccess: (caseId: string, fullName: string) => void;
};

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function CreateOnboardingDialog({
  open,
  onOpenChange,
  lookups,
  onSuccess,
}: CreateOnboardingDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [liveLookups, setLiveLookups] = useState<OnboardingLookups>(lookups);
  const [lookupsLoading, setLookupsLoading] = useState(false);

  useEffect(() => {
    setLiveLookups(lookups);
  }, [lookups]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLookupsLoading(true);
    fetchOnboardingLookupsAction()
      .then((data) => {
        if (!cancelled) setLiveLookups(data);
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load work locations");
      })
      .finally(() => {
        if (!cancelled) setLookupsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateOnboardingCaseFormInput>({
    resolver: zodResolver(createOnboardingCaseFormSchema),
    defaultValues: {
      fullName: "",
      personalEmail: "",
      mobileNumber: "",
      designationId: "",
      departmentId: "",
      reportingManagerId: "",
      employmentTypeId: "",
      joiningDate: "",
      workLocationId: "",
      employmentCategory: "",
      offerReferenceNumber: "",
    },
  });

  const mobileNumber = watch("mobileNumber");
  const designationId = watch("designationId");
  const departmentId = watch("departmentId");
  const employmentTypeId = watch("employmentTypeId");
  const workLocationId = watch("workLocationId");
  const reportingManagerId = watch("reportingManagerId");

  const designationItems: SelectItemOption[] = liveLookups.designations.map((d) => ({
    value: d.id,
    label: d.title,
  }));
  const departmentItems: SelectItemOption[] = liveLookups.departments.map((d) => ({
    value: d.id,
    label: d.name,
  }));
  const employmentTypeItems: SelectItemOption[] = liveLookups.employmentTypes.map((t) => ({
    value: t.id,
    label: t.name,
  }));
  const workLocationItems: SelectItemOption[] = liveLookups.workLocations.map((l) => ({
    value: l.id,
    label: l.name,
  }));
  const managerItems: SelectItemOption[] = liveLookups.managers.map((m) => ({
    value: m.id,
    label: m.name,
  }));
  const optionalManagerItems: SelectItemOption[] = [
    { value: "__none__", label: "None" },
    ...managerItems,
  ];
  const optionalWorkLocationItems: SelectItemOption[] = [
    { value: "__none__", label: "None" },
    ...workLocationItems,
  ];

  const selectTrigger = "h-9 w-full";

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await createAndInviteOnboardingAction({
        ...values,
        reportingManagerId: values.reportingManagerId || null,
        workLocationId: values.workLocationId || null,
        mobileNumber: values.mobileNumber || null,
        employmentCategory: values.employmentCategory || null,
        offerReferenceNumber: values.offerReferenceNumber || null,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      reset();
      if (result.caseId) {
        onSuccess(result.caseId, values.fullName);
      } else {
        toast.success(result.message);
        onOpenChange(false);
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="space-y-1 border-b px-5 py-4">
          <DialogTitle className="text-base font-semibold">New Hire Onboarding</DialogTitle>
          <DialogDescription className="text-sm">
            Send a secure pre-joining invitation to the candidate&apos;s personal email.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="grid gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-2">
            <Field label="Full name" required error={errors.fullName?.message}>
              <Input
                className="h-9"
                placeholder="Candidate full name"
                disabled={isPending}
                autoFocus
                {...register("fullName")}
              />
            </Field>
            <div>
              <OnboardingPhoneField
                label="Mobile number"
                value={mobileNumber ?? ""}
                onChange={(value) =>
                  setValue("mobileNumber", value, { shouldValidate: true })
                }
                disabled={isPending}
                showHint={false}
                placeholder="Mobile number"
              />
              {errors.mobileNumber ? (
                <p className="mt-1 text-xs text-destructive">{errors.mobileNumber.message}</p>
              ) : null}
            </div>
            <div className="sm:col-span-2">
              <Field label="Personal email" required error={errors.personalEmail?.message}>
                <Input
                  className="h-9"
                  type="email"
                  placeholder="personal@email.com"
                  disabled={isPending}
                  {...register("personalEmail")}
                />
              </Field>
            </div>
            <Field label="Designation" required error={errors.designationId?.message}>
              <LabeledSelect
                value={designationId}
                placeholder="Select designation"
                items={designationItems}
                onValueChange={(v) => setValue("designationId", v, { shouldValidate: true })}
                disabled={isPending}
                triggerClassName={selectTrigger}
              />
            </Field>
            <Field label="Department" required error={errors.departmentId?.message}>
              <LabeledSelect
                value={departmentId}
                placeholder="Select department"
                items={departmentItems}
                onValueChange={(v) => setValue("departmentId", v, { shouldValidate: true })}
                disabled={isPending}
                triggerClassName={selectTrigger}
              />
            </Field>
            <Field label="Reporting manager">
              <LabeledSelect
                value={reportingManagerId || "__none__"}
                placeholder="Optional"
                items={optionalManagerItems}
                onValueChange={(v) =>
                  setValue("reportingManagerId", v === "__none__" ? "" : v)
                }
                disabled={isPending}
                triggerClassName={selectTrigger}
              />
            </Field>
            <Field label="Employment type" required error={errors.employmentTypeId?.message}>
              <LabeledSelect
                value={employmentTypeId}
                placeholder="Select type"
                items={employmentTypeItems}
                onValueChange={(v) => setValue("employmentTypeId", v, { shouldValidate: true })}
                disabled={isPending}
                triggerClassName={selectTrigger}
              />
            </Field>
            <Field label="Joining date" required error={errors.joiningDate?.message}>
              <Input type="date" disabled={isPending} className="h-9" {...register("joiningDate")} />
            </Field>
            <Field label="Work location">
              {lookupsLoading ? (
                <div className="flex h-9 items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Loading locations…
                </div>
              ) : workLocationItems.length === 0 ? (
                <p className="text-xs text-muted-foreground rounded-md border border-dashed px-3 py-2">
                  No work locations yet.{" "}
                  <Link
                    href={`${ORGANIZATION_ROUTES.branches}#work-locations`}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Add work locations
                  </Link>
                  {" "}or configure branches under Organization.
                </p>
              ) : (
                <LabeledSelect
                  value={workLocationId || "__none__"}
                  placeholder="Select location"
                  items={optionalWorkLocationItems}
                  onValueChange={(v) =>
                    setValue("workLocationId", v === "__none__" ? "" : v)
                  }
                  disabled={isPending}
                  triggerClassName={selectTrigger}
                />
              )}
            </Field>
            <Field label="Employment category">
              <Input className="h-9" placeholder="e.g. Full-time" disabled={isPending} {...register("employmentCategory")} />
            </Field>
            <Field label="Offer reference">
              <Input className="h-9" placeholder="Offer # / reference" disabled={isPending} {...register("offerReferenceNumber")} />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-2 border-t bg-muted/40 px-5 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="gap-1.5" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Send invitation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
