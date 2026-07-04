"use client";

import { type ReactNode, useState, useTransition } from "react";
import { toast } from "sonner";

import { PayrollStatusBadge } from "@/components/payroll/payroll-status-badge";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import {
  approvePayrollStepAction,
  markPayrollPaidAction,
  processPayrollRunAction,
  rejectPayrollRunAction,
} from "@/lib/payroll/actions";
import { PAYROLL_APPROVAL_LEVEL_LABELS } from "@/lib/payroll/constants";
import {
  formatCurrency,
  formatPayrollMonthLabel,
} from "@/lib/payroll/services/payroll-utils";
import type { PayrollDetail } from "@/types/payroll";

type PayrollDetailViewProps = {
  payroll: PayrollDetail;
  canRun: boolean;
  canApprove: boolean;
  canPay: boolean;
};

export function PayrollDetailView({
  payroll,
  canRun,
  canApprove,
  canPay,
}: PayrollDetailViewProps) {
  const [comments, setComments] = useState("");
  const [isPending, startTransition] = useTransition();

  function runAction(action: () => Promise<{ success: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.message ?? "Action failed");
        return;
      }
      toast.success("Payroll updated");
      window.location.reload();
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Info label="Pay period" value={formatPayrollMonthLabel(payroll.payrollMonth)} />
        <Info label="Status" value={<PayrollStatusBadge status={payroll.payrollStatus} />} />
        <Info label="Gross" value={formatCurrency(payroll.totalGross)} />
        <Info label="Net" value={formatCurrency(payroll.totalNet)} />
      </div>

      {payroll.approvals.length > 0 ? (
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-medium">Approval workflow</h2>
          <div className="space-y-3">
            {payroll.approvals.map((approval) => (
              <div
                key={approval.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {PAYROLL_APPROVAL_LEVEL_LABELS[approval.approvalLevel]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {approval.approverName || "Unassigned"} · {approval.approvalStatus}
                  </p>
                </div>
                {approval.comments ? (
                  <p className="text-sm text-muted-foreground">{approval.comments}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {canRun && payroll.payrollStatus === "draft" ? (
          <Button
            disabled={isPending || payroll.isLocked}
            onClick={() => runAction(() => processPayrollRunAction(payroll.id))}
          >
            Submit for approval
          </Button>
        ) : null}
        {canApprove && payroll.payrollStatus === "processed" ? (
          <>
            <Button
              disabled={isPending || payroll.isLocked}
              onClick={() =>
                runAction(() =>
                  approvePayrollStepAction({
                    payrollId: payroll.id,
                    comments: comments || undefined,
                  }),
                )
              }
            >
              Approve step
            </Button>
            <div className="flex min-w-[16rem] flex-1 items-end gap-2">
              <div className="w-full space-y-2">
                <Label>Rejection comments</Label>
                <Input
                  value={comments}
                  onChange={(event) => setComments(event.target.value)}
                  placeholder="Comments for rejection"
                />
              </div>
              <Button
                variant="destructive"
                disabled={isPending || !comments.trim()}
                onClick={() =>
                  runAction(() =>
                    rejectPayrollRunAction({
                      payrollId: payroll.id,
                      comments,
                    }),
                  )
                }
              >
                Reject
              </Button>
            </div>
          </>
        ) : null}
        {canPay && payroll.payrollStatus === "approved" ? (
          <Button
            disabled={isPending}
            onClick={() => runAction(() => markPayrollPaidAction(payroll.id))}
          >
            Mark as paid
          </Button>
        ) : null}
      </div>

      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-sm font-medium">Employee payroll items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Gross</th>
                <th className="px-4 py-3">Deductions</th>
                <th className="px-4 py-3">Net</th>
              </tr>
            </thead>
            <tbody>
              {payroll.items.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.employeeName}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.employeeCode}
                    </div>
                  </td>
                  <td className="px-4 py-3">{item.departmentName ?? "—"}</td>
                  <td className="px-4 py-3">{formatCurrency(item.grossSalary)}</td>
                  <td className="px-4 py-3">
                    {formatCurrency(item.totalDeductions)}
                  </td>
                  <td className="px-4 py-3">{formatCurrency(item.netSalary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </div>
  );
}
