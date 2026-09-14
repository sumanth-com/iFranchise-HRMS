import { format, lastDayOfMonth, parseISO } from "date-fns";

import { displaySalaryBankDetails } from "@/lib/payroll/services/payroll-utils";
import { PAYSLIP_DESIGN } from "@/lib/payroll/services/payslip-design";
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
    return format(d, "dd MMM yyyy");
  } catch {
    return "—";
  }
}

function fmtPayslipValue(value: string | null | undefined, fallback = "—"): string {
  return value?.trim() ? value.trim() : fallback;
}

function fmtPayPeriodDays(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
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

/** Payroll month title for payslip header, e.g. AUGUST 2026. */
export function formatPayslipMonthTitle(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "MMMM yyyy").toUpperCase();
  } catch {
    return "—";
  }
}

/** Payment / credit date shown on the payslip header. */
export function formatPayslipPaymentDate(payslip: PayslipDetail): string {
  return fmtPayslipDate(payslip.salaryCreditDate || payslip.issuedAt);
}

function formatPaymentMethodLabel(paymentMode: string | null | undefined): string {
  const raw = (paymentMode || "BANK").trim();
  if (!raw) return "Bank Transfer";
  if (/^bank(_|\s)?transfer$/i.test(raw) || /^bank$/i.test(raw)) return "Bank Transfer";
  if (/cash/i.test(raw)) return "Cash";
  if (/cheque|check/i.test(raw)) return "Cheque";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Employee information grid for the formal payslip document (UI/PDF only).
 * Row 1: name / id / designation — Row 2: remaining fields.
 * Uses already-computed payslip fields — no payroll recalculation.
 */
export function getPayslipInfoRows(payslip: PayslipDetail): PayslipInfoCell[][] {
  const employeeName = `${payslip.employee.firstName} ${payslip.employee.lastName}`.trim();
  const { workDays, paidDays } = getPayslipAttendanceDisplay(payslip);

  return [
    [
      { label: "Employee Name", value: fmtPayslipValue(employeeName) },
      { label: "Employee ID", value: fmtPayslipValue(payslip.employee.employeeCode) },
      {
        label: "Designation",
        value: fmtPayslipValue(payslip.employee.designationTitle),
      },
    ],
    [
      {
        label: "Department",
        value: fmtPayslipValue(payslip.employee.departmentName),
      },
      {
        label: "Date of Joining",
        value: fmtPayslipDate(payslip.employee.dateOfJoining),
      },
      {
        label: "Pay Period Days / Paid Days",
        value: `${fmtPayPeriodDays(workDays)} / ${fmtPayPeriodDays(paidDays)}`,
      },
    ],
  ];
}

/** Payment details strip for the formal payslip document (UI/PDF only). */
export function getPayslipPaymentDetails(payslip: PayslipDetail): PayslipInfoCell[] {
  const bank = payslip.bankAccount
    ? displaySalaryBankDetails({
        bankName: payslip.bankAccount.bankName,
        ifscCode: payslip.bankAccount.ifscCode,
      })
    : null;

  return [
    {
      label: "Payment Method",
      value: formatPaymentMethodLabel(payslip.paymentMode),
    },
    {
      label: "Bank Name",
      value: fmtPayslipValue(bank?.bankName),
    },
    {
      label: "Account Number",
      value: fmtPayslipValue(payslip.bankAccount?.accountNumberMasked),
    },
  ];
}

/** Standard notes shown on the formal payslip document. */
export function getPayslipNotes(payslip: PayslipDetail): string[] {
  const contact = payslip.organization.email?.trim() || "hr@ifranchise.in";
  return [
    "This is a system generated payslip and does not require a signature.",
    `In case of any discrepancy, please contact HR at ${contact} within 7 days.`,
    "Statutory deductions are applicable as per government regulations.",
  ];
}

/**
 * Footer copy lines for the payslip document (display only).
 * Keeps company/legal values from payslip.organization; only controls line breaks.
 */
export function getPayslipFooterLines(payslip: PayslipDetail): {
  companyName: string;
  addressLines: string[];
  contactLine: string | null;
} {
  const rawName = payslip.organization.name.trim();
  const companyName =
    !rawName || /^ifranchise(\s+hrms)?$/i.test(rawName)
      ? PAYSLIP_DESIGN.legalNameFallback
      : rawName;
  const rawAddress = payslip.organization.addressLines
    .map((line) => line.trim())
    .filter(Boolean)
    .join(", ")
    .replace(/^Registered office:\s*/i, "")
    .replace(/,\s*India\.?$/i, "")
    .trim();

  let addressLines: string[] = [];
  if (rawAddress) {
    const bellandurSplit = rawAddress.match(/^(.*?Bellandur),?\s*(.*)$/i);
    const citySplit = rawAddress.match(
      /^(.*?),\s*((?:Bangalore|Bengaluru)\s+South.*)$/i,
    );
    if (bellandurSplit?.[1] && bellandurSplit[2]) {
      addressLines = [
        `Registered office: ${bellandurSplit[1].replace(/,$/, "")},`,
        bellandurSplit[2].trim(),
      ];
    } else if (citySplit?.[1] && citySplit[2]) {
      addressLines = [
        `Registered office: ${citySplit[1].replace(/,$/, "")},`,
        citySplit[2].trim(),
      ];
    } else {
      const parts = payslip.organization.addressLines.map((l) => l.trim()).filter(Boolean);
      if (parts.length >= 2) {
        addressLines = [
          `Registered office: ${parts[0].replace(/^Registered office:\s*/i, "").replace(/,$/, "")},`,
          parts.slice(1).join(", ").replace(/,\s*India\.?$/i, "").trim(),
        ];
      } else {
        addressLines = [`Registered office: ${rawAddress}`];
      }
    }
  }

  const contactBits = [
    payslip.organization.cin ? `CIN: ${payslip.organization.cin}` : null,
    payslip.organization.email?.trim() || null,
  ].filter((value): value is string => Boolean(value));

  return {
    companyName,
    addressLines,
    contactLine: contactBits.length > 0 ? contactBits.join(" | ") : null,
  };
}
