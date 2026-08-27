import Image from "next/image";
import { format, parseISO, lastDayOfMonth } from "date-fns";

import { amountToIndianWords } from "@/lib/payroll/services/amount-in-words";
import { toEmployeeFacingEarnings } from "@/lib/payroll/services/payroll-utils";
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

  // Compute work days & paid days
  let totalDaysInMonth = 30;
  try {
    const monthDate = new Date(payslip.payrollMonth);
    totalDaysInMonth = lastDayOfMonth(monthDate).getDate();
  } catch {
    totalDaysInMonth = 30;
  }

  const attendance = payslip.breakdown?.attendance;
  const workDays = attendance?.workingDays && attendance.workingDays > 0 ? attendance.workingDays : totalDaysInMonth;
  const lopDays = attendance?.lopDays ?? attendance?.leaveLopDays ?? 0;
  const paidDays = attendance?.presentDays && attendance.presentDays > 0 ? attendance.presentDays : Math.max(0, workDays - lopDays);

  // Standard Indian earnings
  const rawEarnings = payslip.breakdown?.earnings?.length > 0
    ? toEmployeeFacingEarnings(payslip.breakdown.earnings)
    : [
        {
          code: "basic",
          label: "Basic",
          amount: payslip.basicSalary > 0 ? payslip.basicSalary : Math.round(payslip.grossSalary * 0.5),
          type: "earning" as const,
        },
        {
          code: "hra",
          label: "HRA",
          amount: payslip.totalAllowances > 0 ? Math.round(payslip.totalAllowances * 0.4) : Math.round(payslip.grossSalary * 0.2),
          type: "earning" as const,
        },
        {
          code: "special_allowance",
          label: "Special Allowance",
          amount: Math.max(0, payslip.grossSalary - (payslip.basicSalary > 0 ? payslip.basicSalary : Math.round(payslip.grossSalary * 0.5)) - (payslip.totalAllowances > 0 ? Math.round(payslip.totalAllowances * 0.4) : Math.round(payslip.grossSalary * 0.2))),
          type: "earning" as const,
        },
      ];

  const earnings = rawEarnings.filter((item) => item.amount > 0);

  // Standard deductions
  const deductions = (payslip.breakdown?.deductions ?? []).filter(
    (line) => Number(line.amount) > 0,
  );

  const totalEarnings = earnings.reduce((sum, item) => sum + Number(item.amount || 0), 0) || payslip.grossSalary;
  const totalDeductions = deductions.reduce((sum, item) => sum + Number(item.amount || 0), 0) || payslip.totalDeductions;
  const netPay = payslip.netSalary || (totalEarnings - totalDeductions);

  // Leave stats
  const sickLeaveUsed = 0;
  const casualLeaveUsed = 0;
  const sickLeaveBal = 1;
  const casualLeaveBal = 3;

  // Maximum rows for components table to balance
  const maxRows = Math.max(earnings.length, deductions.length, 5);

  return (
    <article
      id="payslip-print"
      className={`mx-auto w-full max-w-[210mm] bg-white p-6 text-black font-sans shadow-md print:max-w-none print:p-0 print:shadow-none ${className}`}
      style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif" }}
    >
      {/* Header section with Logo & Centered Company Name / Title */}
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

      {/* Main Single Boxed Table Container */}
      <div className="w-full border-2 border-black bg-white text-xs">
        {/* Section 1: Employee & Bank Details Grid */}
        <table className="w-full table-fixed border-collapse">
          <tbody>
            <tr className="border-b border-black">
              <td className="w-[18%] border-r border-black p-2 font-bold uppercase">EMP CODE</td>
              <td className="w-[32%] border-r border-black p-2 font-semibold">{payslip.employee.employeeCode}</td>
              <td className="w-[20%] border-r border-black p-2 font-bold uppercase">PAYMENT MODE</td>
              <td className="w-[30%] p-2 font-semibold">{(payslip.paymentMode || "BANK").toUpperCase()}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="border-r border-black p-2 font-bold uppercase">EMP NAME</td>
              <td className="border-r border-black p-2 font-semibold">{employeeName}</td>
              <td className="border-r border-black p-2 font-bold uppercase">BANK NAME</td>
              <td className="p-2 font-semibold">{fmt(payslip.bankAccount?.bankName)}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="border-r border-black p-2 font-bold uppercase">JOINING DT</td>
              <td className="border-r border-black p-2 font-semibold">{fmtDateUpper(payslip.employee.dateOfJoining)}</td>
              <td className="border-r border-black p-2 font-bold uppercase">BANK A/C NO</td>
              <td className="p-2 font-semibold">{fmt(payslip.bankAccount?.accountNumberMasked)}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="border-r border-black p-2 font-bold uppercase">DESIGNATION</td>
              <td className="border-r border-black p-2 font-semibold">{fmt(payslip.employee.designationTitle).toUpperCase()}</td>
              <td className="border-r border-black p-2 font-bold uppercase">ESIC NO</td>
              <td className="p-2 font-semibold">{fmt(payslip.employee.pan)}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="border-r border-black p-2 font-bold uppercase">LOCATION</td>
              <td className="border-r border-black p-2 font-semibold">{fmt(payslip.employee.branchName || payslip.employee.departmentName || "CHENNAI").toUpperCase()}</td>
              <td className="border-r border-black p-2 font-bold uppercase">WORK DAYS</td>
              <td className="p-2 font-semibold tabular-nums">{Number(workDays).toFixed(2)}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="border-r border-black p-2 font-bold uppercase">UAN NO</td>
              <td className="border-r border-black p-2 font-semibold">{fmt(payslip.employee.uan)}</td>
              <td className="border-r border-black p-2 font-bold uppercase">PAID DAYS</td>
              <td className="p-2 font-semibold tabular-nums">{Number(paidDays).toFixed(2)}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="border-r border-black p-2 font-bold uppercase">PAN NO</td>
              <td className="border-r border-black p-2 font-semibold">{fmt(payslip.employee.pan)}</td>
              <td className="border-r border-black p-2 font-bold uppercase">LOP DAYS</td>
              <td className="p-2 font-semibold tabular-nums">{Number(lopDays).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Section 2: Leave Details Header & Grid */}
        <div className="border-b border-black bg-white py-1.5 text-center font-bold uppercase tracking-wide">
          NO. OF AVAILABLE LEAVE DAYS:
        </div>
        <table className="w-full table-fixed border-collapse">
          <tbody>
            <tr className="border-b border-black">
              <td className="w-[18%] border-r border-black p-2 font-bold uppercase">SL</td>
              <td className="w-[32%] border-r border-black p-2 font-semibold tabular-nums">{sickLeaveUsed.toFixed(2)}</td>
              <td className="w-[20%] border-r border-black p-2 font-bold uppercase">CL</td>
              <td className="w-[30%] p-2 font-semibold tabular-nums">{casualLeaveUsed.toFixed(2)}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="border-r border-black p-2 font-bold uppercase">BAL. SL</td>
              <td className="border-r border-black p-2 font-semibold tabular-nums">{sickLeaveBal.toFixed(2)}</td>
              <td className="border-r border-black p-2 font-bold uppercase">BAL. CL</td>
              <td className="p-2 font-semibold tabular-nums">{casualLeaveBal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {/* Section 3: Salary Components Grid (Earnings & Deductions) */}
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="border-b border-black font-bold uppercase">
              <th className="w-[26%] border-r border-black p-2 text-left">COMPONENTS</th>
              <th className="w-[14%] border-r border-black p-2 text-right">FIXED SALARY</th>
              <th className="w-[14%] border-r border-black p-2 text-right">EARNED SALARY</th>
              <th className="w-[26%] border-r border-black p-2 text-left">COMPONENTS</th>
              <th className="w-[20%] p-2 text-right">SALARY</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }).map((_, index) => {
              const earning = earnings[index];
              const deduction = deductions[index];

              return (
                <tr key={index} className="border-b border-black/80 last:border-b-0">
                  <td className="border-r border-black px-2 py-1.5 font-medium">{earning?.label ?? ""}</td>
                  <td className="border-r border-black px-2 py-1.5 text-right font-medium tabular-nums">
                    {earning ? formatAmount2(earning.amount) : ""}
                  </td>
                  <td className="border-r border-black px-2 py-1.5 text-right font-medium tabular-nums">
                    {earning ? formatAmount2(earning.amount) : ""}
                  </td>
                  <td className="border-r border-black px-2 py-1.5 font-medium">{deduction?.label ?? ""}</td>
                  <td className="px-2 py-1.5 text-right font-medium tabular-nums">
                    {deduction ? formatAmount2(deduction.amount) : ""}
                  </td>
                </tr>
              );
            })}

            {/* Total Row */}
            <tr className="border-t-2 border-b border-black font-bold">
              <td className="border-r border-black p-2 text-right font-bold">Amount Total :</td>
              <td className="border-r border-black p-2 text-right tabular-nums">{formatAmount2(totalEarnings)}</td>
              <td className="border-r border-black p-2 text-right tabular-nums">{formatAmount2(totalEarnings)}</td>
              <td className="border-r border-black p-2 text-right font-bold">Amount Total :</td>
              <td className="p-2 text-right tabular-nums">{formatAmount2(totalDeductions)}</td>
            </tr>
          </tbody>
        </table>

        {/* Section 4: Net Pay Row */}
        <table className="w-full table-fixed border-collapse">
          <tbody>
            <tr className="border-b border-black">
              <td className="w-[54%] border-r border-black p-2"></td>
              <td className="w-[26%] border-r border-black p-2 text-right font-bold uppercase">Net Pay :</td>
              <td className="w-[20%] p-2 text-right font-bold tabular-nums">
                {formatAmountIndian(netPay)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="p-2 font-bold leading-relaxed">
                Net Pay: {amountToIndianWords(netPay)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Note footer */}
      <div className="mt-6 text-center text-[11px] font-medium text-neutral-800">
        Note :- This is an electronically generated statement hence does not require any signature.
      </div>
    </article>
  );
}
