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

export function formatCurrency(
  value: number,
  currencyCode = "INR",
  maximumFractionDigits = 0,
): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits,
  }).format(value);
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
