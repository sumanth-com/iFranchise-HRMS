import { addDays, addMonths, differenceInCalendarDays, format, parseISO } from "date-fns";

import type { LeaveDurationBreakdown } from "@/lib/leave/services/leave-calendar-engine";

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
    code === LOSS_OF_PAY_CODE
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
    } else if (code !== LOSS_OF_PAY_CODE) {
      issues.push({
        code: "probation_type",
        message: "During probation you can apply Casual Leave or Menstruation Leave only.",
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
    } else if (code !== LOSS_OF_PAY_CODE) {
      // Half-day leave can be applied for the present day; full-day still needs advance notice.
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

  if (input.isPaid && input.availableBalance != null) {
    if (input.duration.totalLeaveDays > input.availableBalance + 1e-9) {
      issues.push({
        code: "balance",
        message: "This request exceeds your available leave balance.",
      });
    }
  }

  return issues;
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
  if (input.duration.sandwichDays > 0) {
    messages.push(
      `${formatDays(input.duration.sandwichDays)} will be counted under Sandwich Leave Policy`,
    );
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
