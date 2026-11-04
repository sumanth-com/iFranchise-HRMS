import type {
  EmployeePayrollTimeline,
  EmployeePayrollTimelineStage,
} from "@/types/employee-payroll";
import type { PayrollBreakdown, PayrollStatus } from "@/types/payroll";
import {
  PAYROLL_BUSINESS_TIMEZONE,
  resolveEmployeePayslipReleaseAt,
} from "@/lib/payroll/services/payslip-publication";

const TIMELINE_STATUS_ORDER: PayrollStatus[] = [
  "draft",
  "processing",
  "processed",
  "approved",
  "paid",
];

function istYmd(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PAYROLL_BUSINESS_TIMEZONE,
  }).format(now);
}

function addCalendarDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(
    next.getUTCDate(),
  ).padStart(2, "0")}`;
}

/** True after the IST calendar day has fully ended. */
export function istCalendarDayHasEnded(ymd: string, now = new Date()): boolean {
  return istYmd(now) > ymd;
}

export function istCalendarDayHasStarted(ymd: string, now = new Date()): boolean {
  return istYmd(now) >= ymd;
}

function creditDayYmd(salaryCreditDate: string): string {
  return salaryCreditDate.slice(0, 10);
}

function reviewDisplayDate(input: {
  creditYmd: string;
  releaseAt: string | null;
  now: Date;
}): string {
  const thirdYmd = addCalendarDays(input.creditYmd, 1);
  if (input.releaseAt) {
    const releaseYmd = istYmd(new Date(input.releaseAt));
    return releaseYmd <= input.creditYmd ? input.creditYmd : thirdYmd;
  }
  const today = istYmd(input.now);
  return today <= input.creditYmd ? input.creditYmd : thirdYmd;
}

export function buildEmployeePaymentTimeline(input: {
  payroll: {
    payroll_status: PayrollStatus;
    created_at: string | null;
    processed_at: string | null;
    approved_at: string | null;
  };
  emailSentAt: string | null;
  publishedAt: string;
  salaryCreditDate: string;
  payrollLifecycle?: PayrollBreakdown["payrollLifecycle"];
  now?: Date;
}): EmployeePayrollTimeline {
  const now = input.now ?? new Date();
  const status = input.payroll.payroll_status;
  const rank = TIMELINE_STATUS_ORDER.indexOf(status);
  const releaseAt = resolveEmployeePayslipReleaseAt({
    emailSentAt: input.emailSentAt,
    payrollLifecycle: input.payrollLifecycle,
  });
  const payslipReleased = Boolean(releaseAt);
  const creditYmd = creditDayYmd(input.salaryCreditDate);
  const generatedYmd = creditYmd;
  const lifecycleStatus = input.payrollLifecycle?.itemStatus;
  const hrReviewed =
    lifecycleStatus === "reviewed" ||
    lifecycleStatus === "sent" ||
    lifecycleStatus === "locked" ||
    Boolean(input.payroll.approved_at) ||
    rank >= TIMELINE_STATUS_ORDER.indexOf("approved") ||
    payslipReleased;

  const creditedDone =
    status === "paid" || istCalendarDayHasEnded(creditYmd, now);
  const generatedDone = istCalendarDayHasStarted(generatedYmd, now);

  const reviewedAt = input.payroll.approved_at
    ? input.payroll.approved_at
    : hrReviewed
      ? reviewDisplayDate({ creditYmd, releaseAt, now })
      : null;

  const stages: EmployeePayrollTimelineStage[] = [
    {
      key: "credited",
      label: "Salary Credited",
      description: "Salary payment marked as credited.",
      at: creditedDone ? creditYmd : null,
      done: creditedDone,
      precision: "date",
    },
    {
      key: "generated",
      label: "Payroll Generated",
      description: "Payroll calculation created by HR.",
      at: generatedYmd,
      done: generatedDone,
      precision: "date",
    },
    {
      key: "hr_approved",
      label: "Payroll Reviewed",
      description: "Payroll reviewed and approved.",
      at: reviewedAt,
      done: hrReviewed,
      precision: input.payroll.approved_at ? "datetime" : "date",
    },
    {
      key: "released",
      label: "Payslip Sent",
      description: "Payslip successfully published/sent to the employee.",
      at: releaseAt ?? (payslipReleased ? input.publishedAt : null),
      done: payslipReleased,
      precision: "datetime",
    },
  ];

  return { status, stages };
}
