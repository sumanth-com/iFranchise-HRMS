import { format, lastDayOfMonth } from "date-fns";

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

export function formatPayrollMonthLabel(dateString: string): string {
  return format(new Date(dateString), "MMMM yyyy");
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

export function generatePayslipNumber(
  employeeCode: string,
  payrollMonth: string,
): string {
  const monthPart = payrollMonth.replace(/-/g, "").slice(0, 6);
  const codePart = employeeCode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `PS-${monthPart}-${codePart}`;
}

export function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber;
  return `XXXX${accountNumber.slice(-4)}`;
}
