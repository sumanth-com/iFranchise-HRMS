"use client";

import { Loader2, Mail, UserRoundPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
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
    designations: LookupOption[];
    employmentTypes: LookupOption[];
    managers: LookupOption[];
  };
  canInvite: boolean;
  inviteServiceReady: boolean;
};

export function EmployeeInviteForm({
  lookups,
  canInvite,
  inviteServiceReady,
}: EmployeeInviteFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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
      designationId: "",
      employmentTypeId: "",
      reportingManagerId: "",
    },
  });

  const departmentId = watch("departmentId");
  const designationId = watch("designationId");
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
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
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
            placeholder="name@gmail.com"
            disabled={isPending || !canInvite}
            {...register("email")}
          />
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Any valid email works — Gmail, personal, or company address.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
          <Label htmlFor="designationId">Designation *</Label>
          <LabeledSelect
            id="designationId"
            items={toLookupSelectItems(lookups.designations)}
            value={designationId}
            onValueChange={(value) => setValue("designationId", value, { shouldValidate: true })}
            placeholder="Select designation"
            disabled={isPending || !canInvite}
          />
          {errors.designationId ? (
            <p className="text-xs text-destructive">{errors.designationId.message}</p>
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

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button
          type="submit"
          size="sm"
          disabled={isPending || !canInvite || !inviteServiceReady}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
          Send Invite
        </Button>
        {!inviteServiceReady ? (
          <p className="text-xs text-amber-600">
            Invite sending is not configured for this environment.
          </p>
        ) : null}
      </div>
    </form>
  );
}

export function EmployeeInviteSection({
  lookups,
  canInvite,
  inviteServiceReady,
}: EmployeeInviteFormProps) {
  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <UserRoundPlus className="size-4 text-primary" />
        Invite Employee
      </h2>
      <p className="text-sm text-muted-foreground">
        Enter employee details and we will send a secure onboarding invitation to their email.
      </p>
      <EmployeeInviteForm
        lookups={lookups}
        canInvite={canInvite}
        inviteServiceReady={inviteServiceReady}
      />
    </div>
  );
}
