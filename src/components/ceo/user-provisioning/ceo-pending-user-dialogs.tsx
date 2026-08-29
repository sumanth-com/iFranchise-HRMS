"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import {
  changePendingProvisioningRoleAction,
  fetchUserProvisioningInviteRolesAction,
  updatePendingProvisioningUserAction,
} from "@/lib/ceo/actions/ceo-user-provisioning-actions";
import {
  changeProvisioningRoleSchema,
  updatePendingProvisioningUserSchema,
  type ChangeProvisioningRoleInput,
  type UpdatePendingProvisioningUserInput,
} from "@/lib/validations/ceo-user-provisioning";
import type {
  CeoProvisioningLookups,
  CeoProvisioningUser,
  ProvisionableRoleOption,
} from "@/types/ceo-user-provisioning";

type PendingEditDialogProps = {
  open: boolean;
  user: CeoProvisioningUser | null;
  lookups: CeoProvisioningLookups;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

type PendingRoleDialogProps = {
  open: boolean;
  user: CeoProvisioningUser | null;
  lookups: CeoProvisioningLookups;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function CeoPendingEditDialog({
  open,
  user,
  lookups,
  onOpenChange,
  onSaved,
}: PendingEditDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<UpdatePendingProvisioningUserInput>({
    resolver: zodResolver(updatePendingProvisioningUserSchema),
    defaultValues: {
      employeeId: "",
      firstName: "",
      lastName: "",
      departmentId: null,
      designation: "",
      employmentTypeId: null,
    },
  });

  useEffect(() => {
    if (!open || !user) return;
    form.reset({
      employeeId: user.employeeId,
      firstName: user.firstName,
      lastName: user.lastName,
      departmentId:
        lookups.departments.find((d) => d.label === user.departmentName)?.id ?? null,
      designation: user.designationTitle ?? "",
      employmentTypeId: null,
    });
    setSubmitError(null);
  }, [open, user, lookups.departments, form]);

  const onSubmit = form.handleSubmit((data) => {
    setSubmitError(null);
    startTransition(async () => {
      const result = await updatePendingProvisioningUserAction(data);
      if (!result.success) {
        setSubmitError(result.message);
        return;
      }
      onOpenChange(false);
      onSaved();
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit pending user</DialogTitle>
          <DialogDescription>
            Update details for this pending invitation. The employee ID stays the same.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {submitError ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              {submitError}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pending-first-name">First name</Label>
              <Input id="pending-first-name" {...form.register("firstName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pending-last-name">Last name</Label>
              <Input id="pending-last-name" {...form.register("lastName")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <LabeledSelect
              value={form.watch("departmentId") ?? ""}
              placeholder="Select department"
              items={lookups.departments.map((d) => ({ value: d.id, label: d.label }))}
              onValueChange={(value) =>
                form.setValue("departmentId", value || null, { shouldValidate: true })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pending-designation">Designation</Label>
            <Input id="pending-designation" {...form.register("designation")} />
          </div>
          <div className="space-y-2">
            <Label>Employment type</Label>
            <LabeledSelect
              value={form.watch("employmentTypeId") ?? ""}
              placeholder="Select employment type"
              items={lookups.employmentTypes.map((d) => ({ value: d.id, label: d.label }))}
              onValueChange={(value) =>
                form.setValue("employmentTypeId", value || null, { shouldValidate: true })
              }
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CeoPendingRoleDialog({
  open,
  user,
  lookups,
  onOpenChange,
  onSaved,
}: PendingRoleDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [inviteRoles, setInviteRoles] = useState<ProvisionableRoleOption[]>(lookups.roles);

  const form = useForm<ChangeProvisioningRoleInput>({
    resolver: zodResolver(changeProvisioningRoleSchema),
    defaultValues: { employeeId: "", roleCode: "" },
  });

  useEffect(() => {
    if (!open || !user) return;
    form.reset({
      employeeId: user.employeeId,
      roleCode: user.roleCode,
    });
    setSubmitError(null);
    void fetchUserProvisioningInviteRolesAction().then((result) => {
      if (result.success) setInviteRoles(result.roles);
    });
  }, [open, user, form]);

  const roleItems = useMemo(
    () => inviteRoles.map((role) => ({ value: role.code, label: role.name })),
    [inviteRoles],
  );

  const onSubmit = form.handleSubmit((data) => {
    setSubmitError(null);
    startTransition(async () => {
      const result = await changePendingProvisioningRoleAction(data);
      if (!result.success) {
        setSubmitError(result.message);
        return;
      }
      onOpenChange(false);
      onSaved();
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
          <DialogDescription>
            Update the portal role for {user?.fullName ?? "this pending user"}. The latest
            role is applied when they accept the invitation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {submitError ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              {submitError}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label>Portal role</Label>
            <LabeledSelect
              value={form.watch("roleCode")}
              placeholder="Select role"
              items={roleItems}
              onValueChange={(value) =>
                form.setValue("roleCode", value, { shouldValidate: true })
              }
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save role
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
