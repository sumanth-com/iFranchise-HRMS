import { addDays, addMonths, differenceInCalendarDays, format, parseISO } from "date-fns";

import type { LeaveDurationBreakdown } from "@/lib/leave/services/leave-calendar-engine";
import { isOptionalHolidayCode } from "@/lib/leave/optional-holiday";
import { roundLeaveDays } from "@/lib/leave/services/leave-usage";
import type { LeaveEligibilityBand } from "@/lib/leave/leave-eligibility";
import {
  LEAVE_BALANCE_EXHAUSTED_MESSAGE,
  LEAVE_OVER_THREE_DAYS_MESSAGE,
  LEAVE_TYPE_NOT_ELIGIBLE_MESSAGE,
  SELF_SERVICE_MAX_LEAVE_DAYS,
  isLeaveTypeAllowedForBand,
} from "@/lib/leave/leave-eligibility";
import { shouldBlockInternProbationFirstMonthLeave } from "@/lib/leave/leave-entitlement";

export const PERIOD_LEAVE_CODE = "PL";
export const CASUAL_LEAVE_CODE = "CL";
export const LOSS_OF_PAY_CODE = "LOP";

export type LeaveProbationRules = {
  durationMonths: number;
  firstMonthLeaveAllowed: boolean;
  casualLeaveCap: number;
  periodLeaveCap: number;
  periodLeaveFemaleOnly: boolean;
  carryForwardAllowed: boolean;
};

export const DEFAULT_LEAVE_PROBATION_RULES: LeaveProbationRules = {
  durationMonths: 3,
  firstMonthLeaveAllowed: false,
  casualLeaveCap: 2,
  periodLeaveCap: 1,
  periodLeaveFemaleOnly: true,
  carryForwardAllowed: false,
};

export type LeaveEmployeePolicyState = {
  employeeId: string;
  joiningDate: string | null;
  employmentStatus: string;
  gender: string | null;
  usedAndPendingByType: Record<string, number>;
  employmentTypeCode?: string | null;
  isFullTime?: boolean;
  leaveEligibilityBand?: LeaveEligibilityBand;
};

export type LeavePolicyNoticeHours = {
  advanceNoticeHours: number;
  officeStart: string;
  officeEnd: string;
};

export const DEFAULT_LEAVE_NOTICE: LeavePolicyNoticeHours = {
  advanceNoticeHours: 24,
  officeStart: "10:00",
  officeEnd: "19:00",
};

function officeCalendarDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

/** Next calendar day for types that need advance notice; today for PL/LOP or half-day leave. */
export function earliestAllowedLeaveStart(
  leaveTypeCode: string,
  _notice: LeavePolicyNoticeHours = DEFAULT_LEAVE_NOTICE,
  now = new Date(),
  options?: { isHalfDay?: boolean },
): string {
  const today = officeCalendarDate(now);
  const code = leaveTypeCode.toUpperCase();
  if (
    options?.isHalfDay ||
    code === PERIOD_LEAVE_CODE ||
    code === LOSS_OF_PAY_CODE ||
    isOptionalHolidayCode(code)
  ) {
    return today;
  }
  return format(addDays(parseISO(today), 1), "yyyy-MM-dd");
}

export type LeaveProbationSnapshot = {
  onProbation: boolean;
  month: 1 | 2 | 3 | null;
  endsOn: string | null;
};

export function getProbationSnapshot(
  employee: Pick<LeaveEmployeePolicyState, "joiningDate" | "employmentStatus">,
  asOf: string,
  rules: LeaveProbationRules = DEFAULT_LEAVE_PROBATION_RULES,
): LeaveProbationSnapshot {
  if (!employee.joiningDate) {
    return {
      onProbation: employee.employmentStatus === "probation",
      month: employee.employmentStatus === "probation" ? 1 : null,
      endsOn: null,
    };
  }

  const joining = parseISO(employee.joiningDate);
  const endsOn = format(addMonths(joining, rules.durationMonths), "yyyy-MM-dd");
  const monthOneEnds = format(addMonths(joining, 1), "yyyy-MM-dd");
  const monthTwoEnds = format(addMonths(joining, 2), "yyyy-MM-dd");
  const stillInWindow = asOf < endsOn;
  const confirmed = employee.employmentStatus === "active";
  const onProbation =
    employee.employmentStatus === "probation" || (!confirmed && stillInWindow);

  if (!onProbation) {
    return { onProbation: false, month: null, endsOn };
  }

  const month: 1 | 2 | 3 = asOf < monthOneEnds ? 1 : asOf < monthTwoEnds ? 2 : 3;
  return { onProbation: true, month, endsOn };
}

