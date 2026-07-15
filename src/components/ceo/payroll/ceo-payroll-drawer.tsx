"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { formatCeoCurrency } from "@/components/ceo/ceo-module-primitives";
import { EmployeeAvatar } from "@/components/employees/employee-avatar";
import { PayrollStatusBadge } from "@/components/payroll/payroll-status-badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { fetchCeoPayrollEmployeeDetailAction } from "@/lib/ceo/actions/ceo-payroll-actions";
import type { CeoPayrollEmployeeDetail } from "@/types/ceo-payroll";

type CeoPayrollDrawerProps = {
  employeeId: string | null;
  payrollItemId?: string | null;
  month?: number;
  year?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function CeoPayrollDrawer({
  employeeId,
  payrollItemId,
  month,
  year,
  open,
  onOpenChange,
}: CeoPayrollDrawerProps) {
  const [detail, setDetail] = useState<CeoPayrollEmployeeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !employeeId) {
      setDetail(null);
      setError(null);
      return;
    }

    startTransition(async () => {
      const result = await fetchCeoPayrollEmployeeDetailAction({
        employeeId,
        payrollItemId: payrollItemId ?? undefined,
        month,
        year,
      });
      if (!result.success) {
        setDetail(null);
        setError(result.message);
        return;
      }
      setError(null);
      setDetail(result.data);
    });
  }, [open, employeeId, payrollItemId, month, year]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Payroll Details</SheetTitle>
        </SheetHeader>

        {isPending ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading payroll…
          </div>
        ) : error ? (
          <p className="py-10 text-center text-sm text-destructive">{error}</p>
        ) : detail ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <EmployeeAvatar
                firstName={detail.firstName}
                lastName={detail.lastName}
                profileImagePath={detail.profileImagePath}
                className="size-14"
              />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{detail.fullName}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {detail.employeeCode}
                  {detail.designationTitle ? ` · ${detail.designationTitle}` : ""}
                </p>
                {detail.payrollStatus ? (
                  <div className="mt-1">
                    <PayrollStatusBadge status={detail.payrollStatus} />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Department" value={detail.departmentName} />
              <Field label="Designation" value={detail.designationTitle} />
              <Field label="Email" value={detail.email} />
              <Field
                label="Payment Date"
                value={
                  detail.paymentDate
                    ? format(new Date(detail.paymentDate), "d MMM yyyy")
                    : null
                }
              />
            </div>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Salary Breakdown</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Field label="Basic Salary" value={formatCeoCurrency(detail.basicSalary)} />
                <Field label="Allowances" value={formatCeoCurrency(detail.allowances)} />
                <Field label="Bonuses" value={formatCeoCurrency(detail.bonuses)} />
                <Field label="Incentives" value={formatCeoCurrency(detail.incentives)} />
                <Field label="Deductions" value={formatCeoCurrency(detail.deductions)} />
                <Field label="Tax" value={formatCeoCurrency(detail.tax)} />
                <Field label="PF" value={formatCeoCurrency(detail.pf)} />
                <Field label="ESI" value={formatCeoCurrency(detail.esi)} />
                <Field label="Net Salary" value={formatCeoCurrency(detail.netSalary)} />
              </div>
              {detail.salaryBreakdown.length > 0 ? (
                <ul className="mt-3 space-y-1.5 border-t pt-3 text-sm">
                  {detail.salaryBreakdown.map((line) => (
                    <li
                      key={`${line.type}-${line.label}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-muted-foreground">
                        {line.label}
                        <span className="ml-1 text-[10px] uppercase">
                          ({line.type})
                        </span>
                      </span>
                      <span className="tabular-nums">
                        {formatCeoCurrency(line.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Payment History</h3>
              {detail.paymentHistory.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No payment history.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {detail.paymentHistory.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">{item.monthLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.paymentDate
                            ? format(new Date(item.paymentDate), "d MMM yyyy")
                            : "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="tabular-nums font-medium">
                          {formatCeoCurrency(item.netSalary)}
                        </p>
                        <PayrollStatusBadge status={item.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Payroll Timeline</h3>
              {detail.timeline.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No timeline events.</p>
              ) : (
                <ol className="mt-2 space-y-2">
                  {detail.timeline.map((event) => (
                    <li key={event.id} className="text-sm">
                      <p className="font-medium">{event.title}</p>
                      {event.description ? (
                        <p className="text-muted-foreground">{event.description}</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.createdAt), "d MMM yyyy")}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Last Salary Revision</h3>
              {detail.lastSalaryRevision ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Field
                    label="Effective From"
                    value={format(
                      new Date(detail.lastSalaryRevision.effectiveFrom),
                      "d MMM yyyy",
                    )}
                  />
                  <Field label="Status" value={detail.lastSalaryRevision.status} />
                  <Field
                    label="Old Gross"
                    value={formatCeoCurrency(detail.lastSalaryRevision.oldGross)}
                  />
                  <Field
                    label="New Gross"
                    value={formatCeoCurrency(detail.lastSalaryRevision.newGross)}
                  />
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  No salary revision recorded.
                </p>
              )}
            </section>

            <p className="text-xs text-muted-foreground">
              CEO access is view-only. Payroll cannot be processed or edited from this
              portal.
            </p>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
