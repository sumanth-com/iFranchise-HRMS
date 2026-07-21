"use client";

import { ChevronRight, Loader2, Mail, UserRoundPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { toEmployeeSelectItems, toLookupSelectItems } from "@/components/payroll/select-utils";
import { inviteEmployeeAction } from "@/lib/employees/actions";
import {
  employeeInviteSchema,
  type EmployeeInviteInput,
} from "@/lib/validations/employee";
import type { LookupOption } from "@/types/employee";

type EmployeeInviteFormProps = {
  lookups: {
    departments: LookupOption[];
    employmentTypes: LookupOption[];
    managers: LookupOption[];
  };
  canInvite: boolean;
  inviteServiceReady: boolean;
  formId?: string;
  onSuccess?: () => void;
  onPendingChange?: (pending: boolean) => void;
};

export function EmployeeInviteForm({
  lookups,
  canInvite,
  inviteServiceReady,
  formId = "employee-invite-form",
  onSuccess,
  onPendingChange,
}: EmployeeInviteFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EmployeeInviteInput>({
    resolver: zodResolver(employeeInviteSchema),
    defaultValues: {
      fullName: "",
      email: "",
      departmentId: "",
      designation: "",
      employmentTypeId: "",
      reportingManagerId: "",
    },
  });

  const departmentId = watch("departmentId");
  const employmentTypeId = watch("employmentTypeId");
  const reportingManagerId = watch("reportingManagerId");

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const result = await inviteEmployeeAction(data);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Invitation sent successfully");
      reset();
      onSuccess?.();
      router.refresh();
    });
  });

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName">Employee Name *</Label>
          <Input
            id="fullName"
            placeholder="Sumanth Reddy"
            disabled={isPending || !canInvite}
            {...register("fullName")}
          />
          {errors.fullName ? (
            <p className="text-xs text-destructive">{errors.fullName.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Company Email *</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@company.com"
            disabled={isPending || !canInvite}
            {...register("email")}
          />
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="departmentId">Department *</Label>
          <LabeledSelect
            id="departmentId"
            items={toLookupSelectItems(lookups.departments)}
            value={departmentId}
            onValueChange={(value) => setValue("departmentId", value, { shouldValidate: true })}
            placeholder="Select department"
            disabled={isPending || !canInvite}
          />
          {errors.departmentId ? (
            <p className="text-xs text-destructive">{errors.departmentId.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="designation">Designation *</Label>
          <Input
            id="designation"
            placeholder="Website Developer Intern"
            disabled={isPending || !canInvite}
            {...register("designation")}
          />
          {errors.designation ? (
            <p className="text-xs text-destructive">{errors.designation.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="employmentTypeId">Employment Type *</Label>
          <LabeledSelect
            id="employmentTypeId"
            items={toLookupSelectItems(lookups.employmentTypes)}
            value={employmentTypeId}
            onValueChange={(value) =>
              setValue("employmentTypeId", value, { shouldValidate: true })
            }
            placeholder="Select employment type"
            disabled={isPending || !canInvite}
          />
          {errors.employmentTypeId ? (
            <p className="text-xs text-destructive">{errors.employmentTypeId.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reportingManagerId">Reporting Manager *</Label>
          <LabeledSelect
            id="reportingManagerId"
            items={toEmployeeSelectItems(lookups.managers)}
            value={reportingManagerId}
            onValueChange={(value) =>
              setValue("reportingManagerId", value, { shouldValidate: true })
            }
            placeholder="Select reporting manager"
            disabled={isPending || !canInvite}
          />
          {errors.reportingManagerId ? (
            <p className="text-xs text-destructive">{errors.reportingManagerId.message}</p>
          ) : null}
        </div>
      </div>

      {!inviteServiceReady ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          Invite sending is not configured for this environment.
        </p>
      ) : null}
    </form>
  );
}

export function EmployeeInviteSection({
  lookups,
  canInvite,
  inviteServiceReady,
}: EmployeeInviteFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!isPending) setOpen(next);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!canInvite}
        className="flex h-[52px] w-full items-center justify-between rounded-xl border bg-background px-4 text-left shadow-sm transition-colors hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-60 lg:max-w-sm"
      >
        <span className="flex items-center gap-2.5 text-sm font-medium">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UserRoundPlus className="size-4" />
          </span>
          Invite Employee
        </span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </button>

      <Modal
        open={open}
        onOpenChange={handleOpenChange}
        title="Invite Employee"
        description="Send a secure onboarding invitation to the employee's email."
        contentClassName="sm:max-w-2xl"
        showCancel={false}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="employee-invite-form"
              disabled={isPending || !canInvite || !inviteServiceReady}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Mail className="size-4" />
              )}
              Send Invite
            </Button>
          </>
        }
      >
        <EmployeeInviteForm
          lookups={lookups}
          canInvite={canInvite}
          inviteServiceReady={inviteServiceReady}
          onPendingChange={setIsPending}
          onSuccess={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
