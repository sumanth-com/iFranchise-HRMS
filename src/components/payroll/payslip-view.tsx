"use client";

import { useTransition } from "react";
import { format } from "date-fns";
import { Download, Mail, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { emailPayslipAction } from "@/lib/payroll/actions";
import {
  formatCurrency,
  formatPayrollMonthLabel,
} from "@/lib/payroll/services/payroll-utils";
import type { PayslipDetail } from "@/types/payroll";

type PayslipViewProps = {
  payslip: PayslipDetail;
  canDownload: boolean;
  canEmail: boolean;
};

export function PayslipView({ payslip, canDownload, canEmail }: PayslipViewProps) {
  const [isPending, startTransition] = useTransition();

  function handlePrint() {
    window.print();
  }

  function handleEmail() {
    startTransition(async () => {
      const result = await emailPayslipAction(payslip.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Payslip notification sent to employee");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 print:hidden">
        {canDownload ? (
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        ) : null}
        {canEmail ? (
          <Button onClick={handleEmail} disabled={isPending}>
            <Mail className="mr-2 h-4 w-4" />
            Email payslip
          </Button>
        ) : null}
      </div>

      <article
        id="payslip-print"
        className="mx-auto max-w-4xl rounded-xl border bg-card p-8 shadow-sm print:border-0 print:shadow-none"
      >
        <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
          <div>
            <h1 className="text-2xl font-semibold">{payslip.organization.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Salary payslip</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium">{payslip.payslipNumber}</p>
            <p className="text-muted-foreground">
              {formatPayrollMonthLabel(payslip.payrollMonth)}
            </p>
            <p className="text-muted-foreground">
              Issued {format(new Date(payslip.issuedAt), "MMM d, yyyy")}
            </p>
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Employee
            </h2>
            <p className="mt-2 font-medium">
              {payslip.employee.firstName} {payslip.employee.lastName}
            </p>
            <p className="text-sm text-muted-foreground">
              {payslip.employee.employeeCode} · {payslip.employee.email}
            </p>
            <p className="text-sm text-muted-foreground">
              {payslip.employee.designationTitle ?? "—"} ·{" "}
              {payslip.employee.departmentName ?? "—"}
            </p>
          </div>
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Bank details
            </h2>
            {payslip.bankAccount ? (
              <p className="mt-2 text-sm">
                {payslip.bankAccount.bankName} ·{" "}
                {payslip.bankAccount.accountNumberMasked}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Not available</p>
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-medium">Earnings</h3>
            <table className="w-full text-sm">
              <tbody>
                {payslip.breakdown.earnings.map((line) => (
                  <tr key={line.code} className="border-b">
                    <td className="py-2">{line.label}</td>
                    <td className="py-2 text-right">
                      {formatCurrency(line.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-medium">Deductions</h3>
            <table className="w-full text-sm">
              <tbody>
                {payslip.breakdown.deductions.map((line) => (
                  <tr key={line.code} className="border-b">
                    <td className="py-2">{line.label}</td>
                    <td className="py-2 text-right">
                      {formatCurrency(line.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 grid gap-4 border-t pt-6 md:grid-cols-3">
          <Summary label="Gross salary" value={formatCurrency(payslip.grossSalary)} />
          <Summary
            label="Total deductions"
            value={formatCurrency(payslip.totalDeductions)}
          />
          <Summary
            label="Net salary"
            value={formatCurrency(payslip.netSalary)}
            highlight
          />
        </section>
      </article>
    </div>
  );
}

function Summary({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? "bg-primary/5" : ""}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-2 text-xl font-semibold ${highlight ? "text-primary" : ""}`}>
        {value}
      </p>
    </div>
  );
}
