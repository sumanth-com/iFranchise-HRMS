"use client";

import { Loader2, Send } from "lucide-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
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
import { inviteExecutiveUserAction } from "@/lib/ceo/actions/ceo-user-provisioning-actions";
import {
  inviteExecutiveUserSchema,
  type InviteExecutiveUserInput,
} from "@/lib/validations/ceo-user-provisioning";
import { cn } from "@/lib/utils";
import type { CeoProvisioningLookups } from "@/types/ceo-user-provisioning";

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
      reportingToId: "",
      employmentTypeId: "",
      branchId: "",
      notes: "",
    },
  });

  const roleCode = watch("roleCode");
  const departmentId = watch("departmentId");
  const reportingToId = watch("reportingToId");
  const employmentTypeId = watch("employmentTypeId");
  const branchId = watch("branchId");

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  const onSubmit = handleSubmit((data) => {
    if (!inviteServiceReady) {
      toast.error("Invitations are not configured on this environment.");
      return;
    }

    startTransition(async () => {
      const result = await inviteExecutiveUserAction(data);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      reset();
      onOpenChange(false);
      onInvited();
    });
  });

  const selectedRole = lookups.roles.find((role) => role.code === roleCode);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-5 py-4">
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Invite a high-privilege user. Employees are provisioned by HR.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
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
                <Label htmlFor="email">Company Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
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
                    className="w-(--anchor-width) max-w-[min(100vw-2rem,28rem)]"
                  >
                    {lookups.roles.map((role) => (
                      <SelectItem key={role.code} value={role.code} className="items-start py-2.5">
                        <div className="flex min-w-0 flex-col gap-0.5 text-left">
                          <span className="font-medium">{role.name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {role.departmentLabel} · {role.portalLabel}
                          </span>
                          {role.description ? (
                            <span className="line-clamp-2 text-[11px] text-muted-foreground">
                              {role.description}
                            </span>
                          ) : null}
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
                  placeholder="Chief Technology Officer"
                  disabled={isPending}
                  {...register("designation")}
                />
                {errors.designation ? (
                  <p className="text-xs text-destructive">{errors.designation.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Reporting Manager *</Label>
                <LabeledSelect
                  value={reportingToId}
                  placeholder="Select reporting manager"
                  items={toLookupSelectItems(lookups.managers)}
                  onValueChange={(value) =>
                    setValue("reportingToId", value, { shouldValidate: true })
                  }
                  disabled={isPending}
                />
                {errors.reportingToId ? (
                  <p className="text-xs text-destructive">{errors.reportingToId.message}</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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

              <div className="space-y-2">
                <Label>Branch *</Label>
                <LabeledSelect
                  value={branchId}
                  placeholder="Select branch"
                  items={toLookupSelectItems(lookups.branches)}
                  onValueChange={(value) => setValue("branchId", value, { shouldValidate: true })}
                  disabled={isPending}
                />
                {errors.branchId ? (
                  <p className="text-xs text-destructive">{errors.branchId.message}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Optional Notes</Label>
              <textarea
                id="notes"
                placeholder="Add context for this invitation…"
                rows={3}
                disabled={isPending}
                className={cn(
                  "flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors",
                  "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  "disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
                )}
                {...register("notes")}
              />
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
  );
}
