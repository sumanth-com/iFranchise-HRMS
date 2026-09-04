import Image from "next/image";
import { format } from "date-fns";

import { amountToIndianWords } from "@/lib/payroll/services/amount-in-words";
import { getPayslipInfoRows } from "@/lib/payroll/services/payslip-document-helpers";
import {
  getPayslipDeductionLines,
  getPayslipEarningsLines,
  resolveAttendanceEarnings,
  resolveFinalPayableAmount,
  resolveMonthlySalary,
  resolvePayrollReimbursement,
} from "@/lib/payroll/services/payroll-utils";
import type { PayslipDetail } from "@/types/payroll";

function formatMonthYearHeader(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "MMM - yyyy").toUpperCase();
  } catch {
    return "—";
  }
}

function formatAmount2(value: number | undefined | null): string {
  const num = Number(value) || 0;
  return num.toFixed(2);
}

function formatAmountIndian(value: number | undefined | null): string {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function PayslipTemplate({
  payslip,
  className = "",
}: {
  payslip: PayslipDetail;
  className?: string;
}) {
  const organizationName = payslip.organization.name.toUpperCase();
  const monthHeader = formatMonthYearHeader(payslip.payrollMonth);
  const infoRows = getPayslipInfoRows(payslip);

  const earnings = getPayslipEarningsLines({
    earnings: payslip.breakdown?.earnings,
    basicSalary: payslip.basicSalary,
    totalAllowances: payslip.totalAllowances,
    grossSalary: payslip.grossSalary,
  });
  const deductions = getPayslipDeductionLines(payslip.breakdown?.deductions);
  const monthlySalary = resolveMonthlySalary(
    payslip.breakdown ?? null,
    payslip.basicSalary,
    payslip.grossSalary,
  );
  const attendanceEarnings = resolveAttendanceEarnings(
    payslip.breakdown ?? null,
    payslip.grossSalary,
  );
  const reimbursement = resolvePayrollReimbursement(
    payslip.breakdown ?? null,
    payslip.totalAllowances,
  );

  const totalEarnings =
    earnings.reduce((sum, item) => sum + Number(item.amount || 0), 0) ||
    attendanceEarnings;
  const totalDeductions =
    deductions.reduce((sum, item) => sum + Number(item.amount || 0), 0) ||
    payslip.totalDeductions;
  const netPay = payslip.netSalary || totalEarnings - totalDeductions;
  const amountCredited = resolveFinalPayableAmount(
    netPay,
    payslip.breakdown ?? null,
    payslip.totalAllowances,
  );

  const maxRows = Math.max(earnings.length, deductions.length, 1);

  return (
    <article
      id="payslip-print"
      className={`mx-auto w-full max-w-[210mm] bg-white p-6 text-black font-sans shadow-md print:max-w-none print:p-0 print:shadow-none ${className}`}
      style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif" }}
    >
      <div className="relative mb-6 flex items-center justify-center">
        {payslip.organization.logoUrl ? (
          <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <div className="relative h-16 w-32 shrink-0">
              <Image
                src={payslip.organization.logoUrl}
                alt={`${payslip.organization.name} logo`}
                fill
                className="object-contain object-left"
                unoptimized
              />
            </div>
          </div>
        ) : null}

        <div className="text-center">
          <h1 className="text-lg font-bold tracking-tight text-neutral-900 sm:text-xl">
            {organizationName}
          </h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-neutral-800 sm:text-sm">
            PAY SLIP FOR THE MONTH OF {monthHeader}
          </p>
        </div>
      </div>

      <div className="w-full border-2 border-black bg-white text-xs">
        <table className="w-full table-fixed border-collapse">
          <tbody>
            {infoRows.map((row) => (
              <tr key={`${row[0].label}-${row[1].label}`} className="border-b border-black">
                <td className="w-[22%] border-r border-black p-2.5 font-bold uppercase">
                  {row[0].label}
                </td>
                <td className="w-[28%] border-r border-black p-2.5 font-semibold">
                  {row[0].value}
                </td>
                <td className="w-[22%] border-r border-black p-2.5 font-bold uppercase">
                  {row[1].label}
                </td>
                <td className="w-[28%] p-2.5 font-semibold">{row[1].value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="border-b border-black font-bold uppercase">
              <th className="w-[30%] border-r border-black p-2.5 text-left">Earnings</th>
              <th className="w-[20%] border-r border-black p-2.5 text-right">Amount</th>
              <th className="w-[30%] border-r border-black p-2.5 text-left">Deductions</th>
              <th className="w-[20%] p-2.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }).map((_, index) => {
              const earning = earnings[index];
              const deduction = deductions[index];
              const isLast = index === maxRows - 1;

              return (
                <tr
                  key={index}
                  className={isLast ? "border-b border-black" : "border-b border-black/70"}
                >
                  <td className="border-r border-black px-2.5 py-2 font-medium">
                    {earning?.label ?? ""}
                  </td>
                  <td className="border-r border-black px-2.5 py-2 text-right font-medium tabular-nums">
                    {earning ? formatAmount2(earning.amount) : ""}
                  </td>
                  <td className="border-r border-black px-2.5 py-2 font-medium">
                    {deduction?.label ?? ""}
                  </td>
                  <td className="px-2.5 py-2 text-right font-medium tabular-nums">
                    {deduction ? formatAmount2(deduction.amount) : ""}
                  </td>
                </tr>
              );
            })}

            <tr className="border-b border-black font-bold">
              <td className="border-r border-black p-2.5 font-bold">Total Attendance Earnings</td>
              <td className="border-r border-black p-2.5 text-right tabular-nums">
                {formatAmount2(totalEarnings)}
              </td>
              <td className="border-r border-black p-2.5 font-bold">Total Deductions</td>
              <td className="p-2.5 text-right tabular-nums">
                {formatAmount2(totalDeductions)}
              </td>
            </tr>
          </tbody>
        </table>

        <table className="w-full table-fixed border-collapse">
          <tbody>
            <tr className="border-b border-black">
              <td className="p-2.5">
                <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 text-sm font-semibold tabular-nums">
                  <span className="uppercase tracking-wide">Monthly Salary</span>
                  <span>₹{formatAmountIndian(monthlySalary)}</span>
                  <span className="font-semibold text-neutral-700">→</span>
                  <span className="uppercase tracking-wide">Attendance Earnings</span>
                  <span>₹{formatAmountIndian(attendanceEarnings)}</span>
                </div>
              </td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2.5">
                <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 text-sm font-bold tabular-nums">
                  <span className="uppercase tracking-wide">Attendance Earnings</span>
                  <span>₹{formatAmountIndian(attendanceEarnings)}</span>
                  <span className="font-semibold text-neutral-700">−</span>
                  <span className="uppercase tracking-wide">Deductions</span>
                  <span>₹{formatAmountIndian(totalDeductions)}</span>
                  <span className="font-semibold text-neutral-700">=</span>
                  <span className="uppercase tracking-wide">Net Salary</span>
                  <span>₹{formatAmountIndian(netPay)}</span>
                </div>
              </td>
            </tr>
            {reimbursement > 0 ? (
              <tr className="border-b border-black">
                <td className="p-2.5">
                  <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 text-sm font-semibold tabular-nums">
                    <span className="uppercase tracking-wide">Reimbursement</span>
                    <span>₹{formatAmountIndian(reimbursement)}</span>
                    <span className="font-semibold text-neutral-700">→</span>
                    <span className="uppercase tracking-wide font-bold">Amount Credited</span>
                    <span className="font-bold">₹{formatAmountIndian(amountCredited)}</span>
                  </div>
                </td>
              </tr>
            ) : null}
            <tr>
              <td className="p-2.5 font-bold leading-relaxed">
                {reimbursement > 0
                  ? `Amount Credited: ${amountToIndianWords(amountCredited)}`
                  : `Net Pay: ${amountToIndianWords(netPay)}`}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-center text-[11px] font-medium text-neutral-800">
        Note :- This is an electronically generated statement hence does not require any
        signature.
      </div>
    </article>
  );
}