function parseHm(value: string): { hours: number; minutes: number } {
  const [hours, minutes] = value.split(":").map((part) => Number.parseInt(part, 10));
  return { hours: hours || 0, minutes: minutes || 0 };
}

function zonedDateMs(date: string, time: string): number {
  const { hours, minutes } = parseHm(time);
  return Date.parse(
    `${date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+05:30`,
  );
}

export type LeavePolicyIssue = {
  code: string;
  message: string;
};

export function validateLeavePolicy(input: {
  asOf?: Date;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  halfDayPeriod?: "morning" | "afternoon" | "" | null;
  leaveTypeCode: string;
  isPaid: boolean;
  duration: LeaveDurationBreakdown;
  availableBalance: number | null;
  employee: LeaveEmployeePolicyState;
  probation?: LeaveProbationRules;
  notice?: LeavePolicyNoticeHours;
  allowHalfDay?: boolean;
  maxConsecutiveDays?: number;
  overlapping: boolean;
  skipNotice?: boolean;
  /** When true, block 0-balance paid leave and requests over 3 days (self-service). */
  enforceSelfServiceLimits?: boolean;
  selfServiceMaxDays?: number;
}): LeavePolicyIssue[] {
  const issues: LeavePolicyIssue[] = [];
  const now = input.asOf ?? new Date();
  const probationRules = input.probation ?? DEFAULT_LEAVE_PROBATION_RULES;
  const notice = input.notice ?? DEFAULT_LEAVE_NOTICE;
  const probation = getProbationSnapshot(input.employee, input.startDate, probationRules);
  const code = input.leaveTypeCode.toUpperCase();
  const isPl = code === PERIOD_LEAVE_CODE;
  const isCl = code === CASUAL_LEAVE_CODE;
  const isFemale = String(input.employee.gender ?? "").toLowerCase() === "female";
  const blockedStatus = ["terminated", "resigned", "draft", "suspended"];
  const eligibilityBand =
    input.employee.leaveEligibilityBand ??
    (input.employee.employmentStatus === "probation" ? "cl_only" : "full_time_confirmed");

  if (blockedStatus.includes(input.employee.employmentStatus)) {
    issues.push({
      code: "employee_status",
      message: "Leave cannot be applied for this employee status.",
    });
  }

  if (input.endDate < input.startDate) {
    issues.push({ code: "dates", message: "End date must be on or after the start date." });
  }

  if (input.duration.totalLeaveDays <= 0) {
    issues.push({
      code: "duration",
      message: "This date range has no countable leave days. Choose working days or a valid half day.",
    });
  }

  if (!isLeaveTypeAllowedForBand(code, eligibilityBand)) {
    issues.push({
      code: "eligibility",
      message: LEAVE_TYPE_NOT_ELIGIBLE_MESSAGE,
    });
  }

  if (
    shouldBlockInternProbationFirstMonthLeave({
      leaveEligibilityBand: eligibilityBand,
      joiningDate: input.employee.joiningDate,
      asOfDate: input.startDate,
      firstMonthLeaveAllowed: probationRules.firstMonthLeaveAllowed,
    }) &&
    code !== LOSS_OF_PAY_CODE
  ) {
    issues.push({
      code: "probation_month_1",
      message: "Leave is not permitted during your first month of employment.",
    });
  }

  if (input.enforceSelfServiceLimits) {
    const maxDays = input.selfServiceMaxDays ?? SELF_SERVICE_MAX_LEAVE_DAYS;
    const consecutiveDays =
      differenceInCalendarDays(parseISO(input.endDate), parseISO(input.startDate)) + 1;
    if (input.duration.totalLeaveDays > maxDays || consecutiveDays > maxDays) {
      issues.push({
        code: "hr_review_over_limit",
        message: LEAVE_OVER_THREE_DAYS_MESSAGE,
      });
    }
  }

  if (input.overlapping) {
    issues.push({
      code: "overlap",
      message:
        "You already have a pending or approved leave on one or more of these dates. Choose different dates, or cancel the existing request first.",
    });
  }

  if (input.isHalfDay && input.allowHalfDay === false) {
    issues.push({ code: "half_day", message: "Half-day leave is not enabled for this organization." });
  }

  if (input.isHalfDay) {
    if (input.halfDayPeriod === "morning") {
      issues.push({
        code: "half_day_morning",
        message:
          "Half-day leave is allowed only for the second half (3:00 p.m. to 7:00 p.m.). Take a full day if you need the morning off.",
      });
    } else if (input.halfDayPeriod && input.halfDayPeriod !== "afternoon") {
      issues.push({
        code: "half_day",
        message: "Select second-half leave, or apply for a full day.",
      });
    }
  }

  if (
    input.maxConsecutiveDays &&
    differenceInCalendarDays(parseISO(input.endDate), parseISO(input.startDate)) + 1 >
      input.maxConsecutiveDays
  ) {
    issues.push({
      code: "consecutive",
      message: `Leave cannot exceed ${input.maxConsecutiveDays} consecutive calendar days.`,
    });
  }

  if (probation.onProbation) {
    if (probation.month === 1 && !probationRules.firstMonthLeaveAllowed) {
      issues.push({
        code: "probation_month_1",
        message: "Leave is not permitted during the first month of probation.",
      });
    } else if (isPl) {
      if (probationRules.periodLeaveFemaleOnly && !isFemale) {
        issues.push({
          code: "pl_gender",
          message: "Menstruation Leave is available to female employees only.",
        });
      }
      const used = input.employee.usedAndPendingByType[PERIOD_LEAVE_CODE] ?? 0;
      if (used + input.duration.totalLeaveDays > probationRules.periodLeaveCap) {
        issues.push({
          code: "pl_cap",
          message: `You can take ${probationRules.periodLeaveCap} Menstruation Leave day during probation.`,
        });
      }
    } else if (isCl) {
      const used = input.employee.usedAndPendingByType[CASUAL_LEAVE_CODE] ?? 0;
      if (used + input.duration.totalLeaveDays > probationRules.casualLeaveCap) {
        issues.push({
          code: "cl_cap",
          message: `During probation you can take a total of ${probationRules.casualLeaveCap} Casual Leave days in the second and third months.`,
        });
      }
    } else if (isOptionalHolidayCode(code)) {
      issues.push({
        code: "eligibility",
        message: LEAVE_TYPE_NOT_ELIGIBLE_MESSAGE,
      });
    } else if (code !== LOSS_OF_PAY_CODE) {
      issues.push({
        code: "probation_type",
        message: "During probation you can apply Casual Leave only.",
      });
    }
  } else if (isPl && probationRules.periodLeaveFemaleOnly && !isFemale) {
    issues.push({
      code: "pl_gender",
      message: "Menstruation Leave is available to female employees only.",
    });
  }

  if (!input.skipNotice) {
    if (isPl) {
      const today = officeCalendarDate(now);
      if (input.startDate < today) {
        issues.push({
          code: "pl_past",
          message: "Menstruation Leave must be communicated to HR on the same day.",
        });
      } else if (input.startDate === today) {
        const endMs = zonedDateMs(input.startDate, notice.officeEnd);
        if (now.getTime() > endMs) {
          issues.push({
            code: "pl_same_day",
            message: "Menstruation Leave must be communicated to HR before the end of the working day.",
          });
        }
      }
    } else if (code !== LOSS_OF_PAY_CODE && !isOptionalHolidayCode(code)) {
      const earliest = earliestAllowedLeaveStart(code, notice, now, {
        isHalfDay: input.isHalfDay,
      });
      if (input.startDate < earliest) {
        issues.push({
          code: "notice",
          message: input.isHalfDay
            ? `Half-day leave can start from today (${format(parseISO(earliest), "d MMMM yyyy")}).`
            : `This leave type needs at least one day’s notice. You can start from tomorrow (${format(parseISO(earliest), "d MMMM yyyy")}).`,
        });
      }
    }
  }

  if (input.isPaid && input.availableBalance != null && !isOptionalHolidayCode(code)) {
    if (
      input.enforceSelfServiceLimits &&
      input.availableBalance <= 1e-9 &&
      input.duration.totalLeaveDays > 0 &&
      (isCl || code === "EL")
    ) {
      issues.push({
        code: "balance_exhausted",
        message: LEAVE_BALANCE_EXHAUSTED_MESSAGE,
      });
    } else if (input.duration.totalLeaveDays > input.availableBalance + 1e-9) {
      issues.push({
        code: "balance",
        message:
          "This exceeds your paid leave balance. The extra days will be applied as Loss of Pay (LOP).",
      });
    }
  }

  return issues;
}

