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
  fetchPortalInviteEligibleEmployeesAction,
  fetchProvisioningEligibleCandidatesAction,
  fetchUserProvisioningInviteRolesAction,
  inviteExecutiveUserAction,
  inviteExistingEmployeeAction,
  provisionOnboardingCandidateAction,
} from "@/lib/ceo/actions/ceo-user-provisioning-actions";
import type { ProvisioningEligibleCandidate } from "@/lib/onboarding/provisioning-eligibility";
import {
  inviteExecutiveUserSchema,
  inviteExistingEmployeeSchema,
  type InviteExecutiveUserInput,
} from "@/lib/validations/ceo-user-provisioning";
import {
  provisionOnboardingCandidateSchema,
} from "@/lib/validations/onboarding-provisioning";
import type { z } from "zod";
import type {
  CeoProvisioningLookups,
  PortalInviteEligibleEmployee,
  ProvisionableRoleOption,
} from "@/types/ceo-user-provisioning";

type InviteMode = "onboarding" | "existing" | "direct";

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
  const [existingEmployees, setExistingEmployees] = useState<PortalInviteEligibleEmployee[]>([]);
  const [existingSearch, setExistingSearch] = useState("");
  const [inviteMode, setInviteMode] = useState<InviteMode>(
    initialEligibleCandidates.length > 0 ? "onboarding" : "existing",
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

  const existingForm = useForm<z.input<typeof inviteExistingEmployeeSchema>>({
    resolver: zodResolver(inviteExistingEmployeeSchema),
    defaultValues: {
      employeeId: "",
      roleCode: "",
      companyEmail: "",
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
  const selectedExistingId = existingForm.watch("employeeId");
  const existingRoleCode = existingForm.watch("roleCode");

  const selectedCandidate = useMemo(
    () => eligibleCandidates.find((candidate) => candidate.caseId === selectedCaseId),
    [eligibleCandidates, selectedCaseId],
  );

  const selectedExisting = useMemo(
    () => existingEmployees.find((employee) => employee.employeeId === selectedExistingId),
    [existingEmployees, selectedExistingId],
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
    setInviteMode(initialEligibleCandidates.length > 0 ? "onboarding" : "existing");
    setExistingSearch("");

    void fetchUserProvisioningInviteRolesAction().then((result) => {
      if (result.success) setInviteRoles(result.roles);
    });
    void fetchProvisioningEligibleCandidatesAction().then((result) => {
      if (result.success) setEligibleCandidates(result.candidates);
    });
    void fetchPortalInviteEligibleEmployeesAction().then((result) => {
      if (result.success) setExistingEmployees(result.employees);
    });
  }, [open, initialEligibleCandidates.length]);

  useEffect(() => {
    if (!open || inviteMode !== "existing") return;
    const handle = window.setTimeout(() => {
      void fetchPortalInviteEligibleEmployeesAction(existingSearch).then((result) => {
        if (result.success) setExistingEmployees(result.employees);
      });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [existingSearch, inviteMode, open]);

  useEffect(() => {
    if (!selectedCandidate) return;
    onboardingForm.setValue("roleId", selectedCandidate.intendedRoleId, { shouldValidate: true });
    onboardingForm.setValue(
      "salaryEffectiveFrom",
      selectedCandidate.joiningDate ?? todayIsoDate(),
      { shouldValidate: true },
    );
  }, [selectedCandidate, onboardingForm]);

  useEffect(() => {
    if (!selectedExisting) return;
    existingForm.setValue("companyEmail", selectedExisting.companyEmail, {
      shouldValidate: true,
    });
  }, [selectedExisting, existingForm]);

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
      existingForm.reset({
        employeeId: "",
        roleCode: "",
        companyEmail: "",
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

  const submitExistingInvite = existingForm.handleSubmit((data) => {
    if (!inviteServiceReady) {
      setSubmitError("Invitations are not configured on this environment.");
      return;
    }

    setSubmitError(null);
    startTransition(async () => {
      const companyEmail =
        typeof data.companyEmail === "string" && data.companyEmail.trim()
          ? data.companyEmail.trim().toLowerCase()
          : undefined;
      const result = await inviteExistingEmployeeAction({
        ...data,
        companyEmail,
      });
      if (!result.success) {
        setSubmitError(result.message);
        return;
      }
      setInviteSuccess({
        title: "Invitation sent",
        description: result.message,
      });
      existingForm.reset({
        employeeId: "",
        roleCode: "",
        companyEmail: "",
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
  const selectedExistingRole = inviteRoles.find((role) => role.code === existingRoleCode);

  const existingSelectItems = useMemo(
    () =>
      existingEmployees.map((employee) => ({
        value: employee.employeeId,
        label: `${employee.fullName} · ${employee.employeeCode}`,
      })),
    [existingEmployees],
  );

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
              Invite an existing employee without creating a duplicate record, provision
              onboarding candidates, or send a direct invite.
            </DialogDescription>
          </DialogHeader>

          <div className="flex shrink-0 flex-wrap gap-2 border-b px-5 py-3">
            <Button
              type="button"
              size="sm"
              variant={inviteMode === "existing" ? "default" : "outline"}
              onClick={() => setInviteMode("existing")}
            >
              Existing employee
            </Button>
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

          {inviteMode === "existing" ? (
            <form onSubmit={submitExistingInvite} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                {submitError ? (
                  <div
                    role="alert"
                    className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
                  >
                    {submitError}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="existing-employee-search">Search employee</Label>
                  <Input
                    id="existing-employee-search"
                    value={existingSearch}
                    placeholder="Search by name, employee ID, or email"
                    onChange={(event) => setExistingSearch(event.target.value)}
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Employee *</Label>
                  <LabeledSelect
                    value={selectedExistingId}
                    placeholder="Select existing employee"
                    items={existingSelectItems}
                    onValueChange={(value) =>
                      existingForm.setValue("employeeId", value, { shouldValidate: true })
                    }
                    disabled={isPending || existingEmployees.length === 0}
                  />
                  {existingEmployees.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No employees without portal access matched this search.
                    </p>
                  ) : null}
                  {existingForm.formState.errors.employeeId ? (
                    <p className="text-xs text-muted-foreground">
                      {existingForm.formState.errors.employeeId.message}
                    </p>
                  ) : null}
                </div>

                {selectedExisting ? (
                  <div className="grid gap-2 rounded-xl border bg-muted/30 p-3 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Employee
                      </p>
                      <p className="font-medium">{selectedExisting.fullName}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Employee ID
                      </p>
                      <p className="font-medium">{selectedExisting.employeeCode}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Personal email
                      </p>
                      <p className="font-medium">{selectedExisting.personalEmail ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Company email
                      </p>
                      <p className="font-medium">{selectedExisting.companyEmail}</p>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="existing-company-email">Company email *</Label>
                  <Input
                    id="existing-company-email"
                    type="email"
                    disabled={isPending}
                    {...existingForm.register("companyEmail")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Role *</Label>
                  <LabeledSelect
                    value={existingRoleCode}
                    placeholder="Select portal role"
                    items={inviteRoles.map((role) => ({
                      value: role.code,
                      label: role.name,
                    }))}
                    onValueChange={(value) =>
                      existingForm.setValue("roleCode", value, { shouldValidate: true })
                    }
                    disabled={isPending}
                  />
                  {selectedExistingRole ? (
                    <p className="text-xs text-muted-foreground">
                      Portal: {selectedExistingRole.portalLabel}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-3 rounded-xl border p-3">
                  <p className="text-sm font-semibold">Salary structure</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="existing-salary-date">Effective from *</Label>
                      <Input
                        id="existing-salary-date"
                        type="date"
                        disabled={isPending}
                        {...existingForm.register("salaryEffectiveFrom")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="existing-basic-salary">Basic salary *</Label>
                      <Input
                        id="existing-basic-salary"
                        type="number"
                        min={0}
                        step="0.01"
                        disabled={isPending}
                        {...existingForm.register("basicSalary", { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="existing-hra">HRA</Label>
                      <Input
                        id="existing-hra"
                        type="number"
                        min={0}
                        step="0.01"
                        disabled={isPending}
                        {...existingForm.register("hraAmount", { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="existing-transport">Transport allowance</Label>
                      <Input
                        id="existing-transport"
                        type="number"
                        min={0}
                        step="0.01"
                        disabled={isPending}
                        {...existingForm.register("transportAllowance", {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                  </div>
                  {selectedExisting?.hasSalaryStructure ? (
                    <p className="text-xs text-muted-foreground">
                      This employee already has a salary structure. Saving creates a new
                      effective record and closes the previous one.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t px-5 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending || !inviteServiceReady}>
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Send invitation
                </Button>
              </div>
            </form>
          ) : null}

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
          ) : null}

          {inviteMode === "direct" ? (
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
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
