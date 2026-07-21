"use client";

import { format } from "date-fns";
import { Loader2, Mail, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
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
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const pendingSignature = summary.pendingInvitations.map((item) => item.id).join(",");

  useEffect(() => {
    setRemovedInvitationIds([]);
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
    employeeId: string,
    type: "resend" | "cancel",
    action: () => Promise<{ success: true } | { success: false; message: string }>,
    successMessage: string,
  ) {
    setPendingAction({ employeeId, type });
    const result = await action();
    setPendingAction(null);

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    if (type === "cancel") {
      setRemovedInvitationIds((current) =>
        current.includes(employeeId) ? current : [...current, employeeId],
      );
    }

    toast.success(successMessage);
    router.refresh();
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
        className="rounded-xl border bg-background p-3.5 shadow-sm transition-opacity data-[busy=true]:opacity-70"
        data-busy={isRowBusy}
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
                disabled={isPending || isRowBusy || !inviteServiceReady}
                onClick={() =>
                  runInvitationAction(
                    employee.id,
                    "resend",
                    () => resendEmployeeInvitationAction(employee.id),
                    "Invitation resent",
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
                disabled={isPending || isRowBusy || !inviteServiceReady}
                onClick={() => {
                  if (!window.confirm(`Cancel invitation for ${employee.fullName}?`)) return;
                  void runInvitationAction(
                    employee.id,
                    "cancel",
                    () => cancelEmployeeInvitationAction(employee.id),
                    "Invitation cancelled",
                  );
                }}
              >
                {isCancelling ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <XCircle className="size-4" />
                )}
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
  );
}
