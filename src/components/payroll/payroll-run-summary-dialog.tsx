"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Banknote,
  CircleDollarSign,
  Loader2,
  MinusCircle,
  Users,
} from "lucide-react";

import { PayrollStatusBadge } from "@/components/payroll/payroll-status-badge";
import {
  TABLE_HEADER_CELL_CLASS,
} from "@/components/common/table-header-classes";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchPayrollDetailAction } from "@/lib/payroll/actions";
import { PAYROLL_APPROVAL_LEVEL_LABELS } from "@/lib/payroll/constants";
import {
  formatCurrency,
  formatPayrollMonthLabel,
} from "@/lib/payroll/services/payroll-utils";
import type { PayrollDetail, PayrollListItem } from "@/types/payroll";

type PayrollRunSummaryDialogProps = {
  payrollId: string | null;
  fallback?: PayrollListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PayrollRunSummaryDialog({
  payrollId,
  fallback,
  open,
  onOpenChange,
}: PayrollRunSummaryDialogProps) {
  const [detail, setDetail] = useState<PayrollDetail | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !payrollId) {
      setDetail(null);
      return;
    }

    startTransition(async () => {
      try {
        const result = await fetchPayrollDetailAction(payrollId);
        setDetail(result);
      } catch {
        setDetail(null);
      }
    });
  }, [open, payrollId]);

  if (!open) {
    return null;
  }

  const periodLabel = detail
    ? formatPayrollMonthLabel(detail.payrollMonth)
    : fallback
      ? formatPayrollMonthLabel(fallback.payrollMonth)
      : "Payroll run";

  const gross = detail?.totalGross ?? fallback?.totalGross ?? 0;
  const deductions = detail?.totalDeductions ?? fallback?.totalDeductions ?? 0;
  const net = detail?.totalNet ?? fallback?.totalNet ?? 0;
  const employeeCount = detail?.items?.length ?? fallback?.employeeCount ?? 0;
  const status = detail?.payrollStatus ?? fallback?.payrollStatus;
  const approvals = detail?.approvals ?? [];
  const items = detail?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(88vh,680px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-lg font-semibold">{periodLabel}</DialogTitle>
            {status ? <PayrollStatusBadge status={status} /> : null}
          </div>
          <DialogDescription>
            Payroll run summary with employee breakdown and approvals.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-5 py-4">
          {isPending && !detail ? (
            <div className="flex flex-1 items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading payroll details…
            </div>
          ) : (
            <>
              <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
                <StatTile
                  label="Employees"
                  value={String(employeeCount)}
                  icon={Users}
                  accent="text-blue-600"
                  bg="bg-blue-500/10"
                />
                <StatTile
                  label="Gross"
                  value={formatCurrency(gross)}
                  icon={Banknote}
                  accent="text-emerald-600"
                  bg="bg-emerald-500/10"
                />
                <StatTile
                  label="Deductions"
                  value={formatCurrency(deductions)}
                  icon={MinusCircle}
                  accent="text-destructive"
                  bg="bg-destructive/10"
                />
                <StatTile
                  label="Net pay"
                  value={formatCurrency(net)}
                  icon={CircleDollarSign}
                  accent="text-primary"
                  bg="bg-primary/10"
                />
              </div>

              {detail?.notes ? (
                <p className="shrink-0 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Notes: </span>
                  {detail.notes}
                </p>
              ) : null}

              {approvals.length > 0 ? (
                <div className="shrink-0 rounded-lg border bg-card px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Approvals
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {approvals.map((approval) => (
                      <span
                        key={approval.id}
                        className="inline-flex items-center rounded-full border bg-muted/40 px-2 py-0.5 text-[11px]"
                      >
                        {PAYROLL_APPROVAL_LEVEL_LABELS[approval.approvalLevel] ?? "Approval"} ·{" "}
                        {approval.approvalStatus}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {items.length > 0 ? (
                <div className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-card shadow-sm">
                  <div className="border-b px-3 py-2">
                    <p className="text-xs font-semibold">Employee breakdown</p>
                  </div>
                  <div className="max-h-[min(38vh,260px)] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 z-30 bg-blue-600 bg-gradient-to-r from-blue-600 to-violet-600 text-left text-white shadow-[0_1px_0_rgba(255,255,255,0.12)]">
                        <tr className="border-b border-white/10">
                          <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Employee</th>
                          <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Dept</th>
                          <th className={cn(TABLE_HEADER_CELL_CLASS, "text-right")}>Gross</th>
                          <th className={cn(TABLE_HEADER_CELL_CLASS, "text-right")}>Ded.</th>
                          <th className={cn(TABLE_HEADER_CELL_CLASS, "text-right")}>Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="px-3 py-2">
                              <p className="font-medium leading-tight">{item.employeeName}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {item.employeeCode}
                              </p>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {item.departmentName ?? "—"}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {formatCurrency(item.grossSalary)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {formatCurrency(item.totalDeductions)}
                            </td>
                            <td className="px-3 py-2 text-right font-medium tabular-nums">
                              {formatCurrency(item.netSalary)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : !isPending ? (
                <p className="text-sm text-muted-foreground">No employee items found.</p>
              ) : null}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  accent,
  bg,
}: {
  label: string;
  value: string;
  icon: typeof Users;
  accent: string;
  bg: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-2.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
        </div>
        <div className={`rounded-md p-1.5 ${bg}`}>
          <Icon className={`size-3.5 ${accent}`} />
        </div>
      </div>
    </div>
  );
}