/**
 * A balance shortfall is informational, not a rejection: the request is still
 * submitted and the days beyond the paid balance are recorded as LOP. Every other
 * issue (probation caps, notice period, overlap, gender rules) remains blocking.
 */
const NON_BLOCKING_LEAVE_ISSUE_CODES = new Set<string>([
  "balance",
  "balance_exhausted",
  "hr_review_over_limit",
]);

export function isBlockingLeaveIssue(issue: LeavePolicyIssue) {
  return !NON_BLOCKING_LEAVE_ISSUE_CODES.has(issue.code);
}

export type LeaveDaySplit = { paidDays: number; lopDays: number };

export type LeaveDayAllocationKind = "paid" | "lop" | "sandwich" | "none";

export type LeaveDayAllocation = {
  date: string;
  kind: LeaveDayAllocationKind;
  counted: number;
};

/**
 * Splits a request into the portion covered by paid balance and the remainder,
 * which becomes Loss of Pay. Unpaid leave types are entirely LOP; a paid type with
 * no balance cap (availableBalance === null) is entirely paid.
 */
export function splitLeaveDaysByBalance(input: {
  totalDays: number;
  availableBalance: number | null;
  isPaid: boolean;
}): LeaveDaySplit {
  const total = roundLeaveDays(Math.max(0, input.totalDays));

  if (!input.isPaid) return { paidDays: 0, lopDays: total };
  if (input.availableBalance == null) return { paidDays: total, lopDays: 0 };

  const paidDays = roundLeaveDays(
    Math.min(total, Math.max(0, input.availableBalance)),
  );
  return { paidDays, lopDays: roundLeaveDays(total - paidDays) };
}

