"use client";

import { Loader2, Send } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/common/button";
import { SuccessCelebrationOverlay } from "@/components/common/success-celebration-overlay";
import { Input } from "@/components/common/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { toLookupSelectItems } from "@/components/payroll/select-utils";
import {
  fetchUserProvisioningInviteRolesAction,
  inviteExecutiveUserAction,
} from "@/lib/ceo/actions/ceo-user-provisioning-actions";
import {
  inviteExecutiveUserSchema,
  type InviteExecutiveUserInput,
} from "@/lib/validations/ceo-user-provisioning";
import type {
  CeoProvisioningLookups,
  ProvisionableRoleOption,
} from "@/types/ceo-user-provisioning";

type CeoInviteUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookups: CeoProvisioningLookups;
  inviteServiceReady: boolean;
  onInvited: () => void;
};

export function CeoInviteUserDialog({
  open,
  onOpenChange,
  lookups,
  inviteServiceReady,
  onInvited,
}: CeoInviteUserDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [inviteRoles, setInviteRoles] = useState<ProvisionableRoleOption[]>(
    lookups.roles,
  );
  const [inviteSuccess, setInviteSuccess] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<InviteExecutiveUserInput>({
    resolver: zodResolver(inviteExecutiveUserSchema),
    defaultValues: {
      fullName: "",
      email: "",
      roleCode: "",
      departmentId: "",
      designation: "",
      employmentTypeId: "",
    },
  });

  const roleCode = watch("roleCode");
  const departmentId = watch("departmentId");
  const employmentTypeId = watch("employmentTypeId");

  useEffect(() => {
    setInviteRoles(lookups.roles);
  }, [lookups.roles]);

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);

    void fetchUserProvisioningInviteRolesAction().then((result) => {
      if (result.success) {
        setInviteRoles(result.roles);
      }
    });
  }, [open]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset();
      setSubmitError(null);
    }
    onOpenChange(next);
  }

  const onSubmit = handleSubmit((data) => {
    if (!inviteServiceReady) {
      setSubmitError("Invitations are not configured on this environment.");
      return;
    }

    setSubmitError(null);

    startTransition(async () => {
      const result = await inviteExecutiveUserAction(data);
      if (!result.success) {
        setSubmitError(result.message);
        return;
      }
      setInviteSuccess({
        title: "Invitation sent",
        description: `${data.email} will receive an email to activate their account.`,
      });
      reset();
      onOpenChange(false);
      onInvited();
    });
  });

  const selectedRole = inviteRoles.find((role) => role.code === roleCode);

  return (
    <>
      <SuccessCelebrationOverlay
        open={Boolean(inviteSuccess)}
        title={inviteSuccess?.title ?? "Invitation sent"}
        description={inviteSuccess?.description}
        durationMs={3200}
        onClose={() => setInviteSuccess(null)}
      />

      <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-5 py-4">
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Invite a user as CEO, Cofounder, HR Admin, Manager, or Employee.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {submitError ? (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
              >
                {submitError}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  placeholder="Sumanth Reddy"
                  disabled={isPending}
                  autoFocus
                  {...register("fullName")}
                />
                {errors.fullName ? (
                  <p className="text-xs text-destructive">{errors.fullName.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  disabled={isPending}
                  {...register("email")}
                />
                {errors.email ? (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select
                  value={roleCode || null}
                  onValueChange={(value) => setValue("roleCode", value ?? "", { shouldValidate: true })}
                  disabled={isPending}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select role">
                      {selectedRole?.name ?? "Select role"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent
                    alignItemWithTrigger={false}
                    className="max-h-[min(26rem,calc(100dvh-6rem))] w-(--anchor-width) max-w-[min(100vw-2rem,28rem)]"
                  >
                    {inviteRoles.map((role) => (
                      <SelectItem key={role.code} value={role.code} className="items-start py-2">
                        <div className="flex min-w-0 flex-col gap-0.5 text-left">
                          <span className="font-medium">{role.name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {role.departmentLabel} · {role.portalLabel}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.roleCode ? (
                  <p className="text-xs text-destructive">{errors.roleCode.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Department *</Label>
                <LabeledSelect
                  value={departmentId}
                  placeholder="Select department"
                  items={toLookupSelectItems(lookups.departments)}
                  onValueChange={(value) =>
                    setValue("departmentId", value, { shouldValidate: true })
                  }
                  disabled={isPending}
                />
                {errors.departmentId ? (
                  <p className="text-xs text-destructive">{errors.departmentId.message}</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="designation">Designation *</Label>
                <Input
                  id="designation"
                  placeholder="Software Engineer"
                  disabled={isPending}
                  {...register("designation")}
                />
                {errors.designation ? (
                  <p className="text-xs text-destructive">{errors.designation.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Employment Type *</Label>
                <LabeledSelect
                  value={employmentTypeId}
                  placeholder="Select employment type"
                  items={toLookupSelectItems(lookups.employmentTypes)}
                  onValueChange={(value) =>
                    setValue("employmentTypeId", value, { shouldValidate: true })
                  }
                  disabled={isPending}
                />
                {errors.employmentTypeId ? (
                  <p className="text-xs text-destructive">{errors.employmentTypeId.message}</p>
                ) : null}
              </div>
            </div>

            {!inviteServiceReady ? (
              <p className="text-[11px] text-muted-foreground">
                Invitations are unavailable until email provisioning is configured.
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t px-5 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="gap-1.5"
              disabled={isPending || !inviteServiceReady}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Send Invitation
            </Button>
          </div>
        </form>
      </DialogContent>
      </Dialog>
    </>
  );
}
