import { format, lastDayOfMonth } from "date-fns";

import type { PayrollBreakdownLine } from "@/types/payroll";

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
  const d = new Date(value);
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
  if (!ifsc.startsWith("SBIN")) return bank;

  const branch = (bank.branchName ?? "").trim();
  const useDhone = !branch || /madhapur|hyderabad/i.test(branch);

  return {
    ...bank,
    bankName: "SBI Bank",
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

const PAYSLIP_COMPONENT_LABELS: Record<string, string> = {
  basic: "Basic Salary",
  hra: "HRA",
  transport: "TA",
  medical: "Medical Allowance",
  special_allowance: "TDA",
  other_allowances: "Other Allowances",
  allowances: "Other Allowances",
  overtime: "Overtime",
  bonus: "Bonus",
  claims: "Claims",
  pf: "PF",
  esi: "ESI",
  pt: "Professional Tax",
  income_tax: "Tax Deduction (TDS)",
  other_ded: "Other Deductions",
  salary: "Salary",
  gross: "Gross Salary",
};

const REQUIRED_PAYSLIP_EARNINGS = ["transport", "special_allowance"] as const;
const REQUIRED_PAYSLIP_DEDUCTIONS = ["income_tax"] as const;
const EARNING_LINE_ORDER = [
  "basic",
  "hra",
  "transport",
  "special_allowance",
  "medical",
  "other_allowances",
  "salary",
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

/**
 * Payslip earnings from stored payroll breakdown only.
 * Falls back to payroll item totals (never invents HRA/Basic ratios).
 */
export function getPayslipEarningsLines(input: {
  earnings: PayrollBreakdownLine[] | null | undefined;
  basicSalary: number;
  totalAllowances: number;
  grossSalary: number;
}): PayrollBreakdownLine[] {
  const fromBreakdown = toPayslipDisplayLines(input.earnings ?? []);
  if (fromBreakdown.length > 0) {
    return orderPayslipLines(
      withRequiredZeroLines(fromBreakdown, REQUIRED_PAYSLIP_EARNINGS, "earning").map(toPayslipLine),
      EARNING_LINE_ORDER,
    );
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
    fallback.push({
      code: "gross",
      label: "Gross Salary",
      amount: roundCurrency(input.grossSalary),
      type: "earning",
    });
  }
  return orderPayslipLines(
    withRequiredZeroLines(fallback, REQUIRED_PAYSLIP_EARNINGS, "earning").map(toPayslipLine),
    EARNING_LINE_ORDER,
  );
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

export function maskAccountNumber(accountNumber: string): string {
  return accountNumber;
}