/**
 * Walks counted leave days in date order and marks the first `paidDays` as paid
 * (CL/EL/etc). Sandwich days stay sandwich and do not consume the paid quota,
 * so the calendar never paints every requested day as Casual/Earned.
 */
export function allocateLeaveDaysByBalance(
  duration: LeaveDurationBreakdown,
  paidDays: number,
): LeaveDayAllocation[] {
  let remainingPaid = roundLeaveDays(Math.max(0, paidDays));
  const sorted = [...duration.days].sort((left, right) =>
    left.date.localeCompare(right.date),
  );

  return sorted.map((day) => {
    if (day.counted <= 0) {
      return { date: day.date, kind: "none" as const, counted: 0 };
    }
    if (remainingPaid > 0) {
      remainingPaid = roundLeaveDays(Math.max(0, remainingPaid - day.counted));
      return {
        date: day.date,
        kind: day.kind === "sandwich" ? ("sandwich" as const) : ("paid" as const),
        counted: day.counted,
      };
    }
    return { date: day.date, kind: "lop" as const, counted: day.counted };
  });
}

export function paidLeaveTypeDisplayName(code: string | null | undefined): string {
  const upper = String(code ?? "").toUpperCase();
  if (upper === "CL") return "Casual Leave";
  if (upper === "EL") return "Earned Leave";
  if (upper === "OH") return "Optional Holiday";
  if (upper === "PL") return "Menstruation Leave";
  if (upper === "LOP") return "LOP";
  if (upper === "SL") return "Sick Leave";
  return "Leave";
}

export function calendarMarkForAllocation(
  kind: LeaveDayAllocationKind,
  leaveTypeCode: string | null | undefined,
): string | null {
  if (kind === "none") return null;
  if (kind === "sandwich") return "Sandwich";
  if (kind === "lop") return "LOP";
  return paidLeaveTypeDisplayName(leaveTypeCode);
}

export function buildLeavePreviewMessages(input: {
  duration: LeaveDurationBreakdown;
  availableBalance: number | null;
  remainingBalance: number | null;
  leaveTypeCode: string;
  probation: LeaveProbationSnapshot;
  requiresManagerAndHr: boolean;
}): string[] {
  const messages: string[] = [];
  if (input.availableBalance != null) {
    messages.push(`${formatDays(input.availableBalance)} available`);
  }
  if (input.requiresManagerAndHr) {
    messages.push("Approval required from HR");
  }
  if (input.leaveTypeCode.toUpperCase() === PERIOD_LEAVE_CODE) {
    messages.push("PL requests must be communicated to HR on the same day");
  }
  if (input.probation.onProbation && input.probation.month === 1) {
    messages.push("Leave is not permitted in the first month of probation");
  }
  return messages;
}

function formatDays(value: number): string {
  const rounded = Number(value.toFixed(2));
  return `${rounded} leave ${rounded === 1 ? "day" : "days"}`;
}
