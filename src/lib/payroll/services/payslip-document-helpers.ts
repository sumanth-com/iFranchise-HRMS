import { format, lastDayOfMonth, parseISO } from "date-fns";

import { displaySalaryBankDetails } from "@/lib/payroll/services/payroll-utils";
import type { PayrollBreakdown, PayrollBreakdownLine, PayslipDetail } from "@/types/payroll";

export type StatutoryIds = {
  pan: string | null;
  uan: string | null;
  pfNumber: string | null;
  esiNumber: string | null;
};

export function parseStatutoryIds(
  components: Record<string, unknown> | null | undefined,
): StatutoryIds {
  if (!components) {
    return { pan: null, uan: null, pfNumber: null, esiNumber: null };
  }
  const read = (key: string) => {
    const value = components[key];
    if (typeof value !== "string" || !value.trim() || value === "PENDING") return null;
    return value.trim();
  };
  return {
    pan: read("pan_number"),
    uan: read("uan"),
    pfNumber: read("pf_number"),
    esiNumber: read("esi_number"),
  };
}

export function buildEmployerContributions(
  components: Record<string, unknown> | null | undefined,
  breakdown: PayrollBreakdown,
): PayrollBreakdownLine[] {
  const num = (key: string) => Number(components?.[key] ?? 0) || 0;
  const employeePf =
    breakdown.deductions.find((line) => line.code === "pf")?.amount ?? num("pf");
  const employeeEsi =
    breakdown.deductions.find((line) => line.code === "esi")?.amount ?? num("esi");

  const lines: PayrollBreakdownLine[] = [
    {
      code: "employer_pf",
      label: "Employer PF",
      amount: num("employer_pf") || num("employerPf") || employeePf,
      type: "deduction",
    },
    {
      code: "employer_esi",
      label: "Employer ESI",
      amount: num("employer_esi") || num("employerEsi") || employeeEsi,
      type: "deduction",
    },
    {
      code: "gratuity",
      label: "Gratuity",
      amount: num("gratuity") || num("employer_gratuity"),
      type: "deduction",
    },
    {
      code: "employer_insurance",
      label: "Insurance",
      amount: num("employer_insurance") || num("insurance"),
      type: "deduction",
    },
  ];

  return lines.filter((line) => line.amount > 0);
}

export function paidDaysFromBreakdown(breakdown: PayrollBreakdown): number {
  const attendance = breakdown.attendance;
  if (!attendance) return 0;
  if (attendance.paidDays && attendance.paidDays > 0) return attendance.paidDays;
  if (attendance.presentDays > 0) return attendance.presentDays;
  return Math.max(
    0,
    attendance.workingDays - attendance.lopDays - (attendance.leaveLopDays ?? 0),
  );
}

export function leaveDaysFromBreakdown(breakdown: PayrollBreakdown): number {
  const attendance = breakdown.attendance;
  if (!attendance) return 0;
  if (attendance.leaveDays !== undefined) return attendance.leaveDays;
  return Math.max(0, attendance.workingDays - attendance.presentDays - attendance.absentDays);
}

export function totalEmployerContribution(payslip: PayslipDetail): number {
  return payslip.employerContributions.reduce((sum, line) => sum + line.amount, 0);
}

export function totalEarnings(payslip: PayslipDetail): number {
  if (payslip.breakdown.earnings.length > 0) {
    return payslip.breakdown.earnings.reduce((sum, line) => sum + line.amount, 0);
  }
  return payslip.grossSalary;
}

function fmtPayslipDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    const d = parseISO(value.length === 10 ? value : value.slice(0, 10));
    return format(d, "dd-MMM-yyyy").toUpperCase();
  } catch {
    return "—";
  }
}

function fmtPayslipValue(value: string | null | undefined, fallback = "—"): string {
  return value?.trim() ? value.trim() : fallback;
}

export type PayslipInfoCell = { label: string; value: string };

export function getPayslipAttendanceDisplay(payslip: PayslipDetail): {
  workDays: number;
  paidDays: number;
  lopDays: number;
} {
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
  const paidDays = attendance
    ? paidDaysFromBreakdown(payslip.breakdown)
    : Math.max(0, workDays - lopDays);

  return { workDays, paidDays, lopDays };
}

export function getPayslipInfoRows(payslip: PayslipDetail): [PayslipInfoCell, PayslipInfoCell][] {
  const employeeName = `${payslip.employee.firstName} ${payslip.employee.lastName}`.trim().toUpperCase();
  const { workDays, paidDays, lopDays } = getPayslipAttendanceDisplay(payslip);
  const department = fmtPayslipValue(payslip.employee.departmentName).toUpperCase();
  const employmentType = fmtPayslipValue(payslip.employee.employmentType).toUpperCase();

  const bank = payslip.bankAccount
    ? displaySalaryBankDetails({
        bankName: payslip.bankAccount.bankName,
        ifscCode: payslip.bankAccount.ifscCode,
      })
    : null;

  return [
    [
      { label: "Employee Name", value: employeeName },
      { label: "Employee ID", value: payslip.employee.employeeCode },
    ],
    [
      {
        label: "Designation",
        value: fmtPayslipValue(payslip.employee.designationTitle).toUpperCase(),
      },
      { label: "Date of Joining", value: fmtPayslipDate(payslip.employee.dateOfJoining) },
    ],
    [
      { label: "PAN Number", value: fmtPayslipValue(payslip.employee.pan) },
      { label: "Payment Mode", value: (payslip.paymentMode || "BANK").toUpperCase() },
    ],
    [
      { label: "Bank Name", value: fmtPayslipValue(bank?.bankName) },
      {
        label: "Bank A/C No",
        value: fmtPayslipValue(payslip.bankAccount?.accountNumberMasked),
      },
    ],
    [
      { label: "Location", value: "REMOTE" },
      { label: "Department", value: department },
    ],
    [
      { label: "Working Days", value: Number(workDays).toFixed(2) },
      { label: "Paid Days", value: Number(paidDays).toFixed(2) },
    ],
    [
      { label: "LOP Days", value: Number(lopDays).toFixed(2) },
      { label: "Employment Type", value: employmentType },
    ],
  ];
}
