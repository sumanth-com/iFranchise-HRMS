import { format } from "date-fns";

import { canDownloadPayroll, canViewPayroll } from "@/lib/payroll/constants";
import type { PayslipAvailability } from "@/types/payroll";

export const SALARY_CREDIT_DAY = 2;
export const PAYSLIP_PUBLISH_DAY = 5;
export const PAYSLIP_ENGINE_NAME = "iFranchise HRMS Payroll Engine";
export const PAYSLIP_VERSION = "2.0";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export type PayslipScheduleDates = {
  salaryCreditDate: string;
  publishedAt: string;
};

function payrollMonthParts(payrollMonth: string): { year: number; month: number } {
  const value = payrollMonth.length === 7 ? `${payrollMonth}-01` : payrollMonth;
  const date = new Date(value);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

/** Salary is always credited on the 2nd of the payroll month. */
export function computeSalaryCreditDate(payrollMonth: string): string {
  const { year, month } = payrollMonthParts(payrollMonth);
  return `${year}-${String(month).padStart(2, "0")}-${String(SALARY_CREDIT_DAY).padStart(2, "0")}`;
}

/** Employees may access payslips from the 5th at 00:00 IST. */
export function computePublishedAt(payrollMonth: string): string {
  const { year, month } = payrollMonthParts(payrollMonth);
  const istMidnight = Date.UTC(year, month - 1, PAYSLIP_PUBLISH_DAY, 0, 0, 0) - IST_OFFSET_MS;
  return new Date(istMidnight).toISOString();
}

export function computePayslipSchedule(payrollMonth: string): PayslipScheduleDates {
  return {
    salaryCreditDate: computeSalaryCreditDate(payrollMonth),
    publishedAt: computePublishedAt(payrollMonth),
  };
}

export function resolvePayslipSchedule(
  payrollMonth: string,
  stored?: Partial<PayslipScheduleDates>,
): PayslipScheduleDates {
  const computed = computePayslipSchedule(payrollMonth);
  return {
    salaryCreditDate: stored?.salaryCreditDate ?? computed.salaryCreditDate,
    publishedAt: stored?.publishedAt ?? computed.publishedAt,
  };
}

export function canAccessPayslipDuringReview(permissionCodes: string[]): boolean {
  return canViewPayroll(permissionCodes) || canDownloadPayroll(permissionCodes);
}

export function isPayslipPublishedToEmployee(
  publishedAt: string,
  now: Date = new Date(),
): boolean {
  return new Date(publishedAt).getTime() <= now.getTime();
}

export function resolvePayslipAvailability(
  publishedAt: string,
  permissionCodes: string[],
  now: Date = new Date(),
): {
  availability: PayslipAvailability;
  canEmployeeAccess: boolean;
  reviewMessage: string | null;
} {
  const hrAccess = canAccessPayslipDuringReview(permissionCodes);
  const published = isPayslipPublishedToEmployee(publishedAt, now);

  if (published || hrAccess) {
    return { availability: "available", canEmployeeAccess: published, reviewMessage: null };
  }

  const publishDate = format(new Date(publishedAt), "dd MMM yyyy");
  return {
    availability: "under_review",
    canEmployeeAccess: false,
    reviewMessage: `Payroll is currently under review by HR. Your payslip will be available on ${publishDate}.`,
  };
}

export function formatReviewBannerMessage(publishedAt: string): string {
  const publishDate = format(new Date(publishedAt), "dd MMM yyyy");
  return `Payroll is currently under review by HR. Your salary has already been credited. Your official payslip will be available after payroll verification on ${publishDate}.`;
}
