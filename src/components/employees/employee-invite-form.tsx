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
import { sortEmploymentTypeOptions } from "@/lib/employees/employment-type-display";
import {
  employeeInviteSchema,
  type EmployeeInviteInput,
} from "@/lib/validations/employee";
import type { LookupOption } from "@/types/employee";
import { cn } from "@/lib/utils";

type EmployeeInviteFormProps = {
  lookups: {
    roles: LookupOption[];
    branches: LookupOption[];
    departments: LookupOption[];
    employmentTypes: LookupOption[];
    managers: LookupOption[];
  };
  canInvite: boolean;
  inviteServiceReady: boolean;
  formId?: string;
  onSuccess?: () => void;
  onPendingChange?: (pending: boolean) => void;
  variant?: "button" | "panel";
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

  const defaultRoleId =
    lookups.roles.find((role) => role.code === "employee")?.id ??
    lookups.roles[0]?.id ??
    "";

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
      roleId: defaultRoleId,
      branchId: "",
      departmentId: "",
      designation: "",
      employmentTypeId: "",
      reportingManagerId: "",
    },
  });

  const roleId = watch("roleId");
  const branchId = watch("branchId");
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
      reset({
        fullName: "",
        email: "",
        roleId: defaultRoleId,
        branchId: "",
        departmentId: "",
        designation: "",
        employmentTypeId: "",
        reportingManagerId: "",
      });
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
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="roleId">Role *</Label>
          <LabeledSelect
            id="roleId"
            items={toLookupSelectItems(lookups.roles)}
            value={roleId}
            onValueChange={(value) => setValue("roleId", value, { shouldValidate: true })}
            placeholder="Select role"
            disabled={isPending || !canInvite}
          />
          <p className="text-xs text-muted-foreground">
            Role determines portal access, permissions, and sidebar automatically.
          </p>
          {errors.roleId ? (
            <p className="text-xs text-destructive">{errors.roleId.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="branchId">Branch *</Label>
          <LabeledSelect
            id="branchId"
            items={toLookupSelectItems(lookups.branches)}
            value={branchId}
            onValueChange={(value) => setValue("branchId", value, { shouldValidate: true })}
            placeholder="Select branch"
            disabled={isPending || !canInvite}
          />
          {errors.branchId ? (
            <p className="text-xs text-destructive">{errors.branchId.message}</p>
          ) : null}
        </div>

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
            items={toLookupSelectItems(sortEmploymentTypeOptions(lookups.employmentTypes), {
              showCode: false,
            })}
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

        <div className="space-y-2 sm:col-span-2">
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
  variant = "button",
}: EmployeeInviteFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!isPending) setOpen(next);
  }

  function handleInviteClick() {
    if (!canInvite) return;
    setOpen(true);
  }

  const inviteModal = (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Invite Employee"
      description="Send a secure onboarding invitation. The selected role determines portal access automatically."
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
  );

  if (variant === "panel") {
    return (
      <>
        <div
          className={cn(
            "group relative flex h-[14rem] min-h-[14rem] overflow-hidden rounded-xl border bg-card shadow-sm",
            canInvite && "transition-shadow hover:shadow-md",
          )}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(99,102,241,0.12),transparent_42%),radial-gradient(circle_at_100%_100%,rgba(16,185,129,0.08),transparent_38%)]"
          />

          <div className="relative flex w-[38%] min-w-[8.5rem] shrink-0 items-center justify-center border-r border-border/60 bg-gradient-to-br from-muted/40 via-background to-primary/[0.06]">
            <div className="relative flex items-center justify-center">
              <span
                className="absolute size-[5.5rem] rounded-full bg-primary/15 blur-2xl"
                aria-hidden
              />
              <span
                className={cn(
                  "relative flex size-[4.75rem] items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-primary via-primary to-violet-600 text-primary-foreground shadow-[0_12px_30px_-12px_rgba(79,70,229,0.65)] ring-1 ring-white/25",
                  canInvite && "transition-transform duration-300 group-hover:scale-[1.02]",
                )}
              >
                <UserRoundPlus className="size-[2.1rem]" strokeWidth={1.6} />
              </span>
            </div>
          </div>

          <div className="relative flex min-w-0 flex-1 flex-col justify-between px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">
                Onboarding
              </p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                Invite employee
              </h3>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
                Send a secure portal invitation so they can activate their account and get started.
              </p>
            </div>

            <div className="mt-3 space-y-2">
              {!inviteServiceReady ? (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                  Invite sending is not configured for this environment.
                </p>
              ) : null}
              <Button
                type="button"
                size="lg"
                className="h-10 gap-2 rounded-lg px-5 shadow-sm"
                disabled={!canInvite || !inviteServiceReady}
                onClick={handleInviteClick}
              >
                <Mail className="size-4" />
                Send invitation
              </Button>
            </div>
          </div>
        </div>
        {inviteModal}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInviteClick}
        disabled={!canInvite}
        aria-label="Invite employee"
        className={cn(
          "group flex min-h-[56px] w-full items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3 text-left shadow-sm transition-all",
          canInvite &&
            "cursor-pointer hover:border-primary/35 hover:bg-primary/[0.04] hover:shadow-md active:scale-[0.99]",
          !canInvite && "cursor-not-allowed opacity-60",
        )}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors",
              canInvite && "group-hover:bg-primary/15",
            )}
          >
            <UserRoundPlus className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold tracking-tight">Invite Employee</span>
            <span className="block text-xs text-muted-foreground">
              Send a secure portal invitation
            </span>
          </span>
        </span>
        <ChevronRight
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            canInvite && "group-hover:translate-x-0.5 group-hover:text-primary",
          )}
        />
      </button>

      {inviteModal}
    </>
  );
}
