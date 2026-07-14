"use client";

import { format } from "date-fns";
import { Loader2, Mail, Power, RotateCcw, ShieldOff, UserCheck, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  EmployeeAccountStatusBadge,
  EmployeeLoginStatusBadge,
  getEmployeeLoginStatus,
} from "@/components/employees/employee-account-status-badge";
import { Button } from "@/components/common/button";
import {
  activateEmployeeAccountAction,
  cancelEmployeeInvitationAction,
  deactivateEmployeeAccountAction,
  resendEmployeeInvitationAction,
  resetEmployeePasswordAction,
  sendEmployeeInvitationAction,
  suspendEmployeeAccountAction,
} from "@/lib/employees/actions";
import { EMPLOYEE_ACCOUNT_STATUS_LABELS } from "@/lib/employees/constants";
import { hasPermission } from "@/lib/permissions/utils";
import type { EmployeeDetail } from "@/types/employee";

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "MMM d, yyyy, h:mm a");
}

function AccountInfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 rounded-xl border bg-background px-4 py-3 sm:grid-cols-[11rem_1fr] sm:items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 text-sm font-medium">{children}</div>
    </div>
  );
}

export function EmployeeAccountSection({
  employee,
  permissionCodes,
}: {
  employee: EmployeeDetail;
  permissionCodes: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const canInvite = hasPermission(permissionCodes, "employee_account.invite");
  const canCancel = hasPermission(permissionCodes, "employee_account.cancel_invitation");
  const canReset = hasPermission(permissionCodes, "employee_account.reset_password");
  const canSuspend = hasPermission(permissionCodes, "employee_account.suspend");
  const canDeactivate = hasPermission(permissionCodes, "employee_account.deactivate");
  const canActivate = hasPermission(permissionCodes, "employee_account.activate");

  function runAction(action: () => Promise<{ success: true } | { success: false; message: string }>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(success);
      router.refresh();
    });
  }

  const actionIcon = isPending ? <Loader2 className="size-4 animate-spin" /> : null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Employee Account</h2>
          <p className="text-sm text-muted-foreground">
            Supabase Auth login, invitation lifecycle, and HR account controls.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <EmployeeAccountStatusBadge status={employee.accountStatus} />
          <EmployeeLoginStatusBadge status={employee.accountStatus} />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <AccountInfoRow label="Company Email">
          <a href={`mailto:${employee.email}`} className="text-primary hover:underline">
            {employee.email}
          </a>
        </AccountInfoRow>
        <AccountInfoRow label="Login Status">
          {getEmployeeLoginStatus(employee.accountStatus)}
        </AccountInfoRow>
        <AccountInfoRow label="Account Status">
          {EMPLOYEE_ACCOUNT_STATUS_LABELS[employee.accountStatus]}
        </AccountInfoRow>
        <AccountInfoRow label="Invitation Sent On">
          {formatDateTime(employee.invitationSentAt)}
        </AccountInfoRow>
        <AccountInfoRow label="Last Login">{formatDateTime(employee.lastLoginAt)}</AccountInfoRow>
        <AccountInfoRow label="Password Last Reset">
          {formatDateTime(employee.passwordLastResetAt)}
        </AccountInfoRow>
        <AccountInfoRow label="Auth User ID">
          <span className="break-all font-mono text-xs">{employee.userId ?? "—"}</span>
        </AccountInfoRow>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="mb-3">
          <h3 className="text-sm font-semibold">HR Actions</h3>
          <p className="text-xs text-muted-foreground">
            Actions are permission-controlled and logged in Audit Logs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {employee.accountStatus === "draft" && canInvite ? (
            <Button
              disabled={isPending}
              onClick={() =>
                runAction(() => sendEmployeeInvitationAction(employee.id), "Invitation sent")
              }
            >
              {actionIcon ?? <Mail className="size-4" />}
              Send Invitation
            </Button>
          ) : null}

          {employee.accountStatus === "invitation_pending" ? (
            <>
              {canInvite ? (
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    runAction(
                      () => resendEmployeeInvitationAction(employee.id),
                      "Invitation resent",
                    )
                  }
                >
                  {actionIcon ?? <Mail className="size-4" />}
                  Resend Invitation
                </Button>
              ) : null}
              {canCancel ? (
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={() => {
                    if (!window.confirm("Cancel this employee invitation?")) return;
                    runAction(
                      () => cancelEmployeeInvitationAction(employee.id),
                      "Invitation cancelled",
                    );
                  }}
                >
                  {actionIcon ?? <XCircle className="size-4" />}
                  Cancel Invitation
                </Button>
              ) : null}
            </>
          ) : null}

          {employee.accountStatus === "active" ? (
            <>
              {canReset ? (
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    runAction(() => resetEmployeePasswordAction(employee.id), "Password reset sent")
                  }
                >
                  {actionIcon ?? <RotateCcw className="size-4" />}
                  Reset Password
                </Button>
              ) : null}
              {canSuspend ? (
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={() => {
                    if (!window.confirm("Suspend this employee login?")) return;
                    runAction(() => suspendEmployeeAccountAction(employee.id), "Account suspended");
                  }}
                >
                  {actionIcon ?? <ShieldOff className="size-4" />}
                  Suspend Account
                </Button>
              ) : null}
              {canDeactivate ? (
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={() => {
                    if (!window.confirm("Deactivate this employee login?")) return;
                    runAction(
                      () => deactivateEmployeeAccountAction(employee.id),
                      "Account deactivated",
                    );
                  }}
                >
                  {actionIcon ?? <Power className="size-4" />}
                  Deactivate Account
                </Button>
              ) : null}
            </>
          ) : null}

          {(employee.accountStatus === "suspended" || employee.accountStatus === "inactive") &&
          canActivate ? (
            <Button
              disabled={isPending}
              onClick={() =>
                runAction(() => activateEmployeeAccountAction(employee.id), "Account activated")
              }
            >
              {actionIcon ?? <UserCheck className="size-4" />}
              Activate Account
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
