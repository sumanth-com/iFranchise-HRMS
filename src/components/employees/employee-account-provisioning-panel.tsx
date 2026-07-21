"use client";

import { format } from "date-fns";
import { Loader2, Mail, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { SuccessCelebrationOverlay } from "@/components/common/success-celebration-overlay";
import { EmployeeAccountStatusBadge } from "@/components/employees/employee-account-status-badge";
import {
  activateEmployeeAccountAction,
  cancelEmployeeInvitationAction,
  resendEmployeeInvitationAction,
} from "@/lib/employees/actions";
import { EmployeeInviteSection } from "@/components/employees/employee-invite-form";
import type {
  EmployeeAccountProvisioningItem,
  EmployeeAccountProvisioningSummary,
  LookupOption,
} from "@/types/employee";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex h-[52px] flex-col justify-center rounded-xl border bg-background px-3 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-lg font-semibold leading-tight">{value}</p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Not sent";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not sent";
  return format(date, "MMM d, yyyy");
}

type PendingAction = {
  employeeId: string;
  type: "resend" | "cancel";
};

export function EmployeeAccountProvisioningPanel({
  summary,
  lookups,
  canInvite,
  canCancelInvitation,
  canActivate,
  inviteServiceReady,
}: {
  summary: EmployeeAccountProvisioningSummary;
  lookups: {
    departments: LookupOption[];
    employmentTypes: LookupOption[];
    managers: LookupOption[];
  };
  canInvite: boolean;
  canCancelInvitation: boolean;
  canActivate: boolean;
  inviteServiceReady: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [removedInvitationIds, setRemovedInvitationIds] = useState<string[]>([]);
  const [exitingInvitationIds, setExitingInvitationIds] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [cancelTarget, setCancelTarget] = useState<EmployeeAccountProvisioningItem | null>(null);
  const [resendSuccess, setResendSuccess] = useState<{
    title: string;
    description: string;
  } | null>(null);

  const pendingSignature = summary.pendingInvitations.map((item) => item.id).join(",");

  useEffect(() => {
    setRemovedInvitationIds([]);
    setExitingInvitationIds([]);
  }, [pendingSignature]);

  const visiblePendingInvitations = summary.pendingInvitations.filter(
    (employee) => !removedInvitationIds.includes(employee.id),
  );
  const pendingCount = Math.max(
    0,
    summary.invitationPending -
      removedInvitationIds.filter((id) =>
        summary.pendingInvitations.some((item) => item.id === id),
      ).length,
  );

  async function runInvitationAction(
    employee: EmployeeAccountProvisioningItem,
    type: "resend" | "cancel",
    action: () => Promise<{ success: true } | { success: false; message: string }>,
    successMessage: string,
    successDescription?: string,
  ) {
    setPendingAction({ employeeId: employee.id, type });
    const result = await action();
    setPendingAction(null);

    if (!result.success) {
      toast.error("Action failed", { description: result.message });
      return;
    }

    if (type === "cancel") {
      setCancelTarget(null);
      setExitingInvitationIds((current) =>
        current.includes(employee.id) ? current : [...current, employee.id],
      );
      window.setTimeout(() => {
        setRemovedInvitationIds((current) =>
          current.includes(employee.id) ? current : [...current, employee.id],
        );
        setExitingInvitationIds((current) =>
          current.filter((id) => id !== employee.id),
        );
      }, 280);
      toast.success(successMessage, { description: successDescription });
    }

    if (type === "resend") {
      setResendSuccess({
        title: successMessage,
        description: successDescription ?? "",
      });
    }

    router.refresh();
  }

  async function confirmCancelInvitation() {
    if (!cancelTarget) return;
    const employee = cancelTarget;
    setCancelTarget(null);
    await runInvitationAction(
      employee,
      "cancel",
      () => cancelEmployeeInvitationAction(employee.id),
      "Invitation cancelled",
      `${employee.fullName} was removed from pending invitations.`,
    );
  }

  function renderPendingInvitation(employee: EmployeeAccountProvisioningItem) {
    const isResending =
      pendingAction?.employeeId === employee.id && pendingAction.type === "resend";
    const isCancelling =
      pendingAction?.employeeId === employee.id && pendingAction.type === "cancel";
    const isRowBusy = isResending || isCancelling;

    return (
      <li
        key={employee.id}
        className="rounded-xl border bg-background p-3.5 shadow-sm transition-all duration-300 data-[busy=true]:opacity-70 data-[removing=true]:pointer-events-none data-[removing=true]:scale-[0.98] data-[removing=true]:opacity-0"
        data-busy={isRowBusy}
        data-removing={isCancelling || exitingInvitationIds.includes(employee.id)}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium">{employee.fullName}</p>
                <EmployeeAccountStatusBadge status={employee.accountStatus} />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {employee.employeeCode} · {employee.email}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Sent {formatDate(employee.invitationSentAt)}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 gap-2 sm:pl-2">
            {canInvite ? (
              <Button
                size="sm"
                variant="outline"
                disabled={isPending || isRowBusy || !inviteServiceReady || Boolean(cancelTarget)}
                onClick={() =>
                  runInvitationAction(
                    employee,
                    "resend",
                    () => resendEmployeeInvitationAction(employee.id),
                    "Invitation resent",
                    `A new invitation was sent to ${employee.email}.`,
                  )
                }
              >
                {isResending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Resend
              </Button>
            ) : null}
            {canCancelInvitation ? (
              <Button
                size="sm"
                variant="outline"
                disabled={isPending || isRowBusy || !inviteServiceReady || Boolean(cancelTarget)}
                onClick={() => setCancelTarget(employee)}
              >
                <XCircle className="size-4" />
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      </li>
    );
  }

  const renderSuspendedEmployee = (employee: EmployeeAccountProvisioningItem) => (
    <li
      key={employee.id}
      className="flex flex-col gap-3 rounded-xl border bg-background p-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">{employee.fullName}</p>
          <EmployeeAccountStatusBadge status={employee.accountStatus} />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {employee.employeeCode} · {employee.email}
        </p>
      </div>
      {canActivate ? (
        <Button
          size="sm"
          disabled={isPending || !inviteServiceReady}
          onClick={() =>
            startTransition(async () => {
              const result = await activateEmployeeAccountAction(employee.id);
              if (!result.success) {
                toast.error(result.message);
                return;
              }
              toast.success("Account activated");
              router.refresh();
            })
          }
        >
          <ShieldCheck className="size-4" />
          Activate
        </Button>
      ) : null}
    </li>
  );

  return (
    <>
      <SuccessCelebrationOverlay
        open={Boolean(resendSuccess)}
        title={resendSuccess?.title ?? "Invitation resent"}
        description={resendSuccess?.description}
        durationMs={3000}
        onClose={() => setResendSuccess(null)}
      />

      <section className="rounded-2xl border bg-card p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between">
          {canInvite ? (
            <EmployeeInviteSection
              lookups={{
                departments: lookups.departments,
                employmentTypes: lookups.employmentTypes,
                managers: lookups.managers,
              }}
              canInvite={canInvite}
              inviteServiceReady={inviteServiceReady}
            />
          ) : (
            <div className="hidden lg:block lg:max-w-sm" />
          )}
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4 lg:max-w-xl">
            <StatCard label="Draft" value={summary.draft + summary.invited} />
            <StatCard label="Pending" value={pendingCount} />
            <StatCard label="Active" value={summary.active} />
            <StatCard label="Suspended" value={summary.suspended} />
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Pending invitations</h3>
            {visiblePendingInvitations.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No pending invitations.
              </div>
            ) : (
              <ul className="space-y-2">
                {visiblePendingInvitations.map(renderPendingInvitation)}
              </ul>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Suspended accounts</h3>
            {summary.suspendedAccounts.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No suspended employee accounts.
              </div>
            ) : (
              <ul className="space-y-2">
                {summary.suspendedAccounts.map(renderSuspendedEmployee)}
              </ul>
            )}
          </div>
        </div>
      </section>

      <Modal
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open && !pendingAction) setCancelTarget(null);
        }}
        title="Cancel invitation?"
        description={
          cancelTarget
            ? `This will withdraw the invitation for ${cancelTarget.fullName} (${cancelTarget.email}). They will no longer be able to activate their account with the current link.`
            : undefined
        }
        showCancel={false}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={pendingAction?.type === "cancel"}
              onClick={() => setCancelTarget(null)}
            >
              Keep invitation
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pendingAction?.type === "cancel"}
              onClick={() => void confirmCancelInvitation()}
            >
              {pendingAction?.type === "cancel" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <XCircle className="size-4" />
              )}
              Yes, cancel invitation
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          You can send a new invitation later from the employee record if needed.
        </p>
      </Modal>
    </>
  );
}
