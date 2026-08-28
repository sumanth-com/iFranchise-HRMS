"use client";

import { Loader2, Send } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
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
  fetchProvisioningEligibleCandidatesAction,
  fetchUserProvisioningInviteRolesAction,
  inviteExecutiveUserAction,
  provisionOnboardingCandidateAction,
} from "@/lib/ceo/actions/ceo-user-provisioning-actions";
import type { ProvisioningEligibleCandidate } from "@/lib/onboarding/provisioning-eligibility";
import {
  inviteExecutiveUserSchema,
  type InviteExecutiveUserInput,
} from "@/lib/validations/ceo-user-provisioning";
import {
  provisionOnboardingCandidateSchema,
} from "@/lib/validations/onboarding-provisioning";
import type { z } from "zod";
import type {
  CeoProvisioningLookups,
  ProvisionableRoleOption,
} from "@/types/ceo-user-provisioning";

type InviteMode = "onboarding" | "direct";

type CeoInviteUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookups: CeoProvisioningLookups;
  eligibleCandidates: ProvisioningEligibleCandidate[];
  inviteServiceReady: boolean;
  onInvited: () => void;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CeoInviteUserDialog({
  open,
  onOpenChange,
  lookups,
  eligibleCandidates: initialEligibleCandidates,
  inviteServiceReady,
  onInvited,
}: CeoInviteUserDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [inviteRoles, setInviteRoles] = useState<ProvisionableRoleOption[]>(lookups.roles);
  const [eligibleCandidates, setEligibleCandidates] = useState(initialEligibleCandidates);
  const [inviteMode, setInviteMode] = useState<InviteMode>(
    initialEligibleCandidates.length > 0 ? "onboarding" : "direct",
  );
  const [inviteSuccess, setInviteSuccess] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const directForm = useForm<InviteExecutiveUserInput>({
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

  const onboardingForm = useForm<z.input<typeof provisionOnboardingCandidateSchema>>({
    resolver: zodResolver(provisionOnboardingCandidateSchema),
    defaultValues: {
      caseId: "",
      companyEmail: "",
      roleId: "",
      hrComments: "",
      salaryEffectiveFrom: todayIsoDate(),
      currencyCode: "INR",
      basicSalary: 0,
      hraAmount: 0,
      transportAllowance: 0,
      otherAllowances: 0,
    },
  });

  const roleCode = directForm.watch("roleCode");
  const departmentId = directForm.watch("departmentId");
  const employmentTypeId = directForm.watch("employmentTypeId");
  const selectedCaseId = onboardingForm.watch("caseId");
  const selectedRoleId = onboardingForm.watch("roleId");

  const selectedCandidate = useMemo(
    () => eligibleCandidates.find((candidate) => candidate.caseId === selectedCaseId),
    [eligibleCandidates, selectedCaseId],
  );

  const candidateSelectItems = useMemo(
    () =>
      eligibleCandidates.map((candidate) => ({
        value: candidate.caseId,
        label: `${candidate.fullName} · ${candidate.personalEmail}`,
      })),
    [eligibleCandidates],
  );

  const roleSelectItems = useMemo(
    () =>
      inviteRoles.map((role) => ({
        value: role.id,
        label: role.name,
      })),
    [inviteRoles],
  );

  useEffect(() => {
    setInviteRoles(lookups.roles);
  }, [lookups.roles]);

  useEffect(() => {
    setEligibleCandidates(initialEligibleCandidates);
  }, [initialEligibleCandidates]);

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    setInviteMode(initialEligibleCandidates.length > 0 ? "onboarding" : "direct");

    void fetchUserProvisioningInviteRolesAction().then((result) => {
      if (result.success) setInviteRoles(result.roles);
    });
    void fetchProvisioningEligibleCandidatesAction().then((result) => {
      if (result.success) setEligibleCandidates(result.candidates);
    });
  }, [open, initialEligibleCandidates.length]);

  useEffect(() => {
    if (!selectedCandidate) return;
    onboardingForm.setValue("roleId", selectedCandidate.intendedRoleId, { shouldValidate: true });
    onboardingForm.setValue(
      "salaryEffectiveFrom",
      selectedCandidate.joiningDate ?? todayIsoDate(),
      { shouldValidate: true },
    );
  }, [selectedCandidate, onboardingForm]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      directForm.reset();
      onboardingForm.reset({
        caseId: "",
        companyEmail: "",
        roleId: "",
        hrComments: "",
        salaryEffectiveFrom: todayIsoDate(),
        currencyCode: "INR",
        basicSalary: 0,
        hraAmount: 0,
        transportAllowance: 0,
        otherAllowances: 0,
      });
      setSubmitError(null);
    }
    onOpenChange(next);
  }

  const submitDirectInvite = directForm.handleSubmit((data) => {
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
      directForm.reset();
      handleOpenChange(false);
      onInvited();
    });
  });

  const submitOnboardingProvision = onboardingForm.handleSubmit((data) => {
    if (!inviteServiceReady) {
      setSubmitError("Invitations are not configured on this environment.");
      return;
    }

    setSubmitError(null);
    startTransition(async () => {
      const result = await provisionOnboardingCandidateAction(data);
      if (!result.success) {
        setSubmitError(result.message);
        return;
      }
      setInviteSuccess({
        title: "Employee provisioned",
        description: result.message,
      });
      onboardingForm.reset({
        caseId: "",
        companyEmail: "",
        roleId: "",
        hrComments: "",
        salaryEffectiveFrom: todayIsoDate(),
        currencyCode: "INR",
        basicSalary: 0,
        hraAmount: 0,
        transportAllowance: 0,
        otherAllowances: 0,
      });
      handleOpenChange(false);
      onInvited();
    });
  });

  const selectedDirectRole = inviteRoles.find((role) => role.code === roleCode);
  const selectedOnboardingRole = inviteRoles.find((role) => role.id === selectedRoleId);

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
              Provision completed onboarding candidates or invite executives and managers directly.
            </DialogDescription>
          </DialogHeader>

          <div className="flex shrink-0 gap-2 border-b px-5 py-3">
            <Button
              type="button"
              size="sm"
              variant={inviteMode === "onboarding" ? "default" : "outline"}
              disabled={eligibleCandidates.length === 0}
              onClick={() => setInviteMode("onboarding")}
            >
              From onboarding
            </Button>
            <Button
              type="button"
              size="sm"
              variant={inviteMode === "direct" ? "default" : "outline"}
              onClick={() => setInviteMode("direct")}
            >
              Direct invite
            </Button>
          </div>

          {inviteMode === "onboarding" ? (
            <form onSubmit={submitOnboardingProvision} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                {submitError ? (
                  <div
                    role="alert"
                    className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
                  >
                    {submitError}
                  </div>
                ) : null}

                {eligibleCandidates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No completed onboarding candidates are ready for provisioning.
                  </p>
                ) : null}

                <div className="space-y-2">
                  <Label>Completed onboarding candidate *</Label>
                  <LabeledSelect
                    value={selectedCaseId}
                    placeholder="Select candidate"
                    items={candidateSelectItems}
                    onValueChange={(value) =>
                      onboardingForm.setValue("caseId", value, { shouldValidate: true })
                    }
                    disabled={isPending || eligibleCandidates.length === 0}
                  />
                  {onboardingForm.formState.errors.caseId ? (
                    <p className="text-xs text-destructive">
                      {onboardingForm.formState.errors.caseId.message}
                    </p>
                  ) : null}
                </div>

                {selectedCandidate ? (
                  <div className="rounded-lg border bg-muted/30 px-3 py-2.5 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{selectedCandidate.fullName}</span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                        Onboarding complete · {selectedCandidate.completionPercent}%
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedCandidate.designationName ?? "—"} ·{" "}
                      {selectedCandidate.departmentName ?? "—"}
                    </p>
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Personal / onboarding email</Label>
                    <Input
                      value={selectedCandidate?.personalEmail ?? ""}
                      readOnly
                      disabled
                      className="bg-muted/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">Company email *</Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      placeholder="name@yourcompany.com"
                      disabled={isPending}
                      {...onboardingForm.register("companyEmail")}
                    />
                    {onboardingForm.formState.errors.companyEmail ? (
                      <p className="text-xs text-destructive">
                        {onboardingForm.formState.errors.companyEmail.message}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Portal role *</Label>
                  <LabeledSelect
                    value={selectedRoleId}
                    placeholder="Select role"
                    items={roleSelectItems}
                    onValueChange={(value) =>
                      onboardingForm.setValue("roleId", value, { shouldValidate: true })
                    }
                    disabled={isPending}
                  />
                  {selectedOnboardingRole ? (
                    <p className="text-[11px] text-muted-foreground">
                      {selectedOnboardingRole.portalLabel} · {selectedOnboardingRole.departmentLabel}
                    </p>
                  ) : null}
                  {onboardingForm.formState.errors.roleId ? (
                    <p className="text-xs text-destructive">
                      {onboardingForm.formState.errors.roleId.message}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium text-foreground">Salary structure</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Assign the employee&apos;s starting salary before portal access is granted.
                  </p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="salaryEffectiveFrom">Effective from *</Label>
                      <Input
                        id="salaryEffectiveFrom"
                        type="date"
                        disabled={isPending}
                        {...onboardingForm.register("salaryEffectiveFrom")}
                      />
                      {onboardingForm.formState.errors.salaryEffectiveFrom ? (
                        <p className="text-xs text-destructive">
                          {onboardingForm.formState.errors.salaryEffectiveFrom.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="basicSalary">Basic salary (INR) *</Label>
                      <Input
                        id="basicSalary"
                        type="number"
                        min={0}
                        step="0.01"
                        disabled={isPending}
                        {...onboardingForm.register("basicSalary")}
                      />
                      {onboardingForm.formState.errors.basicSalary ? (
                        <p className="text-xs text-destructive">
                          {onboardingForm.formState.errors.basicSalary.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hraAmount">HRA</Label>
                      <Input
                        id="hraAmount"
                        type="number"
                        min={0}
                        step="0.01"
                        disabled={isPending}
                        {...onboardingForm.register("hraAmount")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="transportAllowance">Transport allowance</Label>
                      <Input
                        id="transportAllowance"
                        type="number"
                        min={0}
                        step="0.01"
                        disabled={isPending}
                        {...onboardingForm.register("transportAllowance")}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hrComments">HR notes (optional)</Label>
                  <Input
                    id="hrComments"
                    placeholder="Internal provisioning notes"
                    disabled={isPending}
                    {...onboardingForm.register("hrComments")}
                  />
                </div>
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
                  disabled={
                    isPending || !inviteServiceReady || eligibleCandidates.length === 0
                  }
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  Invite User
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={submitDirectInvite} className="flex min-h-0 flex-1 flex-col">
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
                      {...directForm.register("fullName")}
                    />
                    {directForm.formState.errors.fullName ? (
                      <p className="text-xs text-destructive">
                        {directForm.formState.errors.fullName.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      disabled={isPending}
                      {...directForm.register("email")}
                    />
                    {directForm.formState.errors.email ? (
                      <p className="text-xs text-destructive">
                        {directForm.formState.errors.email.message}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Role *</Label>
                    <Select
                      value={roleCode || null}
                      onValueChange={(value) =>
                        directForm.setValue("roleCode", value ?? "", { shouldValidate: true })
                      }
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="Select role">
                          {selectedDirectRole?.name ?? "Select role"}
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
                    {directForm.formState.errors.roleCode ? (
                      <p className="text-xs text-destructive">
                        {directForm.formState.errors.roleCode.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label>Department *</Label>
                    <LabeledSelect
                      value={departmentId}
                      placeholder="Select department"
                      items={toLookupSelectItems(lookups.departments)}
                      onValueChange={(value) =>
                        directForm.setValue("departmentId", value, { shouldValidate: true })
                      }
                      disabled={isPending}
                    />
                    {directForm.formState.errors.departmentId ? (
                      <p className="text-xs text-destructive">
                        {directForm.formState.errors.departmentId.message}
                      </p>
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
                      {...directForm.register("designation")}
                    />
                    {directForm.formState.errors.designation ? (
                      <p className="text-xs text-destructive">
                        {directForm.formState.errors.designation.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label>Employment Type *</Label>
                    <LabeledSelect
                      value={employmentTypeId}
                      placeholder="Select employment type"
                      items={toLookupSelectItems(lookups.employmentTypes)}
                      onValueChange={(value) =>
                        directForm.setValue("employmentTypeId", value, { shouldValidate: true })
                      }
                      disabled={isPending}
                    />
                    {directForm.formState.errors.employmentTypeId ? (
                      <p className="text-xs text-destructive">
                        {directForm.formState.errors.employmentTypeId.message}
                      </p>
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
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
