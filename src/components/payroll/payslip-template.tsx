import Image from "next/image";
import { format, parseISO, lastDayOfMonth } from "date-fns";

import { amountToIndianWords } from "@/lib/payroll/services/amount-in-words";
import {
  getPayslipDeductionLines,
  getPayslipEarningsLines,
} from "@/lib/payroll/services/payroll-utils";
import type { PayslipDetail } from "@/types/payroll";

function fmt(value: string | null | undefined, fallback = "—"): string {
  return value?.trim() ? value : fallback;
}

function fmtDateUpper(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    const d = parseISO(value.length === 10 ? value : value.slice(0, 10));
    return format(d, "dd-MMM-yyyy").toUpperCase();
  } catch {
    return "—";
  }
}

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
  const employeeName = `${payslip.employee.firstName} ${payslip.employee.lastName}`.trim().toUpperCase();
  const organizationName = payslip.organization.name.toUpperCase();
  const monthHeader = formatMonthYearHeader(payslip.payrollMonth);

  let totalDaysInMonth = 30;
  try {
    const monthDate = new Date(payslip.payrollMonth);
    totalDaysInMonth = lastDayOfMonth(monthDate).getDate();
  } catch {
    totalDaysInMonth = 30;
  }

  const attendance = payslip.breakdown?.attendance;
  const workDays =
    attendance?.workingDays && attendance.workingDays > 0
      ? attendance.workingDays
      : totalDaysInMonth;
  const lopDays = attendance?.lopDays ?? attendance?.leaveLopDays ?? 0;
  const paidDays =
    attendance?.presentDays && attendance.presentDays > 0
      ? attendance.presentDays
      : Math.max(0, workDays - lopDays);

  const earnings = getPayslipEarningsLines({
    earnings: payslip.breakdown?.earnings,
    basicSalary: payslip.basicSalary,
    totalAllowances: payslip.totalAllowances,
    grossSalary: payslip.grossSalary,
  });
  const deductions = getPayslipDeductionLines(payslip.breakdown?.deductions);

  const totalEarnings =
    earnings.reduce((sum, item) => sum + Number(item.amount || 0), 0) ||
    payslip.grossSalary;
  const totalDeductions =
    deductions.reduce((sum, item) => sum + Number(item.amount || 0), 0) ||
    payslip.totalDeductions;
  const netPay = payslip.netSalary || totalEarnings - totalDeductions;

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
            <tr className="border-b border-black">
              <td className="w-[22%] border-r border-black p-2.5 font-bold uppercase">
                Employee ID
              </td>
              <td className="w-[28%] border-r border-black p-2.5 font-semibold">
                {payslip.employee.employeeCode}
              </td>
              <td className="w-[22%] border-r border-black p-2.5 font-bold uppercase">
                Payment Mode
              </td>
              <td className="w-[28%] p-2.5 font-semibold">
                {(payslip.paymentMode || "BANK").toUpperCase()}
              </td>
            </tr>
            <tr className="border-b border-black">
              <td className="border-r border-black p-2.5 font-bold uppercase">
                Employee Name
              </td>
              <td className="border-r border-black p-2.5 font-semibold">{employeeName}</td>
              <td className="border-r border-black p-2.5 font-bold uppercase">Bank Name</td>
              <td className="p-2.5 font-semibold">{fmt(payslip.bankAccount?.bankName)}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="border-r border-black p-2.5 font-bold uppercase">Joining Dt</td>
              <td className="border-r border-black p-2.5 font-semibold">
                {fmtDateUpper(payslip.employee.dateOfJoining)}
              </td>
              <td className="border-r border-black p-2.5 font-bold uppercase">Bank A/C No</td>
              <td className="p-2.5 font-semibold">
                {fmt(payslip.bankAccount?.accountNumberMasked)}
              </td>
            </tr>
            <tr className="border-b border-black">
              <td className="border-r border-black p-2.5 font-bold uppercase">Designation</td>
              <td className="border-r border-black p-2.5 font-semibold">
                {fmt(payslip.employee.designationTitle).toUpperCase()}
              </td>
              <td className="border-r border-black p-2.5 font-bold uppercase">Work Days</td>
              <td className="p-2.5 font-semibold tabular-nums">{Number(workDays).toFixed(2)}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="border-r border-black p-2.5 font-bold uppercase">Location</td>
              <td className="border-r border-black p-2.5 font-semibold">
                {fmt(
                  payslip.employee.branchName ||
                    payslip.employee.departmentName ||
                    "CHENNAI",
                ).toUpperCase()}
              </td>
              <td className="border-r border-black p-2.5 font-bold uppercase">Paid Days</td>
              <td className="p-2.5 font-semibold tabular-nums">{Number(paidDays).toFixed(2)}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="border-r border-black p-2.5 font-bold uppercase">PAN No</td>
              <td className="border-r border-black p-2.5 font-semibold">
                {fmt(payslip.employee.pan)}
              </td>
              <td className="border-r border-black p-2.5 font-bold uppercase">LOP Days</td>
              <td className="p-2.5 font-semibold tabular-nums">{Number(lopDays).toFixed(2)}</td>
            </tr>
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
              <td className="border-r border-black p-2.5 font-bold">Total Earnings</td>
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
              <td className="w-[50%] border-r border-black p-2.5" />
              <td className="w-[30%] border-r border-black p-2.5 text-right text-sm font-bold uppercase tracking-wide">
                Net Pay
              </td>
              <td className="w-[20%] p-2.5 text-right text-sm font-bold tabular-nums">
                {formatAmountIndian(netPay)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="p-2.5 font-bold leading-relaxed">
                Net Pay: {amountToIndianWords(netPay)}
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
