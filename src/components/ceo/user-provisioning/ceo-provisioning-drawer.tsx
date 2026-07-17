"use client";

import { format } from "date-fns";
import { Ban, Loader2, Power, RotateCw, ShieldX } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { CeoProvisioningStatusBadge } from "@/components/ceo/user-provisioning/ceo-provisioning-status-badge";
import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchCeoProvisioningUserDetailAction } from "@/lib/ceo/actions/ceo-user-provisioning-actions";
import type {
  CeoProvisioningUserDetail,
  ProvisioningRowAction,
} from "@/types/ceo-user-provisioning";

type CeoProvisioningDrawerProps = {
  employeeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (action: ProvisioningRowAction, detail: CeoProvisioningUserDetail) => void;
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-background/80 px-3 py-2.5">
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

function fmt(value: string | null) {
  return value ? format(new Date(value), "d MMM yyyy, h:mm a") : "—";
}

export function CeoProvisioningDrawer({
  employeeId,
  open,
  onOpenChange,
  onAction,
}: CeoProvisioningDrawerProps) {
  const [detail, setDetail] = useState<CeoProvisioningUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !employeeId) {
      setDetail(null);
      setError(null);
      return;
    }
    startTransition(async () => {
      const result = await fetchCeoProvisioningUserDetailAction(employeeId);
      if (!result.success) {
        setDetail(null);
        setError(result.message);
        return;
      }
      setError(null);
      setDetail(result.data);
    });
  }, [open, employeeId]);

  const user = detail?.user;
  const accountStatus = user?.accountStatus;
  const showResend = accountStatus === "invitation_pending";
  const showCancel = accountStatus === "invitation_pending";
  const showDeactivate = accountStatus === "active" && !user?.isSelf;
  const showReactivate = accountStatus === "suspended" || accountStatus === "inactive";
  const hasQuickActions = showResend || showCancel || showDeactivate || showReactivate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-5 py-4">
          <DialogTitle>Executive User Details</DialogTitle>
        </DialogHeader>

        {isPending ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading details…
          </div>
        ) : error ? (
          <p className="py-10 text-center text-sm text-destructive">{error}</p>
        ) : detail && user ? (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4">
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{user.fullName}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {user.employeeCode} · {user.roleLabel}
                </p>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              </div>
              <CeoProvisioningStatusBadge status={user.invitationStatus} />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Assigned Role" value={user.roleLabel} />
              <Field label="Department" value={user.departmentName} />
              <Field label="Designation" value={user.designationTitle} />
              <Field label="Branch" value={user.branchName} />
              <Field label="Reporting Manager" value={user.reportingManagerName} />
              <Field label="Employment Type" value={detail.employmentTypeName} />
              <Field label="Account Status" value={user.accountStatus} />
              <Field label="Invited By" value={user.sentByName} />
              <Field
                label="Joining Date"
                value={detail.joiningDate ? format(new Date(detail.joiningDate), "d MMM yyyy") : null}
              />
              <Field label="Last Login" value={fmt(user.lastActivityAt)} />
            </div>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Invitation Timeline</h3>
              {detail.timeline.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No activity recorded yet.</p>
              ) : (
                <ol className="mt-3 space-y-3">
                  {detail.timeline.map((entry, index) => (
                    <li key={`${entry.label}-${index}`} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="mt-1 size-2 rounded-full bg-primary" />
                        {index < detail.timeline.length - 1 ? (
                          <span className="mt-1 w-px flex-1 bg-border" />
                        ) : null}
                      </div>
                      <div className="pb-1">
                        <p className="text-sm font-medium">{entry.label}</p>
                        <p className="text-xs text-muted-foreground">{fmt(entry.timestamp)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Permissions Summary</h3>
                <span className="text-xs text-muted-foreground">
                  {detail.permissions.length} permissions
                </span>
              </div>
              {detail.permissions.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No permissions resolved.</p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {detail.permissions.slice(0, 24).map((code) => (
                    <span
                      key={code}
                      className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {code}
                    </span>
                  ))}
                  {detail.permissions.length > 24 ? (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      +{detail.permissions.length - 24} more
                    </span>
                  ) : null}
                </div>
              )}
            </section>

            {hasQuickActions ? (
              <section className="rounded-xl border p-4">
                <h3 className="text-sm font-semibold">Quick Actions</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {showResend ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => onAction("resend", detail)}
                    >
                      <RotateCw className="size-3.5" />
                      Resend invitation
                    </Button>
                  ) : null}
                  {showReactivate ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => onAction("reactivate", detail)}
                    >
                      <Power className="size-3.5" />
                      Reactivate user
                    </Button>
                  ) : null}
                  {showCancel ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => onAction("cancel", detail)}
                    >
                      <ShieldX className="size-3.5" />
                      Cancel invitation
                    </Button>
                  ) : null}
                  {showDeactivate ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => onAction("deactivate", detail)}
                    >
                      <Ban className="size-3.5" />
                      Deactivate user
                    </Button>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
