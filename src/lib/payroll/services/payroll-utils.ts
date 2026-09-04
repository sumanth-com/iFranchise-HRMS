import { format, lastDayOfMonth } from "date-fns";

import {
  buildStandardEarningsLines,
  splitMonthlyGross,
} from "@/lib/payroll/salary-structure-breakdown";
import { resolveEmployeeBankName } from "@/lib/payroll/services/ifsc-bank-names";
import type { PayrollBreakdownLine, PayrollBreakdown } from "@/types/payroll";

export function getPayrollMonthDate(month: number, year: number): string {
  return format(new Date(year, month - 1, 1), "yyyy-MM-dd");
}

export function getMonthDateRange(month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  const end = lastDayOfMonth(start);
  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
    workingDays: end.getDate(),
  };
}

export function formatPayrollMonth(month: number, year: number): string {
  return format(new Date(year, month - 1, 1), "MMMM yyyy");
}

export function formatPayrollMonthLabel(dateString: string | null | undefined): string {
  const value = dateString?.trim();
  if (!value) return "—";
  const normalized =
    value.length === 7 ? `${value}-01` : value.length >= 10 ? value.slice(0, 10) : value;
  const d = new Date(`${normalized}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "MMMM yyyy");
}

const MONTH_NAME_TO_NUMBER: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

export type ParsedPayrollMonthSearch = {
  month?: number;
  year?: number;
  payslipNumber?: string;
};

/** Parses payslip history search terms such as "May", "May 2026", or payslip numbers. */
export function parsePayrollMonthSearch(term: string): ParsedPayrollMonthSearch | null {
  const trimmed = term.trim();
  if (!trimmed) return null;

  const normalized = trimmed.toLowerCase().replace(/\s+/g, " ");

  const monthYearMatch = normalized.match(/^([a-z]+)\s+(\d{4})$/);
  if (monthYearMatch) {
    const month = MONTH_NAME_TO_NUMBER[monthYearMatch[1]];
    const year = Number.parseInt(monthYearMatch[2], 10);
    if (month && year >= 2000) {
      return { month, year };
    }
  }

  const monthOnly = MONTH_NAME_TO_NUMBER[normalized];
  if (monthOnly) {
    return { month: monthOnly };
  }

  if (/^\d{4}$/.test(normalized)) {
    return { year: Number.parseInt(normalized, 10) };
  }

  if (/^\d{1,2}$/.test(normalized)) {
    const month = Number.parseInt(normalized, 10);
    if (month >= 1 && month <= 12) {
      return { month };
    }
  }

  return { payslipNumber: trimmed };
}

export function formatCurrency(
  value: number,
  currencyCode = "INR",
  maximumFractionDigits = 0,
): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits > 0 ? maximumFractionDigits : 0,
  }).format(value);
}

export function formatPayslipCurrency(value: number, currencyCode = "INR"): string {
  return formatCurrency(value, currencyCode, 2);
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function displaySalaryBankDetails<T extends {
  bankName: string;
  ifscCode?: string | null;
  branchName?: string | null;
}>(bank: T): T {
  const ifsc = (bank.ifscCode ?? "").trim().toUpperCase();
  const resolvedName = resolveEmployeeBankName(bank.bankName, ifsc);

  if (!ifsc.startsWith("SBIN")) {
    return { ...bank, bankName: resolvedName };
  }

  const branch = (bank.branchName ?? "").trim();
  const useDhone = !branch || /madhapur|hyderabad/i.test(branch);

  return {
    ...bank,
    bankName: resolvedName === bank.bankName ? "State Bank of India" : resolvedName,
    ...(bank.branchName !== undefined ? { branchName: useDhone ? "Dhone" : bank.branchName } : {}),
  };
}

export function toEmployeeFacingEarnings(
  lines: PayrollBreakdownLine[],
): PayrollBreakdownLine[] {
  let salary = 0;
  let bonus = 0;
  let claims = 0;
  const other: PayrollBreakdownLine[] = [];

  for (const line of lines) {
    const amount = Number(line.amount) || 0;
    if (amount <= 0) continue;
    const code = line.code.toLowerCase();
    const label = line.label.toLowerCase();
    if (code.startsWith("bonus") || label.includes("bonus")) {
      bonus += amount;
      continue;
    }
    if (
      code.startsWith("reimb") ||
      code === "claims" ||
      label.includes("reimburs") ||
      label.includes("claim")
    ) {
      claims += amount;
      continue;
    }
    if (code === "overtime" || label.includes("overtime")) {
      other.push({ ...line, amount: roundCurrency(amount) });
      continue;
    }
    salary += amount;
  }

  const earnings: PayrollBreakdownLine[] = [];
  if (salary > 0) {
    earnings.push({
      code: "salary",
      label: "Salary",
      amount: roundCurrency(salary),
      type: "earning",
    });
  }
  if (bonus > 0) {
    earnings.push({
      code: "bonus",
      label: "Bonus",
      amount: roundCurrency(bonus),
      type: "earning",
    });
  }
  if (claims > 0) {
    earnings.push({
      code: "claims",
      label: "Claims",
      amount: roundCurrency(claims),
      type: "earning",
    });
  }
  earnings.push(...other);
  return earnings;
}

const STANDARD_EARNING_CODES = new Set([
  "basic",
  "hra",
  "transport",
  "special_allowance",
  "special",
]);

function isStandardEarningCode(code: string): boolean {
  return STANDARD_EARNING_CODES.has(code.toLowerCase());
}

function isExtraEarningLine(line: PayrollBreakdownLine): boolean {
  const code = lineCode(line);
  const label = (line.label ?? "").toLowerCase();
  return (
    code.startsWith("bonus") ||
    code.startsWith("reimb") ||
    code.startsWith("hr_") ||
    code === "overtime" ||
    code === "claims" ||
    label.includes("bonus") ||
    label.includes("overtime") ||
    label.includes("reimburs") ||
    label.includes("claim") ||
    label.includes("incentive")
  );
}

/** Legacy payslip rows that collapse the full structural gross into one line. */
function isLegacyLumpEarningLine(line: PayrollBreakdownLine): boolean {
  if (isStandardEarningCode(lineCode(line))) return false;
  if (isExtraEarningLine(line)) return false;

  const code = lineCode(line);
  const label = (line.label ?? "").toLowerCase();
  if (code === "salary" || code === "gross" || code === "allowances" || code === "other_allowances") {
    return true;
  }
  if (label.includes("working day") && label.includes("salary")) return true;
  if (label.includes("working day salary")) return true;
  return false;
}

function sumLineAmounts(lines: PayrollBreakdownLine[]): number {
  return roundCurrency(lines.reduce((total, line) => total + Number(line.amount || 0), 0));
}

function resolveStructuralGrossForDisplay(input: {
  earnings: PayrollBreakdownLine[];
  grossSalary: number;
}): number {
  const positive = (input.earnings ?? []).filter((line) => Number(line.amount) > 0);
  const extras = positive.filter(isExtraEarningLine);
  const extrasTotal = sumLineAmounts(extras);
  const legacyLumpTotal = sumLineAmounts(positive.filter(isLegacyLumpEarningLine));
  const standardTotal = sumLineAmounts(positive.filter((line) => isStandardEarningCode(lineCode(line))));

  if (standardTotal > 0) {
    return roundCurrency(Math.max(standardTotal, input.grossSalary - extrasTotal));
  }
  if (legacyLumpTotal > 0) {
    return roundCurrency(legacyLumpTotal);
  }
  return roundCurrency(Math.max(0, input.grossSalary - extrasTotal));
}

function deriveStandardEarningsForDisplay(input: {
  earnings: PayrollBreakdownLine[] | null | undefined;
  grossSalary: number;
}): PayrollBreakdownLine[] {
  const positive = (input.earnings ?? []).filter((line) => Number(line.amount) > 0);
  const extras = positive.filter(isExtraEarningLine).map(toPayslipLine);
  const structuralGross = resolveStructuralGrossForDisplay({
    earnings: positive,
    grossSalary: input.grossSalary,
  });

  if (structuralGross <= 0) {
    return extras;
  }

  const standardFromBreakdown = positive.filter((line) => isStandardEarningCode(lineCode(line)));
  const standardSum = sumLineAmounts(standardFromBreakdown);
  const needsDerivedSplit = standardSum + 0.01 < structuralGross;

  const base = needsDerivedSplit
    ? buildStandardEarningsLines(splitMonthlyGross(structuralGross)).map(toPayslipLine)
    : standardFromBreakdown.map(toPayslipLine);

  return orderPayslipLines([...base, ...extras], EARNING_LINE_ORDER).filter(
    (line) => line.amount > 0,
  );
}

const PAYSLIP_COMPONENT_LABELS: Record<string, string> = {
  basic: "Basic Salary",
  hra: "House Rent Allowance (HRA)",
  transport: "Leave Travel Allowance (LTA)",
  medical: "Medical Allowance",
  special_allowance: "Special Allowance",
  other_allowances: "Other Allowances",
  allowances: "Other Allowances",
  overtime: "Overtime",
  bonus: "Bonus",
  claims: "Claims",
  pf: "Provident Fund (PF)",
  esi: "Employee State Insurance (ESI)",
  pt: "Professional Tax",
  income_tax: "Tax Deducted at Source (TDS)",
  other_ded: "Other Applicable Deductions",
  lop: "Loss of Pay (LOP)",
  salary: "Salary",
  gross: "Gross Salary",
};

const REQUIRED_PAYSLIP_EARNINGS = ["basic", "hra", "transport", "special_allowance"] as const;
const REQUIRED_PAYSLIP_DEDUCTIONS = ["income_tax"] as const;
const EARNING_LINE_ORDER = [
  "basic",
  "hra",
  "transport",
  "special_allowance",
  "bonus",
  "overtime",
  "claims",
  "other_allowances",
  "salary",
  "gross",
];
const DEDUCTION_LINE_ORDER = ["pf", "esi", "pt", "income_tax", "other_ded", "lop"];

/** Professional payslip labels — preserves real component lines (does not collapse to "Salary"). */
export function normalizePayslipComponentLabel(line: PayrollBreakdownLine): string {
  const code = line.code.toLowerCase();
  if (PAYSLIP_COMPONENT_LABELS[code]) return PAYSLIP_COMPONENT_LABELS[code];
  if (code.startsWith("bonus")) return line.label?.trim() || "Bonus";
  if (code.startsWith("reimb")) return line.label?.trim() || "Reimbursement";
  const trimmed = line.label?.trim();
  if (!trimmed) return line.code;
  // Expand common leave/abbreviation leftovers if any appear in labels
  return trimmed
    .replace(/\bProvident Fund\b/i, "PF")
    .replace(/\bSpecial & Other Allowances\b/i, "Other Allowances");
}

function lineCode(line: PayrollBreakdownLine): string {
  return line.code.toLowerCase();
}

function toPayslipLine(line: PayrollBreakdownLine): PayrollBreakdownLine {
  return {
    ...line,
    label: normalizePayslipComponentLabel(line),
    amount: roundCurrency(Number(line.amount) || 0),
  };
}

function withRequiredZeroLines(
  lines: PayrollBreakdownLine[],
  requiredCodes: readonly string[],
  type: PayrollBreakdownLine["type"],
): PayrollBreakdownLine[] {
  const byCode = new Map(lines.map((line) => [lineCode(line), line]));
  const merged = [...lines];
  for (const code of requiredCodes) {
    if (byCode.has(code)) continue;
    merged.push({
      code,
      label: PAYSLIP_COMPONENT_LABELS[code] ?? code,
      amount: 0,
      type,
    });
  }
  return merged;
}

function orderPayslipLines(
  lines: PayrollBreakdownLine[],
  preferred: string[],
): PayrollBreakdownLine[] {
  const remaining = new Map(lines.map((line) => [lineCode(line), line]));
  const ordered: PayrollBreakdownLine[] = [];
  for (const code of preferred) {
    const line = remaining.get(code);
    if (!line) continue;
    ordered.push(line);
    remaining.delete(code);
  }
  for (const line of lines) {
    if (!remaining.has(lineCode(line))) continue;
    ordered.push(line);
    remaining.delete(lineCode(line));
  }
  return ordered;
}

export function toPayslipDisplayLines(
  lines: PayrollBreakdownLine[],
): PayrollBreakdownLine[] {
  return lines
    .filter((line) => Number(line.amount) > 0)
    .map((line) => toPayslipLine(line));
}

function isReimbursementEarningLine(line: PayrollBreakdownLine): boolean {
  const code = line.code.toLowerCase();
  const label = line.label.toLowerCase();
  return (
    code === "reimbursement" ||
    code.startsWith("reimb_") ||
    code === "hr_reimbursement" ||
    label.includes("reimbursement")
  );
}

/** Full monthly salary from structure or Excel — not attendance-adjusted. */
export function resolveMonthlySalary(
  breakdown: PayrollBreakdown | null | undefined,
  basicSalary = 0,
  grossSalary = 0,
): number {
  if (breakdown?.excel?.salary != null) {
    return roundCurrency(Number(breakdown.excel.salary));
  }
  if (breakdown?.attendance?.monthlyGrossSalary != null) {
    return roundCurrency(Number(breakdown.attendance.monthlyGrossSalary));
  }
  if (breakdown?.source === "excel_historical_option_1" && basicSalary > 0) {
    return roundCurrency(basicSalary);
  }
  if (basicSalary > 0) {
    return roundCurrency(basicSalary);
  }
  return roundCurrency(grossSalary);
}

/** Salary earned for the period after attendance / LOP (stored as gross_salary). */
export function resolveAttendanceEarnings(
  breakdown: PayrollBreakdown | null | undefined,
  grossSalary: number,
): number {
  if (breakdown?.excel?.workingDaySalary != null) {
    return roundCurrency(Number(breakdown.excel.workingDaySalary));
  }
  const attendanceLine = (breakdown?.earnings ?? []).find((line) => {
    const code = line.code.toLowerCase();
    return (
      code === "attendance_earnings" ||
      code === "working_day_salary" ||
      code === "salary"
    );
  });
  if (attendanceLine && Number(attendanceLine.amount) > 0) {
    return roundCurrency(Number(attendanceLine.amount));
  }
  return roundCurrency(grossSalary);
}

/** Non-salary reimbursement from breakdown / allowances (Excel import or claims). */
export function resolvePayrollReimbursement(
  breakdown: PayrollBreakdown | null | undefined,
  totalAllowances = 0,
): number {
  if (breakdown?.excel?.reimbursement != null) {
    return roundCurrency(Number(breakdown.excel.reimbursement));
  }

  let fromLines = 0;
  for (const line of breakdown?.earnings ?? []) {
    if (isReimbursementEarningLine(line)) {
      fromLines += Number(line.amount) || 0;
    }
  }
  if (fromLines > 0) return roundCurrency(fromLines);

  if (breakdown?.source === "excel_historical_option_1" && totalAllowances > 0) {
    return roundCurrency(totalAllowances);
  }

  const hrReimb = breakdown?.hrAdjustments?.reimbursements;
  if (hrReimb != null && hrReimb > 0) return roundCurrency(hrReimb);

  return 0;
}

/** Manual HR bonus from payroll item adjustments. */
export function resolveHrPayrollBonus(
  breakdown: PayrollBreakdown | null | undefined,
): number {
  return roundCurrency(Number(breakdown?.hrAdjustments?.bonus ?? 0));
}

/** Manual HR incentive from payroll item adjustments. */
export function resolveHrPayrollIncentive(
  breakdown: PayrollBreakdown | null | undefined,
): number {
  return roundCurrency(Number(breakdown?.hrAdjustments?.incentive ?? 0));
}

function hasManualHrPayrollExtras(
  breakdown: PayrollBreakdown | null | undefined,
): boolean {
  const adj = breakdown?.hrAdjustments;
  if (!adj) return false;
  return (
    (adj.bonus ?? 0) > 0 ||
    (adj.incentive ?? 0) > 0 ||
    (adj.reimbursements ?? 0) > 0
  );
}

/** Amount credited = net salary + manual bonus + incentive + reimbursement. */
export function resolveFinalPayableAmount(
  netSalary: number,
  breakdown?: PayrollBreakdown | null,
  totalAllowances = 0,
): number {
  const bonus = resolveHrPayrollBonus(breakdown);
  const incentive = resolveHrPayrollIncentive(breakdown);
  const reimbursement = resolvePayrollReimbursement(breakdown, totalAllowances);

  if (breakdown?.excel?.finalPayout != null && !hasManualHrPayrollExtras(breakdown)) {
    return roundCurrency(Number(breakdown.excel.finalPayout));
  }

  return roundCurrency(netSalary + bonus + incentive + reimbursement);
}

/** Shared Company Payroll / Payslips row amounts from a payroll item. */
export function mapPayrollDisplayAmounts(input: {
  basicSalary: number;
  grossSalary: number;
  netSalary: number;
  totalDeductions: number;
  totalAllowances: number;
  breakdown?: PayrollBreakdown | null;
}) {
  const breakdown = input.breakdown ?? null;
  const bonus = resolveHrPayrollBonus(breakdown);
  const incentive = resolveHrPayrollIncentive(breakdown);
  const reimbursement = resolvePayrollReimbursement(breakdown, input.totalAllowances);
  return {
    monthlySalary: resolveMonthlySalary(breakdown, input.basicSalary, input.grossSalary),
    attendanceEarnings: resolveAttendanceEarnings(breakdown, input.grossSalary),
    deductions: roundCurrency(input.totalDeductions),
    netSalary: roundCurrency(input.netSalary),
    bonus,
    incentive,
    reimbursement,
    finalPayable: resolveFinalPayableAmount(
      input.netSalary,
      breakdown,
      input.totalAllowances,
    ),
  };
}

export function salaryEarningsOnly(
  earnings: PayrollBreakdownLine[] | null | undefined,
): PayrollBreakdownLine[] {
  return (earnings ?? []).filter((line) => !isReimbursementEarningLine(line));
}

/**
 * Payslip earnings for display (employee portal, payslip view/PDF).
 * Uses stored breakdown when standard components are present; otherwise derives
 * the 50/25/10/15 split from gross without mutating persisted payroll data.
 */
export function getPayslipEarningsLines(input: {
  earnings: PayrollBreakdownLine[] | null | undefined;
  basicSalary: number;
  totalAllowances: number;
  grossSalary: number;
}): PayrollBreakdownLine[] {
  const salaryEarnings = salaryEarningsOnly(input.earnings);
  const positiveBreakdown = salaryEarnings.filter((line) => Number(line.amount) > 0);

  if (input.grossSalary > 0 || positiveBreakdown.length > 0) {
    return deriveStandardEarningsForDisplay({
      earnings: salaryEarnings,
      grossSalary: input.grossSalary,
    });
  }

  const fallback: PayrollBreakdownLine[] = [];
  if (input.basicSalary > 0) {
    fallback.push({
      code: "basic",
      label: "Basic Salary",
      amount: roundCurrency(input.basicSalary),
      type: "earning",
    });
  }
  if (input.totalAllowances > 0) {
    fallback.push({
      code: "allowances",
      label: "Other Allowances",
      amount: roundCurrency(input.totalAllowances),
      type: "earning",
    });
  }
  if (fallback.length === 0 && input.grossSalary > 0) {
    return deriveStandardEarningsForDisplay({
      earnings: [],
      grossSalary: input.grossSalary,
    });
  }
  return fallback.map(toPayslipLine).filter((line) => line.amount > 0);
}

export function getPayslipDeductionLines(
  lines: PayrollBreakdownLine[] | null | undefined,
): PayrollBreakdownLine[] {
  const fromBreakdown = toPayslipDisplayLines(lines ?? []);
  return orderPayslipLines(
    withRequiredZeroLines(fromBreakdown, REQUIRED_PAYSLIP_DEDUCTIONS, "deduction").map(
      toPayslipLine,
    ),
    DEDUCTION_LINE_ORDER,
  );
}

export function generatePayslipNumber(
  employeeCode: string,
  payrollMonth: string,
): string {
  const monthPart = payrollMonth.replace(/-/g, "").slice(0, 6);
  const codePart = employeeCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `PS-${monthPart}-${codePart}`;
}

/** Fallback when payroll join is unavailable — PS-202608-EMP001 → 2026-08-01 */
export function parsePayrollMonthFromPayslipNumber(
  payslipNumber: string | null | undefined,
): string | null {
  const match = payslipNumber?.match(/^PS-(\d{6})-/i);
  if (!match) return null;
  const raw = match[1];
  const year = Number.parseInt(raw.slice(0, 4), 10);
  const month = Number.parseInt(raw.slice(4, 6), 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function payrollMonthSortKey(dateString: string | null | undefined): string {
  const value = dateString?.trim();
  if (!value) return "";
  if (value.length >= 7) return value.slice(0, 7);
  return value;
}

export function comparePayrollMonthsDesc(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  return payrollMonthSortKey(b).localeCompare(payrollMonthSortKey(a));
}

export function maskAccountNumber(accountNumber: string, options?: { reveal?: boolean }): string {
  const digits = accountNumber.replace(/\D/g, "");
  if (!digits) return accountNumber;
  if (options?.reveal) return digits;
  if (digits.length <= 4) return digits;
  return `${"•".repeat(Math.min(8, digits.length - 4))}${digits.slice(-4)}`;
}
