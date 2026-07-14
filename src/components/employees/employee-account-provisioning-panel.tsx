"use client";

import { format } from "date-fns";
import { Loader2, Mail, RefreshCw, ShieldCheck, UserRoundPlus, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { EmployeeAccountStatusBadge } from "@/components/employees/employee-account-status-badge";
import {
  activateEmployeeAccountAction,
  cancelEmployeeInvitationAction,
  inviteEmployeeByEmailAction,
  resendEmployeeInvitationAction,
} from "@/lib/employees/actions";
import type {
  EmployeeAccountProvisioningItem,
  EmployeeAccountProvisioningSummary,
} from "@/types/employee";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-background px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Not sent";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not sent";
  return format(date, "MMM d, yyyy");
}

export function EmployeeAccountProvisioningPanel({
  summary,
  canInvite,
  canCancelInvitation,
  canActivate,
  inviteServiceReady,
}: {
  summary: EmployeeAccountProvisioningSummary;
  canInvite: boolean;
  canCancelInvitation: boolean;
  canActivate: boolean;
  inviteServiceReady: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  function runAction(
    action: () => Promise<{ success: true } | { success: false; message: string }>,
    successMessage: string,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(successMessage);
      router.refresh();
    });
  }

  function handleDirectInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error("Enter an employee email");
      return;
    }

    runAction(
      () => inviteEmployeeByEmailAction({ email: trimmedEmail }),
      "Invitation sent",
    );
    setEmail("");
  }

  const renderEmployee = (
    employee: EmployeeAccountProvisioningItem,
    actions: ReactNode,
  ) => (
    <li
      key={employee.id}
      className="flex flex-col gap-3 rounded-xl border bg-background px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">{employee.fullName}</p>
          <EmployeeAccountStatusBadge status={employee.accountStatus} />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {employee.employeeCode} · {employee.email}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Invite: {formatDate(employee.invitationSentAt)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </li>
  );

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="grid gap-4 xl:grid-cols-[minmax(20rem,1fr)_auto] xl:items-start">
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <UserRoundPlus className="size-4 text-primary" />
            Invite Employee
          </h2>
          <p className="text-sm text-muted-foreground">
            Enter a company email to create a draft employee account and send the login invite.
          </p>
          <form
            onSubmit={handleDirectInvite}
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="employee@company.com"
              className="h-9 sm:max-w-sm"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !canInvite || !inviteServiceReady}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
              Send Invite
            </Button>
          </form>
          {!inviteServiceReady ? (
            <p className="text-xs text-amber-600">
              Invite sending is not configured for this environment.
            </p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[22rem]">
          <StatCard label="Draft" value={summary.draft + summary.invited} />
          <StatCard label="Pending" value={summary.invitationPending} />
          <StatCard label="Active" value={summary.active} />
          <StatCard label="Suspended" value={summary.suspended} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Pending invitations</h3>
          {summary.pendingInvitations.length === 0 ? (
            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              No pending invitations.
            </p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {summary.pendingInvitations.map((employee) =>
                renderEmployee(
                  employee,
                  <>
                    {canInvite ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending || !inviteServiceReady}
                        onClick={() =>
                          runAction(
                            () => resendEmployeeInvitationAction(employee.id),
                            "Invitation resent",
                          )
                        }
                      >
                        <RefreshCw className="size-4" />
                        Resend
                      </Button>
                    ) : null}
                    {canCancelInvitation ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending || !inviteServiceReady}
                        onClick={() => {
                          if (!window.confirm("Cancel this invitation?")) return;
                          runAction(
                            () => cancelEmployeeInvitationAction(employee.id),
                            "Invitation cancelled",
                          );
                        }}
                      >
                        <XCircle className="size-4" />
                        Cancel
                      </Button>
                    ) : null}
                  </>,
                ),
              )}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Suspended accounts</h3>
          {summary.suspendedAccounts.length === 0 ? (
            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              No suspended employee accounts.
            </p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {summary.suspendedAccounts.map((employee) =>
                renderEmployee(
                  employee,
                  canActivate ? (
                    <Button
                      size="sm"
                      disabled={isPending || !inviteServiceReady}
                      onClick={() =>
                        runAction(
                          () => activateEmployeeAccountAction(employee.id),
                          "Account activated",
                        )
                      }
                    >
                      <ShieldCheck className="size-4" />
                      Activate
                    </Button>
                  ) : null,
                ),
              )}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
