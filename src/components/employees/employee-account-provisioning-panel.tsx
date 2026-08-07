"use client";

import { format } from "date-fns";
import { Loader2, Mail, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { SuccessCelebrationOverlay } from "@/components/common/success-celebration-overlay";
import { cn } from "@/lib/utils";
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
    roles: LookupOption[];
    branches: LookupOption[];
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
        className="px-3 py-2.5 transition-all duration-300 data-[busy=true]:opacity-70 data-[removing=true]:pointer-events-none data-[removing=true]:scale-[0.98] data-[removing=true]:opacity-0"
        data-busy={isRowBusy}
        data-removing={isCancelling || exitingInvitationIds.includes(employee.id)}
      >
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Mail className="size-3.5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium">{employee.fullName}</p>
                <EmployeeAccountStatusBadge status={employee.accountStatus} />
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {employee.employeeCode} · {employee.email}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Sent {formatDate(employee.invitationSentAt)}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 gap-1.5 sm:pl-2">
            {canInvite ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2.5"
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
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                Resend
              </Button>
            ) : null}
            {canCancelInvitation ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2.5 text-muted-foreground hover:text-destructive"
                disabled={isPending || isRowBusy || !inviteServiceReady || Boolean(cancelTarget)}
                onClick={() => setCancelTarget(employee)}
              >
                <XCircle className="size-3.5" />
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

      <div
        className={cn(
          "grid gap-4 lg:items-stretch",
          canInvite ? "lg:grid-cols-2" : "grid-cols-1",
        )}
      >
        {canInvite ? (
          <EmployeeInviteSection
            lookups={lookups}
            canInvite={canInvite}
            inviteServiceReady={inviteServiceReady}
            variant="panel"
          />
        ) : null}

        {canInvite || canCancelInvitation ? (
          <div className="flex h-[14rem] min-h-[14rem] flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold tracking-tight">Pending invitations</h3>
                <p className="text-xs text-muted-foreground">
                  Waiting for employees to activate
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
                  pendingCount > 0
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {pendingCount}
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {visiblePendingInvitations.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-4 py-6 text-center">
                  <Mail className="size-5 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">No pending invitations</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    New invites will show up here until activated.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {visiblePendingInvitations.map(renderPendingInvitation)}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {canActivate && summary.suspendedAccounts.length > 0 ? (
        <div className="mt-4 space-y-3 rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold tracking-tight">Suspended accounts</h3>
          <ul className="space-y-2">
            {summary.suspendedAccounts.map(renderSuspendedEmployee)}
          </ul>
        </div>
      ) : null}

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
