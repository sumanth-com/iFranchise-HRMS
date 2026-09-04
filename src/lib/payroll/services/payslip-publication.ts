import { canDownloadPayroll, canViewPayroll } from "@/lib/payroll/constants";
import type { PayslipAvailability } from "@/types/payroll";

export const SALARY_CREDIT_DAY = 2;
export const PAYSLIP_PUBLISH_DAY = 5;
export const PAYSLIP_ENGINE_NAME = "iFranchise HRMS Payroll Engine";
export const PAYSLIP_VERSION = "2.0";
export const PAYROLL_BUSINESS_TIMEZONE = "Asia/Kolkata";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Previous calendar month in the payroll business timezone (Asia/Kolkata). */
export function getPreviousPayrollMonthParts(now = new Date()): {
  month: number;
  year: number;
} {
  const ist = new Date(now.toLocaleString("en-US", { timeZone: PAYROLL_BUSINESS_TIMEZONE }));
  const year = ist.getFullYear();
  const month = ist.getMonth() + 1;
  if (month === 1) return { month: 12, year: year - 1 };
  return { month: month - 1, year };
}

export type PayslipScheduleDates = {
  salaryCreditDate: string;
  publishedAt: string;
};

function clampDayOfMonth(day: number | undefined, fallback: number): number {
  if (!Number.isFinite(day) || !day) return fallback;
  return Math.min(28, Math.max(1, Math.trunc(day)));
}

function payrollMonthParts(payrollMonth: string): { year: number; month: number } {
  const value = payrollMonth.length === 7 ? `${payrollMonth}-01` : payrollMonth;
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function addCalendarMonth(
  parts: { year: number; month: number },
  extraMonths: number,
): { year: number; month: number } {
  const date = new Date(Date.UTC(parts.year, parts.month - 1 + extraMonths, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function formatPublishDate(publishedAt: string): string {
  return new Date(publishedAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

/** Salary is credited on the configured day of the month after the payroll period (default 2nd). */
export function computeSalaryCreditDate(
  payrollMonth: string,
  salaryCreditDay = SALARY_CREDIT_DAY,
): string {
  const { year, month } = addCalendarMonth(payrollMonthParts(payrollMonth), 1);
  const day = clampDayOfMonth(salaryCreditDay, SALARY_CREDIT_DAY);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Employees may access payslips from the 5th of the month after attendance and leave close. */
export function computePublishedAt(
  payrollMonth: string,
  publishDay = PAYSLIP_PUBLISH_DAY,
): string {
  const { year, month } = addCalendarMonth(payrollMonthParts(payrollMonth), 1);
  const day = clampDayOfMonth(publishDay, PAYSLIP_PUBLISH_DAY);
  const istMidnight = Date.UTC(year, month - 1, day, 0, 0, 0) - IST_OFFSET_MS;
  return new Date(istMidnight).toISOString();
}

export function computePayslipSchedule(
  payrollMonth: string,
  options?: { salaryCreditDay?: number; publishDay?: number },
): PayslipScheduleDates {
  return {
    salaryCreditDate: computeSalaryCreditDate(payrollMonth, options?.salaryCreditDay),
    publishedAt: computePublishedAt(payrollMonth, options?.publishDay),
  };
}

export function resolvePayslipSchedule(
  payrollMonth: string,
  stored?: Partial<PayslipScheduleDates>,
  options?: { salaryCreditDay?: number; publishDay?: number },
): PayslipScheduleDates {
  const storedSalaryCreditDate = stored?.salaryCreditDate;
  const storedPublishedAt = stored?.publishedAt;

  const hasValidPublishedAt =
    typeof storedPublishedAt === "string" &&
    storedPublishedAt.length > 0 &&
    !Number.isNaN(new Date(storedPublishedAt).getTime());

  const hasValidSalaryCreditDate =
    typeof storedSalaryCreditDate === "string" && storedSalaryCreditDate.length > 0;

  // If we have stored dates, do not depend on `payrollMonth` being present from joins.
  // Some rows may not have `payrolls.payroll_month` selected correctly, which would otherwise crash
  // when computing `publishedAt`.
  if (hasValidPublishedAt && hasValidSalaryCreditDate) {
    return {
      salaryCreditDate: storedSalaryCreditDate,
      publishedAt: storedPublishedAt,
    };
  }

  // If payrollMonth is missing/invalid and we can't compute, fall back to safe defaults
  // to avoid hard crashes during filter changes.
  const trimmedPayrollMonth = payrollMonth?.trim() ?? "";
  if (!trimmedPayrollMonth) {
    const today = new Date();
    const fallbackSalaryCreditDate = today.toISOString().slice(0, 10);
    return {
      salaryCreditDate: hasValidSalaryCreditDate ? storedSalaryCreditDate! : fallbackSalaryCreditDate,
      publishedAt: hasValidPublishedAt ? storedPublishedAt! : today.toISOString(),
    };
  }

  const computed = computePayslipSchedule(trimmedPayrollMonth, options);
  return {
    salaryCreditDate: hasValidSalaryCreditDate ? storedSalaryCreditDate! : computed.salaryCreditDate,
    publishedAt: hasValidPublishedAt ? storedPublishedAt! : computed.publishedAt,
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

/** Employee portal visibility — only after HR explicitly sends/publishes. */
export function isPayslipOfficiallyReleasedToEmployee(
  input: { publishedAt?: string | null; emailSentAt?: string | null },
): boolean {
  return Boolean(input.emailSentAt);
}

/** HR payslip list "Sent" badge — matches explicit HR send only. */
export function isPayslipHrSent(
  input: { emailSentAt?: string | null },
): boolean {
  return Boolean(input.emailSentAt);
}

export function resolvePayslipAvailability(
  publishedAt: string,
  permissionCodes: string[],
  now: Date = new Date(),
  options?: { employeeFacing?: boolean; emailSentAt?: string | null },
): {
  availability: PayslipAvailability;
  canEmployeeAccess: boolean;
  reviewMessage: string | null;
} {
  const released = options?.employeeFacing
    ? isPayslipOfficiallyReleasedToEmployee({
        publishedAt,
        emailSentAt: options.emailSentAt,
      })
    : isPayslipHrSent({ emailSentAt: options?.emailSentAt });
  const hrAccess =
    !options?.employeeFacing && canAccessPayslipDuringReview(permissionCodes);

  if (released || hrAccess) {
    return { availability: "available", canEmployeeAccess: released, reviewMessage: null };
  }

  const publishDate = formatPublishDate(publishedAt);
  return {
    availability: "under_review",
    canEmployeeAccess: false,
    reviewMessage: `Payslip will be available on ${publishDate}`,
  };
}

export function formatReviewBannerMessage(publishedAt: string): string {
  const publishDate = formatPublishDate(publishedAt);
  return `Payslip will be available on ${publishDate}. You can download it once it is released.`;
}
