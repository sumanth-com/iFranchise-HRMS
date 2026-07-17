"use client";

import { Loader2, Send } from "lucide-react";
import { useState, useTransition } from "react";
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
import { inviteExecutiveUserAction } from "@/lib/ceo/actions/ceo-user-provisioning-actions";
import { cn } from "@/lib/utils";
import type { LookupOption } from "@/types/employee";
import type { CeoProvisioningLookups } from "@/types/ceo-user-provisioning";

const OTHER_ROLE_VALUE = "__other__";

type CeoInviteUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookups: CeoProvisioningLookups;
  inviteServiceReady: boolean;
  onInvited: () => void;
};

type FormState = {
  email: string;
  roleCode: string;
  customRole: string;
  departmentId: string;
  designationId: string;
  reportingToId: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  email: "",
  roleCode: "",
  customRole: "",
  departmentId: "",
  designationId: "",
  reportingToId: "",
  notes: "",
};

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
      {children}
      {required ? <span className="text-destructive"> *</span> : null}
    </label>
  );
}

function LabeledSelect({
  value,
  placeholder,
  options,
  onChange,
  disabled,
}: {
  value: string;
  placeholder: string;
  options: LookupOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const selected = options.find((option) => option.id === value);
  return (
    <Select
      value={value ? value : null}
      onValueChange={(next) => onChange(next ?? "")}
      disabled={disabled}
    >
      <SelectTrigger className="h-10 w-full">
        <SelectValue placeholder={placeholder}>{selected?.label ?? placeholder}</SelectValue>
      </SelectTrigger>
      <SelectContent
        alignItemWithTrigger={false}
        className="w-(--anchor-width) max-w-[min(100vw-2rem,26rem)]"
      >
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CeoInviteUserDialog({
  open,
  onOpenChange,
  lookups,
  inviteServiceReady,
  onInvited,
}: CeoInviteUserDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();

  const roleOptions: LookupOption[] = [
    ...lookups.roles,
    { id: OTHER_ROLE_VALUE, label: "Others (type manually)" },
  ];
  const isCustomRole = form.roleCode === OTHER_ROLE_VALUE;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleOpenChange(next: boolean) {
    if (!next) setForm(EMPTY_FORM);
    onOpenChange(next);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!inviteServiceReady) {
      toast.error("Invitations are not configured on this environment.");
      return;
    }
    const email = form.email.trim();
    const roleCode = isCustomRole ? form.customRole.trim().toLowerCase() : form.roleCode;

    if (!email) return toast.error("Enter an email address.");
    if (!roleCode) return toast.error("Select or enter a role.");
    if (!form.departmentId) return toast.error("Select a department.");
    if (!form.designationId) return toast.error("Select a designation.");

    startTransition(async () => {
      const result = await inviteExecutiveUserAction({
        email,
        roleCode,
        departmentId: form.departmentId,
        designationId: form.designationId,
        reportingToId: form.reportingToId || undefined,
        notes: form.notes.trim() || undefined,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setForm(EMPTY_FORM);
      onOpenChange(false);
      onInvited();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b px-5 py-4">
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Invite a high-privilege user. Employees are provisioned by HR.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <div>
              <FieldLabel required>Email Address</FieldLabel>
              <Input
                type="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="name@company.com"
                className="h-10"
                disabled={isPending}
                autoFocus
              />
            </div>

            <div>
              <FieldLabel required>Role</FieldLabel>
              <LabeledSelect
                value={form.roleCode}
                placeholder="Select role"
                options={roleOptions}
                onChange={(value) => update("roleCode", value)}
                disabled={isPending}
              />
              {isCustomRole ? (
                <div className="mt-2">
                  <Input
                    value={form.customRole}
                    onChange={(event) => update("customRole", event.target.value)}
                    placeholder="Enter role code (e.g. manager)"
                    className="h-10"
                    disabled={isPending}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Enter an existing role code. Employees cannot be invited here.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel required>Department</FieldLabel>
                <LabeledSelect
                  value={form.departmentId}
                  placeholder="Select department"
                  options={lookups.departments}
                  onChange={(value) => update("departmentId", value)}
                  disabled={isPending}
                />
              </div>
              <div>
                <FieldLabel required>Designation</FieldLabel>
                <LabeledSelect
                  value={form.designationId}
                  placeholder="Select designation"
                  options={lookups.designations}
                  onChange={(value) => update("designationId", value)}
                  disabled={isPending}
                />
              </div>
            </div>

            <div>
              <FieldLabel>Reporting To</FieldLabel>
              <LabeledSelect
                value={form.reportingToId}
                placeholder="Select manager (optional)"
                options={lookups.managers}
                onChange={(value) => update("reportingToId", value)}
                disabled={isPending}
              />
            </div>

            <div>
              <FieldLabel>Optional Notes</FieldLabel>
              <textarea
                value={form.notes}
                onChange={(event) => update("notes", event.target.value)}
                placeholder="Add context for this invitation…"
                rows={3}
                disabled={isPending}
                className={cn(
                  "flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors",
                  "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  "disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
                )}
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
